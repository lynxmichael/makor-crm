import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  BarChart3,
  Download,
  Eye,
  CirclePause,
  CircleStop,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Upload,
  Pencil,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { ModuleFormModal } from "./ModuleFormModal";
import { DocumentStatsPanel } from "@/features/documents/DocumentStatsPanel";
import { DocumentUploadModal } from "@/features/documents/DocumentUploadModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http, openFile } from "@/services/api";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { DEFAULT_PAGE_SIZE } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import type { ApiError } from "@/types/api";
import type { ModuleConfig, ModuleField, Row } from "./module-config";

/**
 * Page de liste générique, branchée sur l'API.
 *
 * Onze écrans du CDC sont la même chose : une liste paginée et filtrable sur
 * une ressource REST, plus un formulaire. Les écrire un par un aurait produit
 * onze fois le même code — et onze occasions d'oublier l'état vide ou la
 * gestion d'erreur. Chaque module se réduit ici à un objet de configuration.
 *
 * Ce qui ne rentre pas dans ce moule garde son écran dédié : les factures proforma, bons
 * de commande et factures ont des lignes à saisir et des totaux à calculer,
 * le pipeline a son glisser-déposer, le tableau de bord a cinq formes de
 * réponse.
 */
export function ResourceModulePage({ config }: { config: ModuleConfig }) {
  const reduced = usePrefersReducedMotion();
  const role = useAuthStore((s) => s.user?.role?.name);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [toSend, setToSend] = useState<Row | null>(null);
  const [rowAction, setRowAction] = useState<{ row: Row; index: number } | null>(null);
  const [statsFor, setStatsFor] = useState<Row | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { [config.statusFilterKey ?? "status"]: status } : {}),
      ...(config.extraParams ?? {}),
    }),
    [page, debouncedSearch, status, config],
  );

  const query = useResourceList<Row>(config.queryKey, config.service, params);
  const { create, update, remove, isBusy } = useResourceMutations<Row>(
    config.queryKey,
    config.service,
    config.toasts,
  );

  const queryClient = useQueryClient();

  const send = useMutation({
    mutationFn: (id: string) => http.post(config.sendAction!.path.replace(":id", id)),
    onSuccess: () => {
      toast.success(config.sendAction!.successMessage);
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const runRowAction = useMutation({
    mutationFn: ({ row, index }: { row: Row; index: number }) => {
      const action = config.rowActions![index];
      const url = action.path.replace(":id", String(row.id));
      return action.method === "post" ? http.post(url) : http.patch(url);
    },
    onSuccess: (_data, variables) => {
      toast.success(config.rowActions![variables.index].successMessage);
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || status);

  // Un module en lecture seule (journal d'audit) n'expose ni bouton d'ajout
  // ni action de ligne, et un rôle non autorisé non plus.
  const canWrite =
    !config.readOnly && (!config.writeRoles || (role ? config.writeRoles.includes(role) : false));

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
  }

  async function submit(values: Row) {
    if (editing) {
      await update.mutateAsync({ id: String(editing.id), body: values as never });
    } else {
      await create.mutateAsync(values as never);
    }
    setFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {config.title}
          </h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending ? "Chargement…" : config.subtitle(total)}
          </p>
        </div>

        {config.uploadAction && (
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            {config.uploadAction.label}
          </Button>
        )}

        {canWrite && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {config.createLabel}
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={config.searchPlaceholder}
            className="pl-9"
            aria-label={`Rechercher — ${config.title}`}
          />
        </div>

        {config.statuses && (
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-auto min-w-[160px]"
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(config.statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <TableSkeleton rows={8} columns={config.columns.length + 1} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={config.icon as LucideIcon}
          title={hasFilters ? "Aucun résultat" : config.emptyTitle}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : config.emptyDetail
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {config.createLabel}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 ${column.align === "right" ? "text-right" : ""}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  {(canWrite || config.statsPanel || config.fileActions) && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>

              <motion.tbody
                key={page}
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
              >
                {rows.map((row) => (
                  <motion.tr
                    key={String(row.id)}
                    variants={reduced ? undefined : staggerItem}
                    className="border-b border-line transition-colors last:border-0 hover:bg-paper/60"
                  >
                    {config.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 ${
                          column.align === "right"
                            ? "text-right font-mono-tabular text-ink"
                            : "text-ink"
                        }`}
                      >
                        {renderCell(row, column, config)}
                      </td>
                    ))}

                    {(canWrite || config.statsPanel || config.fileActions) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {config.fileActions && row[config.fileActions.pathKey] ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  void openFile(
                                    String(row[config.fileActions!.pathKey]),
                                  ).catch((error) =>
                                    toast.error((error as ApiError).message),
                                  )
                                }
                                aria-label="Prévisualiser"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  void openFile(
                                    String(row[config.fileActions!.pathKey]),
                                    String(
                                      row[config.fileActions!.nameKey ?? "name"] ?? "document",
                                    ),
                                  ).catch((error) =>
                                    toast.error((error as ApiError).message),
                                  )
                                }
                                aria-label="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}

                          {config.statsPanel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatsFor(row)}
                              aria-label="Statistiques de consultation"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          )}

                          {canWrite &&
                            config.rowActions?.map((action, index) => {
                            const status = String(row[config.statusFilterKey ?? "status"] ?? "");
                            if (action.visibleWhen && !action.visibleWhen.includes(status)) {
                              return null;
                            }

                            const Glyph =
                              action.icon === "pause"
                                ? CirclePause
                                : action.icon === "stop"
                                  ? CircleStop
                                  : Check;

                            return (
                              <Button
                                key={action.path}
                                variant="ghost"
                                size="sm"
                                className={
                                  action.tone === "alert"
                                    ? "text-alert hover:bg-alert/10"
                                    : action.tone === "amber"
                                      ? "text-amber hover:bg-amber/10"
                                      : "text-signal hover:bg-signal/10"
                                }
                                onClick={() => setRowAction({ row, index })}
                                aria-label={action.label}
                              >
                                <Glyph className="h-4 w-4" />
                              </Button>
                            );
                          })}

                          {canWrite && config.sendAction && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setToSend(row)}
                              aria-label={config.sendAction.label}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {canWrite && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditing(row);
                                  setFormOpen(true);
                                }}
                                aria-label="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-alert hover:bg-alert/10"
                                onClick={() => setToDelete(row)}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <p className="text-xs text-slate">
                Page {page} sur {totalPages} · {total} enregistrement{total > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || query.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {canWrite && (
        <ModuleFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          config={config}
          row={editing}
          onSubmit={submit}
          pending={create.isPending || update.isPending}
          error={(editing ? update.error : create.error) as ApiError | null}
        />
      )}

      {config.sendAction && (
        <Modal
          open={Boolean(toSend)}
          onClose={() => setToSend(null)}
          title={config.sendAction.confirmTitle}
          description={toSend ? String(toSend[config.columns[0].key] ?? "") : undefined}
        >
          <p className="text-sm leading-relaxed text-slate">{config.sendAction.confirmBody}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToSend(null)}>
              Annuler
            </Button>
            <Button
              disabled={send.isPending}
              onClick={() => {
                if (toSend) send.mutate(String(toSend.id));
                setToSend(null);
              }}
            >
              <Send className="h-4 w-4" />
              {config.sendAction.label}
            </Button>
          </div>
        </Modal>
      )}

      {config.uploadAction && (
        <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}

      {config.statsPanel && (
        <Modal
          open={Boolean(statsFor)}
          onClose={() => setStatsFor(null)}
          title={statsFor ? String(statsFor[config.columns[0].key] ?? "") : ""}
          description="Consultations, téléchargements et envois de ce document."
          className="max-w-2xl"
        >
          {statsFor && <DocumentStatsPanel documentId={String(statsFor.id)} />}
        </Modal>
      )}

      <Modal
        open={Boolean(rowAction)}
        onClose={() => setRowAction(null)}
        title={rowAction ? config.rowActions![rowAction.index].label + " ?" : ""}
        description={
          rowAction ? String(rowAction.row[config.columns[0].key] ?? "") : undefined
        }
      >
        <p className="text-sm leading-relaxed text-slate">
          {rowAction ? config.rowActions![rowAction.index].confirmBody : ""}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRowAction(null)}>
            Annuler
          </Button>
          <Button
            disabled={runRowAction.isPending}
            onClick={() => {
              if (rowAction) runRowAction.mutate(rowAction);
              setRowAction(null);
            }}
          >
            {rowAction ? config.rowActions![rowAction.index].label : ""}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Confirmer la suppression"
        description={toDelete ? String(toDelete[config.columns[0].key] ?? "") : undefined}
      >
        <p className="text-sm leading-relaxed text-slate">
          {config.deleteWarning ?? "Cette action est irréversible."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={isBusy}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={isBusy}
            onClick={async () => {
              if (toDelete) await remove.mutateAsync(String(toDelete.id));
              setToDelete(null);
            }}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Rend une cellule selon le type déclaré, en gérant les valeurs absentes. */
function renderCell(row: Row, column: ModuleField, config: ModuleConfig) {
  // Les relations arrivent imbriquées : « customer.companyName » les traverse.
  const raw = column.key
    .split(".")
    .reduce<unknown>((acc, part) => (acc as Row | undefined)?.[part], row);

  if (raw === null || raw === undefined || raw === "") return <span className="text-slate">—</span>;

  switch (column.type) {
    case "money":
      return formatMoney(raw as string | number);
    case "date":
      return formatDate(raw as string);
    case "status": {
      const label = config.statuses?.[String(raw)] ?? String(raw);
      const tone = config.statusTones?.[String(raw)] ?? "neutral";
      return <Badge tone={tone}>{label}</Badge>;
    }
    default:
      return String(raw);
  }
}
