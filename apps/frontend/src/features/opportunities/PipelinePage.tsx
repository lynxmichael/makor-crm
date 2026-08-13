import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, GripVertical, Loader2, Plus, Settings2, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { DealQualificationModal } from "./DealQualificationModal";
import { PipelineStagesModal } from "./PipelineStagesModal";
import { DealFormModal } from "./DealFormModal";
import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { useAuthStore } from "@/store/auth.store";
import { formatMoney, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown>;

interface BoardColumn {
  stage: { id: string; name: string; order: number; color?: string | null };
  deals: Row[];
  totalValue: number;
}

/**
 * Pipeline commercial (CDC §4.6).
 *
 * Le backend renvoie le tableau déjà groupé par étape via `GET /deals/board`,
 * avec le cumul par colonne : rien à regrouper côté interface.
 *
 * Le glisser-déposer utilise l'API HTML native plutôt qu'une bibliothèque.
 * Le besoin ici se limite à déplacer une carte d'une colonne à l'autre —
 * pas de réordonnancement fin, pas de listes imbriquées — et cela évite
 * d'ajouter une dépendance pour un seul écran.
 */
export function PipelinePage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [dragging, setDragging] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [qualifying, setQualifying] = useState<Row | null>(null);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const isSuperAdmin = useAuthStore((s) => s.user?.role?.name === "SUPER_ADMIN");

  const query = useQuery({
    queryKey: [...QK.deals, "board"],
    queryFn: () => http.get<BoardColumn[]>("/deals/board"),
  });

  const moveStage = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      http.patch(`/deals/${dealId}/move-stage`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.deals });
      // Le tableau de bord affiche conversion et cycle de vente : les deux
      // bougent dès qu'une affaire change d'étape.
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function handleDrop(stageId: string) {
    setHoveredStage(null);

    if (!dragging) return;

    // Déposer une carte dans sa propre colonne ne doit pas déclencher
    // d'écriture : c'est un geste courant quand on hésite.
    const origin = columns.find((column) =>
      column.deals.some((deal) => String(deal.id) === dragging),
    );

    setDragging(null);

    if (origin?.stage.id === stageId) return;

    moveStage.mutate({ dealId: dragging, stageId });
  }

  const columns = query.data ?? [];
  const totalPipeline = columns.reduce((sum, column) => sum + Number(column.totalValue ?? 0), 0);
  const totalDeals = columns.reduce((sum, column) => sum + column.deals.length, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Pipeline</h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending
              ? "Chargement du pipeline…"
              : `${totalDeals} opportunité${totalDeals > 1 ? "s" : ""} en cours`}
          </p>
        </div>

        <Button onClick={() => setDealFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle opportunité
        </Button>

        {isSuperAdmin && (
          <Button variant="secondary" onClick={() => setStagesOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Étapes du pipeline
          </Button>
        )}

        {!query.isPending && totalPipeline > 0 && (
          <div className="rounded-xl border border-line bg-surface px-4 py-2.5">
            <p className="text-xs text-slate">Valeur du pipeline</p>
            <p className="font-display text-xl font-semibold text-ink">
              {formatMoney(totalPipeline)}
            </p>
          </div>
        )}
      </header>

      {query.isPending ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : columns.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucune étape de pipeline"
          detail="Le Super administrateur doit d'abord définir les étapes du pipeline avec le bouton « Étapes du pipeline »."
        />
      ) : (
        <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-3">
          {columns.map((column) => {
            const isTarget = hoveredStage === column.stage.id;

            return (
              <section
                key={column.stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoveredStage(column.stage.id);
                }}
                onDragLeave={() => setHoveredStage(null)}
                onDrop={() => handleDrop(column.stage.id)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-paper/40 transition-colors",
                  isTarget ? "border-wire bg-wire/5" : "border-line",
                )}
              >
                <header className="border-b border-line px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: column.stage.color ?? "var(--color-wire)" }}
                      />
                      <h2 className="font-display text-sm font-semibold text-ink">
                        {column.stage.name}
                      </h2>
                    </span>
                    <Badge tone="neutral">{column.deals.length}</Badge>
                  </div>

                  <p className="mt-1 font-mono-tabular text-xs text-slate">
                    {formatMoney(column.totalValue)}
                  </p>
                </header>

                <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
                  {column.deals.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate">
                      {isTarget ? "Déposez ici" : "Aucune opportunité"}
                    </p>
                  ) : (
                    column.deals.map((deal) => {
                      const customer = deal.customer as Row | undefined;
                      const lead = deal.lead as Row | undefined;
                      const assignee = deal.assignedTo as Row | undefined;
                      const dealId = String(deal.id);
                      const isDragged = dragging === dealId;

                      return (
                        <motion.article
                          key={dealId}
                          layout={!reduced}
                          draggable
                          onDragStart={() => setDragging(dealId)}
                          onDragEnd={() => {
                            setDragging(null);
                            setHoveredStage(null);
                          }}
                          className={cn(
                            "group cursor-grab rounded-lg border border-line bg-surface p-3 shadow-e1 transition-shadow active:cursor-grabbing",
                            isDragged ? "opacity-40" : "hover:shadow-e2",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-line transition-colors group-hover:text-slate" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">
                                {String(deal.title ?? "")}
                              </p>
                              <p className="truncate text-xs text-slate">
                                {String(
                                  customer?.companyName ??
                                    (lead
                                      ? `${String(lead.firstName ?? "")} ${String(lead.lastName ?? "")}`.trim()
                                      : "Sans client"),
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className="font-mono-tabular text-sm text-ink">
                              {formatMoney(deal.amount as string)}
                            </span>

                            <span className="flex items-center gap-1.5">
                              {Number(deal.probability ?? 0) > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-slate">
                                  <TrendingUp className="h-3 w-3" />
                                  {String(deal.probability)} %
                                </span>
                              )}

                              {assignee && (
                                <span
                                  title={`${String(assignee.firstName ?? "")} ${String(assignee.lastName ?? "")}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-wire/10 text-[10px] font-semibold text-wire"
                                >
                                  {initials(
                                    String(assignee.firstName ?? ""),
                                    String(assignee.lastName ?? ""),
                                  )}
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Bouton explicite plutôt qu'un clic sur la carte :
                              sur un élément `draggable`, le navigateur
                              interprète l'appui comme le début d'un glisser et
                              n'émet pas de clic. */}
                          {/* Le nombre de réponses déjà saisies évite d'ouvrir
                              la grille pour découvrir qu'elle est vide. */}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => setQualifying(deal)}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            {(() => {
                              const answers = (deal.qualification ?? {}) as Record<string, string>;
                              const count = Object.values(answers).filter((v) => v?.trim()).length;
                              return count > 0
                                ? `Qualification · ${count} réponse${count > 1 ? "s" : ""}`
                                : "Qualifier";
                            })()}
                          </Button>
                        </motion.article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <DealQualificationModal deal={qualifying} onClose={() => setQualifying(null)} />

      <PipelineStagesModal open={stagesOpen} onClose={() => setStagesOpen(false)} />

      <DealFormModal open={dealFormOpen} onClose={() => setDealFormOpen(false)} />

      {moveStage.isPending && (
        <p className="flex items-center gap-2 text-xs text-slate">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Déplacement en cours…
        </p>
      )}
    </div>
  );
}
