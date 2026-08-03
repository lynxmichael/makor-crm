import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { QuoteEditorModal } from "./QuoteEditorModal";
import { quotesService } from "@/services/resources";
import { api, http } from "@/services/api";
import { useResourceList } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { QK, DEFAULT_PAGE_SIZE } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id: string };

const STATUSES: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const TONES: Record<string, "neutral" | "wire" | "signal" | "alert" | "amber"> = {
  DRAFT: "neutral",
  SENT: "wire",
  ACCEPTED: "signal",
  REJECTED: "alert",
  EXPIRED: "amber",
};

export function QuotesPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [confirmSend, setConfirmSend] = useState<Row | null>(null);

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

  const query = useResourceList<Row>(QK.quotes, quotesService, params);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.quotes });

  /** Les transitions de statut passent par leurs propres routes métier. */
  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "send" | "accept" | "reject" }) =>
      action === "send"
        ? http.post(`/quotes/${id}/send`)
        : http.patch(`/quotes/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "send"
          ? "Devis envoyé au client"
          : variables.action === "accept"
            ? "Devis marqué comme accepté"
            : "Devis marqué comme refusé",
      );
      invalidate();
      setConfirmSend(null);
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => quotesService.remove(id),
    onSuccess: () => {
      toast.success("Devis supprimé");
      invalidate();
      setToDelete(null);
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || status);

  function openEditor(quote: Row | null) {
    setEditing(quote);
    setEditorOpen(true);
  }

  /**
   * Le PDF est généré à la volée par le serveur et exige un jeton : on passe
   * donc par l'instance axios plutôt que par un lien direct, qui n'emporterait
   * pas l'en-tête d'authentification.
   */
  async function downloadPdf(quote: Row) {
    try {
      const response = await api.get(`/quotes/${quote.id}/pdf`, { responseType: "blob" });

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(quote.number ?? "devis")}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error((error as ApiError).message ?? "Téléchargement impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Devis</h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending ? "Chargement…" : `${total} devis`}
          </p>
        </div>

        <Button onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" />
          Nouveau devis
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
            placeholder="Rechercher par numéro, objet ou client"
            className="pl-9"
            aria-label="Rechercher un devis"
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
          {Object.entries(STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPage(1);
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <TableSkeleton rows={8} columns={7} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "Aucun devis ne correspond" : "Aucun devis"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : "Créez un devis pour le proposer à un client, puis transformez-le en bon de commande."
          }
          action={
            hasFilters ? undefined : (
              <Button onClick={() => openEditor(null)}>
                <Plus className="h-4 w-4" />
                Nouveau devis
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
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Objet</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Validité</th>
                  <th className="px-4 py-3 text-right">Total TTC</th>
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
                {rows.map((quote) => {
                  const quoteStatus = String(quote.status ?? "DRAFT");
                  const isDraft = quoteStatus === "DRAFT";
                  const isSent = quoteStatus === "SENT";

                  return (
                    <motion.tr
                      key={quote.id}
                      variants={reduced ? undefined : staggerItem}
                      className="border-b border-line transition-colors last:border-0 hover:bg-paper/60"
                    >
                      <td className="px-4 py-3 font-mono-tabular text-xs text-slate">
                        {String(quote.number ?? "—")}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{String(quote.title ?? "")}</td>
                      <td className="px-4 py-3 text-slate">
                        {String(
                          (quote.customer as Record<string, unknown> | undefined)?.companyName ?? "—",
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate">
                        {quote.validUntil ? formatDate(String(quote.validUntil)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular text-ink">
                        {formatMoney(quote.total as string)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TONES[quoteStatus] ?? "neutral"}>
                          {STATUSES[quoteStatus] ?? quoteStatus}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void downloadPdf(quote)}
                            aria-label="Télécharger le PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* Un devis parti chez le client ne se modifie plus :
                              il faut en émettre un nouveau, sinon la version
                              reçue et la version en base divergent. */}
                          {isDraft && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditor(quote)}
                                aria-label="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmSend(quote)}
                                aria-label="Envoyer au client"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {isSent && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-signal hover:bg-signal/10"
                                onClick={() =>
                                  transition.mutate({ id: quote.id, action: "accept" })
                                }
                                aria-label="Marquer comme accepté"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-alert hover:bg-alert/10"
                                onClick={() =>
                                  transition.mutate({ id: quote.id, action: "reject" })
                                }
                                aria-label="Marquer comme refusé"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {isDraft && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-alert hover:bg-alert/10"
                              onClick={() => setToDelete(quote)}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
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
                Page {page} sur {totalPages} · {total} devis
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

      <QuoteEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} quote={editing} />

      <Modal
        open={Boolean(confirmSend)}
        onClose={() => setConfirmSend(null)}
        title="Envoyer ce devis au client ?"
        description={String(confirmSend?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Le devis part par e-mail avec le PDF en pièce jointe. Il passe au statut « Envoyé » et ne
          sera plus modifiable — pour changer quelque chose, il faudra en émettre un nouveau.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(null)}>
            Annuler
          </Button>
          <Button
            disabled={transition.isPending}
            onClick={() =>
              confirmSend && transition.mutate({ id: confirmSend.id, action: "send" })
            }
          >
            <Send className="h-4 w-4" />
            Envoyer
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce devis ?"
        description={String(toDelete?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Les lignes du devis seront supprimées avec lui. Cette action est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => toDelete && remove.mutate(toDelete.id)}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
