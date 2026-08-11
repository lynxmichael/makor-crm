import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState, type DragEvent } from "react";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { Can } from "@/components/shared/Can";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { cn, formatCFA } from "@/lib/utils";
import { errorMessage } from "@/services/api";
import {
  BOARD_QUERY_KEY,
  CANONICAL_STAGE_LABELS,
  createDeal,
  createStage,
  dealAccountName,
  dealAmount,
  fetchBoard,
  moveDealStage,
  removeStage,
  reorderStages,
  updateStage,
  type BoardColumn,
  type BoardDeal,
  type BoardStage,
  type CreateDealInput,
  type StagePayload,
} from "@/services/pipeline";
import { DealDetailModal } from "@/features/opportunities/DealDetailModal";
import { NewDealModal } from "@/features/opportunities/NewDealModal";
import { RemoveStageModal } from "@/features/opportunities/RemoveStageModal";
import { StageFormModal } from "@/features/opportunities/StageFormModal";
import {
  probabilityLevel,
  probabilityTone,
} from "@/features/opportunities/probability";

/**
 * Déplace une carte d'une colonne à l'autre dans le tableau déjà en cache,
 * pour que le glisser-déposer réponde sans attendre l'aller-retour réseau.
 *
 * Les totaux sont recalculés à partir des cartes restantes : les laisser tels
 * quels afficherait pendant une seconde une somme qui ne correspond plus aux
 * cartes visibles.
 */
function moveDealInBoard(
  columns: BoardColumn[],
  dealId: string,
  targetStageId: string,
): BoardColumn[] {
  const deal = columns.flatMap((column) => column.deals).find((d) => d.id === dealId);
  if (!deal) return columns;

  return columns.map((column) => {
    const isSource = column.deals.some((d) => d.id === dealId);
    const isTarget = column.stage.id === targetStageId;

    if (!isSource && !isTarget) return column;

    const withoutDeal = column.deals.filter((d) => d.id !== dealId);
    const deals = isTarget
      ? [{ ...deal, stageId: targetStageId }, ...withoutDeal]
      : withoutDeal;

    return {
      ...column,
      deals,
      totalValue: deals.reduce((sum, d) => sum + dealAmount(d), 0),
    };
  });
}

/**
 * Échange une colonne avec sa voisine, dans le tableau déjà en cache.
 *
 * L'ordre affiché est celui du tableau : il n'y a pas de tri à refaire, et
 * `stage.order` n'est volontairement pas retouché ici — c'est le backend qui
 * réécrit la série entière, et le rafraîchissement rendra les rangs réels.
 */
