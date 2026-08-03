import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ban,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { CampaignEditorModal } from "./CampaignEditorModal";
import { CampaignStatsModal } from "./CampaignStatsModal";
import { campaignsService } from "@/services/resources";
import { http } from "@/services/api";
import { useResourceList } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { QK, DEFAULT_PAGE_SIZE } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Programmée",
  QUEUED: "En file",
  RUNNING: "En cours",
  FINISHED: "Terminée",
  FAILED: "Échouée",
  CANCELLED: "Annulée",
};

const STATUS_TONES: Record<string, "neutral" | "wire" | "signal" | "alert" | "amber"> = {
  DRAFT: "neutral",
  SCHEDULED: "amber",
  QUEUED: "amber",
  RUNNING: "wire",
  FINISHED: "signal",
  FAILED: "alert",
  CANCELLED: "neutral",
};

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  SMS: "SMS",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  VOICE: "Voice",
};

/** Une campagne en cours d'acheminement change d'état côté serveur. */
const LIVE_STATUSES = new Set(["QUEUED", "RUNNING"]);

export function CampaignsPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [statsFor, setStatsFor] = useState<Row | null>(null);
  const [confirmSend, setConfirmSend] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
    }),
    [page, debouncedSearch, status],
  );

  const query = useResourceList<Row>(QK.campaigns, campaignsService, params);

  const rows = query.data?.data ?? [];

  // Les changements de statut arrivent par `campaign:updated` via Socket.IO
  // (voir use-realtime). `hasLive` ne sert donc plus qu'à l'affichage.
  const hasLive = rows.some((row) => LIVE_STATUSES.has(String(row.status)));

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: "send" | "cancel" }) =>
      http.post(`/campaigns/${id}/${verb}`),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.verb === "send" ? "Campagne mise en file d'envoi" : "Campagne annulée",
      );
      queryClient.invalidateQueries({ queryKey: QK.campaigns });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => campaignsService.remove(id),
    onSuccess: () => {
      toast.success("Campagne supprimée");
      queryClient.invalidateQueries({ queryKey: QK.campaigns });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || status);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Campagnes</h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending ? "Chargement…" : `${total} campagne${total > 1 ? "s" : ""}`}
            {hasLive && " · envoi en cours"}
          </p>
        </div>

        <Button
          onClick={() => setEditorOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Button>
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
            placeholder="Rechercher une campagne"
            className="pl-9"
            aria-label="Rechercher une campagne"
          />
        </div>

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
          {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={hasFilters ? "Aucun résultat" : "Aucune campagne"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : "Créez une campagne SMS, e-mail, WhatsApp ou Voice et ciblez vos clients."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button onClick={() => setEditorOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle campagne
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Campagne</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Pays</th>
                  <th className="px-4 py-3">Programmée</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <motion.tbody
                key={page}
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
              >
                {rows.map((campaign) => {
                  const campaignStatus = String(campaign.status ?? "DRAFT");
                  const isLive = LIVE_STATUSES.has(campaignStatus);

                  return (
                    <motion.tr
                      key={String(campaign.id)}
                      variants={reduced ? undefined : staggerItem}
                      className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-paper/60"
                      onClick={() => setStatsFor(campaign)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{String(campaign.name ?? "")}</p>
                        <p className="truncate text-xs text-slate">
                          {String(campaign.message ?? "").slice(0, 60)}
                          {String(campaign.message ?? "").length > 60 ? "…" : ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-slate">
                        {CAMPAIGN_TYPE_LABELS[String(campaign.type)] ?? String(campaign.type ?? "")}
                      </td>

                      <td className="px-4 py-3 text-slate">{String(campaign.country ?? "—")}</td>

                      <td className="px-4 py-3 text-slate">
                        {campaign.scheduledAt ? formatDate(campaign.scheduledAt as string) : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[campaignStatus] ?? "neutral"}>
                          <span className="flex items-center gap-1.5">
                            {isLive && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                            )}
                            {CAMPAIGN_STATUS_LABELS[campaignStatus] ?? campaignStatus}
                          </span>
                        </Badge>
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatsFor(campaign)}
                            aria-label="Voir les statistiques"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>

                          {campaignStatus === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-signal hover:bg-signal/10"
                                onClick={() => setConfirmSend(campaign)}
                                aria-label="Lancer l'envoi"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-alert hover:bg-alert/10"
                                onClick={() => setToDelete(campaign)}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {(isLive || campaignStatus === "SCHEDULED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber hover:bg-amber/10"
                              onClick={() =>
                                action.mutate({ id: String(campaign.id), verb: "cancel" })
                              }
                              aria-label="Annuler l'envoi"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <p className="text-xs text-slate">
                Page {page} sur {totalPages} · {total} campagne{total > 1 ? "s" : ""}
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

      {/* La modale d'édition ne gère que la création : le backend n'expose
          l'édition que sur les brouillons, et le formulaire existant ne prend
          pas de campagne en entrée. */}
      <CampaignEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} />

      <CampaignStatsModal campaign={statsFor} onClose={() => setStatsFor(null)} />

      <Modal
        open={Boolean(confirmSend)}
        onClose={() => setConfirmSend(null)}
        title="Lancer l'envoi ?"
        description={String(confirmSend?.name ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          La campagne part vers la file d'acheminement. Une fois l'envoi commencé, les messages
          déjà partis ne peuvent plus être rappelés — seules les cibles restantes seront
          épargnées par une annulation.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(null)}>
            Annuler
          </Button>
          <Button
            disabled={action.isPending}
            onClick={() => {
              if (confirmSend) action.mutate({ id: String(confirmSend.id), verb: "send" });
              setConfirmSend(null);
            }}
          >
            <Send className="h-4 w-4" />
            Lancer l'envoi
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer cette campagne ?"
        description={String(toDelete?.name ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Seuls les brouillons peuvent être supprimés. Cette action est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={remove.isPending}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
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