function swapColumns(
  columns: BoardColumn[],
  index: number,
  direction: -1 | 1,
): BoardColumn[] {
  const target = index + direction;
  if (target < 0 || target >= columns.length) return columns;

  const next = [...columns];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Retrouve l'opportunité ouverte et la colonne qui la porte.
 *
 * Volontairement dérivée du tableau à chaque rendu plutôt que conservée dans
 * un état : une carte déplacée pendant que sa fiche est ouverte doit y montrer
 * sa nouvelle étape, pas celle qu'elle avait à l'ouverture.
 */
function findDeal(columns: BoardColumn[] | undefined, dealId: string | null) {
  if (!columns || !dealId) return null;

  for (const column of columns) {
    const deal = column.deals.find((d) => d.id === dealId);
    if (deal) return { deal, stage: column.stage };
  }

  return null;
}

export function PipelinePage() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const { allowed: canWrite, reason: denial } = usePermission("pipeline", "ecriture");

  /**
   * L'administration du pipeline est réservée au Super Admin — c'est le
   * `@Roles('SUPER_ADMIN')` que portent `POST`, `PATCH` et `DELETE` de
   * `pipeline-stages`. Le contrôle ici n'est qu'une commodité d'interface.
   */
  const isAdmin = role === "SUPER_ADMIN";

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  /** Mode administration : les colonnes se renomment, se déplacent, se retirent. */
  const [adminMode, setAdminMode] = useState(false);

  /** `null` avec la modale ouverte : création d'une colonne. */
  const [stageForm, setStageForm] = useState<{ open: boolean; stage: BoardStage | null }>(
    { open: false, stage: null },
  );
  const [removingStageId, setRemovingStageId] = useState<string | null>(null);

  /**
   * D5 — le refus d'une transition doit être visible, avec sa raison. Le
   * backend la formule déjà en français ; on l'affiche telle quelle plutôt que
   * de la remplacer par un message générique.
   *
   * Les refus de l'administration passent par le même bandeau : « cette étape
   * est la seule sortie gagnante du pipeline » mérite exactement le même
   * traitement qu'un prérequis documentaire manquant.
   */
  const [refusal, setRefusal] = useState<string | null>(null);

  /** Compte rendu d'une opération d'administration réussie. */
  const [notice, setNotice] = useState<string | null>(null);

  const board = useQuery({ queryKey: BOARD_QUERY_KEY, queryFn: fetchBoard });

  const move = useMutation({
    mutationFn: moveDealStage,

    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      const previous = queryClient.getQueryData<BoardColumn[]>(BOARD_QUERY_KEY);

      queryClient.setQueryData<BoardColumn[]>(BOARD_QUERY_KEY, (columns) =>
        columns ? moveDealInBoard(columns, dealId, stageId) : columns,
      );

      setRefusal(null);
      return { previous };
    },

    onError: (error, _variables, context) => {
      // La carte revient à sa colonne : un refus qui laisserait la carte
      // déplacée ferait croire que le déplacement a réussi.
      if (context?.previous) {
        queryClient.setQueryData(BOARD_QUERY_KEY, context.previous);
      }
      setRefusal(errorMessage(error, "Ce déplacement a été refusé."));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
  });

  const create = useMutation({
    mutationFn: (input: Omit<CreateDealInput, "assignedToId">) => {
      if (!user) throw new Error("Session expirée.");
      return createDeal({ ...input, assignedToId: user.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
  });

  /**
   * Réordonnancement d'une colonne.
   *
   * L'appel porte la série complète des étapes actives, dans le nouvel ordre :
   * le backend refuse toute liste partielle, où il voit — à raison — un écran
   * désynchronisé.
   */
  const reorder = useMutation({
    mutationFn: reorderStages,

    onMutate: async (stageIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      const previous = queryClient.getQueryData<BoardColumn[]>(BOARD_QUERY_KEY);

      queryClient.setQueryData<BoardColumn[]>(BOARD_QUERY_KEY, (columns) =>
        columns
          ? stageIds
              .map((id) => columns.find((column) => column.stage.id === id))
              .filter((column): column is BoardColumn => Boolean(column))
          : columns,
      );

      setRefusal(null);
      return { previous };
    },

    onError: (error, _variables, context) => {
      // Les colonnes reprennent leur ordre : les laisser déplacées après un
      // refus ferait croire que l'ordre est enregistré.
      if (context?.previous) {
        queryClient.setQueryData(BOARD_QUERY_KEY, context.previous);
      }
      setRefusal(errorMessage(error, "Le réordonnancement a été refusé."));
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
  });

  const saveStage = useMutation({
    mutationFn: ({ stage, payload }: { stage: BoardStage | null; payload: StagePayload }) =>
      stage ? updateStage(stage.id, payload) : createStage(payload),

    onSuccess: (_data, { stage, payload }) => {
      setRefusal(null);
      setNotice(
        stage
          ? `Étape « ${payload.name} » enregistrée.`
          : `Étape « ${payload.name} » ajoutée au pipeline.`,
      );
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: ({
      stageId,
      destinationStageId,
    }: {
      stageId: string;
      destinationStageId?: string;
    }) => removeStage(stageId, destinationStageId),

    onSuccess: (result) => {
      setRefusal(null);
      setNotice(
        `Étape « ${result.name} » ${result.archived ? "archivée" : "supprimée"}` +
          (result.movedDeals > 0
            ? ` — ${result.movedDeals} opportunité${result.movedDeals > 1 ? "s" : ""} déplacée${result.movedDeals > 1 ? "s" : ""}.`
            : "."),
      );
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
  });

  const columns = board.data;

  const selected = findDeal(columns, selectedDealId);
  const removing = columns?.find((column) => column.stage.id === removingStageId);

  function requestMove(dealId: string, currentStageId: string, targetStageId: string) {
    if (!canWrite || currentStageId === targetStageId) return;
    move.mutate({ dealId, stageId: targetStageId });
  }

  /** Déplace la colonne d'un rang, et envoie la série complète au backend. */
  function requestColumnMove(index: number, direction: -1 | 1) {
    if (!columns) return;

    const next = swapColumns(columns, index, direction);
    if (next === columns) return;

    reorder.mutate(next.map((column) => column.stage.id));
  }

  function handleDrop(targetStageId: string) {
    const deal = columns?.flatMap((c) => c.deals).find((d) => d.id === draggingId);
    if (deal) {
      requestMove(deal.id, deal.stageId, targetStageId);
    }
    setDraggingId(null);
    setDragOverStageId(null);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, dealId: string) {
    setDraggingId(dealId);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">
            Pipeline commercial
          </h1>
          <p className="mt-1 text-sm text-muted">
            {columns ? <PipelineSummary columns={columns} /> : "Chargement…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/*
            « ⇅ Réorganiser les étapes » de la maquette (l. 597). Le bouton
            n'apparaît qu'au Super Admin : pour les autres rôles, l'action
            n'existe pas — l'API la leur refuserait de toute façon.
          */}
          {isAdmin && (
            <Button
              variant={adminMode ? "primary" : "secondary"}
              aria-pressed={adminMode}
              onClick={() => {
                setAdminMode((current) => !current);
                setNotice(null);
              }}
            >
              {adminMode ? (
                <Check className="h-4 w-4" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              {adminMode ? "Terminer" : "Réorganiser les étapes"}
            </Button>
          )}

          <Can domain="pipeline">
            <Button onClick={() => setCreateOpen(true)} disabled={!columns?.length}>
              <Plus className="h-4 w-4" />
              Nouvelle opportunité
            </Button>
          </Can>
        </div>
      </div>

      {adminMode && (
        <p className="text-xs text-muted">
          Mode administration : les flèches déplacent une colonne, le crayon la
          renomme, la corbeille la retire. Le rattachement au cahier des charges
          (CDC §4.6) reste ce sur quoi le reporting agrège.
        </p>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-bg px-4 py-3"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="flex-1 text-sm text-text">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Masquer le message"
            className="rounded-full p-1 text-muted transition-colors hover:bg-border/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {refusal && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="flex-1 text-sm text-danger">{refusal}</p>
          <button
            type="button"
            onClick={() => setRefusal(null)}
            aria-label="Masquer le refus"
            className="rounded-full p-1 text-danger transition-colors hover:bg-danger/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!canWrite && (
        <p className="text-xs text-muted">{denial} Le pipeline est en lecture seule.</p>
      )}

      <AsyncBoundary
        isLoading={board.isPending}
        error={board.error}
        data={columns}
        onRetry={() => void board.refetch()}
      >
        {(data) =>
          data.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-semibold text-text">
                Aucune étape n'est configurée.
              </p>
              <p className="max-w-md text-sm text-muted">
                Tant qu'aucune colonne n'existe, aucune opportunité ne peut être
                créée.
                {!isAdmin && " La configuration revient au Super Admin."}
              </p>
              {isAdmin && (
                <Button
                  className="mt-2"
                  onClick={() => setStageForm({ open: true, stage: null })}
                >
                  <Plus className="h-4 w-4" />
                  Créer la première étape
                </Button>
              )}
            </div>
          ) : (
            <div className="scrollbar-thin flex flex-1 gap-4 overflow-x-auto pb-2">
              {data.map((column, index) => {
                const previous = data[index - 1]?.stage;
                const next = data[index + 1]?.stage;
                const isOver = dragOverStageId === column.stage.id;

                return (
                  <section
                    key={column.stage.id}
                    aria-label={`Étape ${column.stage.name}`}
                    onDragOver={(event) => {
                      if (!canWrite) return;
                      event.preventDefault();
                      setDragOverStageId(column.stage.id);
                    }}
                    onDragLeave={() =>
                      setDragOverStageId((current) =>
                        current === column.stage.id ? null : current,
                      )
                    }
                    onDrop={() => handleDrop(column.stage.id)}
                    className={cn(
                      "flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-bg/60 transition-colors",
                      isOver && "border-primary bg-primary-soft",
                    )}
                  >
                    <header className="border-b border-border px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {/*
                            La couleur de l'étape est une donnée, pas un choix
                            de style : elle est réglée par l'administrateur et
                            n'a donc pas de jeton correspondant.
                          */}
                          {column.stage.color && (
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: column.stage.color }}
                            />
                          )}
                          <p className="truncate text-sm font-semibold text-text">
                            {column.stage.name}
                          </p>
                          {column.stage.requiresSignedOrder && (
                            <Lock
                              className="h-3.5 w-3.5 shrink-0 text-warning"
                              aria-label="Exige un bon de commande signé"
                            />
                          )}
                        </div>
                        <span className="rounded-full bg-border/60 px-2 py-0.5 font-mono-tabular text-xs text-muted">
                          {column.deals.length}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono-tabular text-[11px] text-muted">
                          {formatCFA(column.totalValue)}
                        </span>
                        {column.stage.name !==
                          CANONICAL_STAGE_LABELS[column.stage.canonicalStage] && (
                          <span className="truncate text-[11px] text-muted/80">
                            {CANONICAL_STAGE_LABELS[column.stage.canonicalStage]}
                          </span>
                        )}
                      </div>

                      {adminMode && (
                        <StageControls
                          stage={column.stage}
                          isFirst={index === 0}
                          isLast={index === data.length - 1}
                          busy={reorder.isPending}
                          onMoveLeft={() => requestColumnMove(index, -1)}
                          onMoveRight={() => requestColumnMove(index, 1)}
                          onEdit={() =>
                            setStageForm({ open: true, stage: column.stage })
                          }
                          onRemove={() => setRemovingStageId(column.stage.id)}
                        />
                      )}
                    </header>

                    <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-2.5">
                      {column.deals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          canWrite={canWrite}
                          isDragging={draggingId === deal.id}
                          previousStage={previous}
                          nextStage={next}
                          onOpen={() => setSelectedDealId(deal.id)}
                          onDragStart={(event) => handleDragStart(event, deal.id)}
                          onMove={(targetStageId) =>
                            requestMove(deal.id, deal.stageId, targetStageId)
                          }
                        />
                      ))}

                      {column.deals.length === 0 && (
                        <p className="px-1 py-6 text-center text-xs text-muted/70">
                          Aucune opportunité à cette étape
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}

              {/*
                « + Ajouter une étape » de la maquette (l. 645), qui la donne
                comme personnalisable par le Super Admin.
              */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setStageForm({ open: true, stage: null })}
                  className="flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="h-5 w-5" />
                  Ajouter une étape
                </button>
              )}
            </div>
          )
        }
      </AsyncBoundary>

      <NewDealModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stages={(columns ?? []).map((column) => column.stage)}
        onCreate={(input) => create.mutateAsync(input)}
      />

      <DealDetailModal
        deal={selected?.deal ?? null}
        stage={selected?.stage ?? null}
        onClose={() => setSelectedDealId(null)}
      />

      <StageFormModal
        open={stageForm.open}
        stage={stageForm.stage}
        onClose={() => setStageForm({ open: false, stage: null })}
        onSubmit={(payload) =>
          saveStage.mutateAsync({ stage: stageForm.stage, payload })
        }
      />

      <RemoveStageModal
        open={Boolean(removing)}
        stage={removing?.stage ?? null}
        dealCount={removing?.deals.length ?? 0}
        destinations={(columns ?? [])
          .filter((column) => column.stage.id !== removingStageId)
          .map((column) => column.stage)}
        onClose={() => setRemovingStageId(null)}
        onConfirm={(destinationStageId) => {
          if (!removingStageId) throw new Error("Aucune étape sélectionnée.");
          return remove.mutateAsync({
            stageId: removingStageId,
            destinationStageId,
          });
        }}
      />
    </div>
  );
}

interface StageControlsProps {
  stage: BoardStage;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

/**
 * Contrôles d'administration d'une colonne (D24).
 *
 * Le déplacement se fait aux flèches et non au glisser-déposer : les cartes
 * occupent déjà ce geste, et une alternative clavier est de toute façon exigée
 * par `DESIGN.md`. Deux boutons la donnent d'emblée, sans doubler la mécanique.
 */
function StageControls({
  stage,
  isFirst,
  isLast,
  busy,
  onMoveLeft,
  onMoveRight,
  onEdit,
  onRemove,
}: StageControlsProps) {
  return (
    <div className="mt-2 flex items-center justify-between gap-1 border-t border-border pt-2">
      <div className="flex items-center gap-1">
        <StageControl
          label={`Déplacer l'étape « ${stage.name} » vers la gauche`}
          icon={ChevronLeft}
          disabled={isFirst || busy}
          onClick={onMoveLeft}
        />
        <StageControl
          label={`Déplacer l'étape « ${stage.name} » vers la droite`}
          icon={ChevronRight}
          disabled={isLast || busy}
          onClick={onMoveRight}
        />
      </div>

      <div className="flex items-center gap-1">
        <StageControl
          label={`Modifier l'étape « ${stage.name} »`}
          icon={Pencil}
          onClick={onEdit}
        />
        <StageControl
          label={`Retirer l'étape « ${stage.name} » du pipeline`}
          icon={Trash2}
          tone="danger"
          onClick={onRemove}
        />
      </div>
    </div>
  );
}

function StageControl({
  label,
  icon: Icon,
  tone = "neutral",
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ChevronLeft;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-lg border border-border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "text-danger hover:border-danger hover:bg-danger-bg"
          : "text-muted hover:border-primary hover:text-primary",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function PipelineSummary({ columns }: { columns: BoardColumn[] }) {
  const open = columns.filter(
    (column) => !column.stage.isClosedWon && !column.stage.isClosedLost,
  );

  const count = open.reduce((sum, column) => sum + column.deals.length, 0);
  const value = open.reduce((sum, column) => sum + column.totalValue, 0);

  return (
    <>
      {count} opportunité{count > 1 ? "s" : ""} en cours · {formatCFA(value)}
    </>
  );
}

interface DealCardProps {
  deal: BoardDeal;
  canWrite: boolean;
  isDragging: boolean;
  previousStage?: { id: string; name: string };
  nextStage?: { id: string; name: string };
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onMove: (targetStageId: string) => void;
}

function DealCard({
  deal,
  canWrite,
  isDragging,
  previousStage,
  nextStage,
  onOpen,
  onDragStart,
  onMove,
}: DealCardProps) {
  const account = dealAccountName(deal);

  return (
    <Card
      draggable={canWrite}
      onDragStart={onDragStart}
      className={cn(
        "group space-y-2 p-3",
        canWrite && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <p className="text-sm font-medium leading-snug text-text">{deal.title}</p>
        {account && <p className="mt-0.5 truncate text-xs text-muted">{account}</p>}
      </button>

      <p className="font-mono-tabular text-sm font-semibold text-text">
        {formatCFA(dealAmount(deal))}
      </p>

      <div className="flex items-center justify-between gap-2">
        <SignalMeter
          level={probabilityLevel(deal.probability)}
          tone={probabilityTone(deal.probability)}
          label={`${deal.probability} %`}
        />
        <Badge tone="neutral" className="max-w-[7.5rem] truncate">
          {deal.assignedTo.firstName}
        </Badge>
      </div>

      {/*
        Alternative clavier au glisser-déposer, exigée par DESIGN.md. Les deux
        boutons restent dans le flux — masqués uniquement à l'œil — pour que la
        tabulation les atteigne et que `group-focus-within` les révèle.
      */}
      {canWrite && (previousStage || nextStage) && (
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <StageArrow
            direction="previous"
            stage={previousStage}
            dealTitle={deal.title}
            onMove={onMove}
          />
          <StageArrow
            direction="next"
            stage={nextStage}
            dealTitle={deal.title}
            onMove={onMove}
          />
        </div>
      )}
    </Card>
  );
}

function StageArrow({
  direction,
  stage,
  dealTitle,
  onMove,
}: {
  direction: "previous" | "next";
  stage?: { id: string; name: string };
  dealTitle: string;
  onMove: (targetStageId: string) => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const wording = direction === "previous" ? "précédente" : "suivante";

  if (!stage) return null;

  return (
    <button
      type="button"
      onClick={() => onMove(stage.id)}
      aria-label={`Déplacer « ${dealTitle} » vers l'étape ${wording} : ${stage.name}`}
      title={`Vers ${stage.name}`}
      className="rounded-full border border-border p-1 text-muted transition-colors hover:border-primary hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
