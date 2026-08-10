import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  Download,
  PenLine,
  Plus,
  Receipt,
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

import { InvoiceEditorModal } from "./InvoiceEditorModal";
import { settledAmount } from "./InvoicePaymentsPanel";
import { invoicesService } from "@/services/resources";
import { api, http } from "@/services/api";
import { useResourceList } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { QK, DEFAULT_PAGE_SIZE } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Émise",
  PAID: "Réglée",
  CANCELLED: "Annulée",
};

const STATUS_TONES: Record<string, "neutral" | "wire" | "signal" | "alert"> = {
  DRAFT: "neutral",
  SENT: "wire",
  PAID: "signal",
  CANCELLED: "alert",
};


export function InvoicesPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmPay, setConfirmPay] = useState<Row | null>(null);
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

  const query = useResourceList<Row>(QK.invoices, invoicesService, params);

  const send = useMutation({
    mutationFn: (id: string) => http.post(`/invoices/${id}/send`),
    onSuccess: () => {
      toast.success("Facture envoyée au client");
      queryClient.invalidateQueries({ queryKey: QK.invoices });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "pay" | "cancel" }) =>
      http.patch(`/invoices/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "pay" ? "Facture marquée comme réglée" : "Facture annulée",
      );
      queryClient.invalidateQueries({ queryKey: QK.invoices });
      queryClient.invalidateQueries({ queryKey: QK.payments });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => invoicesService.remove(id),
    onSuccess: () => {
      toast.success("Facture supprimée");
      queryClient.invalidateQueries({ queryKey: QK.invoices });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  async function downloadPdf(invoice: Row) {
    try {
      const response = await api.get(`/invoices/${String(invoice.id)}/pdf`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(invoice.number ?? "facture")}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error((error as ApiError).message);
    }
  }

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || status);

  function openEditor(invoice: Row | null) {
    setEditing(invoice);
    setEditorOpen(true);
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Facturation
          </h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending ? "Chargement…" : `${total} facture${total > 1 ? "s" : ""}`}
          </p>
        </div>

        <Button onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" />
          Nouvelle facture
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
            placeholder="Rechercher par numéro ou client"
            className="pl-9"
            aria-label="Rechercher une facture"
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
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
        <TableSkeleton rows={8} columns={7} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "Aucun résultat" : "Aucune facture"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : "Émettez votre première facture, au titre d'un contrat ou de façon autonome."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button onClick={() => openEditor(null)}>
                <Plus className="h-4 w-4" />
                Nouvelle facture
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
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3 text-right">Total TTC</th>
                  <th className="px-4 py-3 text-right">Reste à régler</th>
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
                {rows.map((invoice) => {
                  const invoiceStatus = String(invoice.status ?? "DRAFT");
                  const customer = invoice.customer as Row | undefined;

                  const totalAmount = Number(invoice.total ?? 0);
                  const settled = settledAmount(invoice);
                  const outstanding = totalAmount - settled;

                  // Une facture échue et non soldée mérite d'être signalée :
                  // c'est l'information que le Financier cherche en priorité.
                  const dueDate = invoice.dueDate ? new Date(String(invoice.dueDate)) : null;
                  const overdue =
                    dueDate !== null &&
                    dueDate < new Date() &&
                    outstanding > 0 &&
                    invoiceStatus !== "CANCELLED" &&
                    invoiceStatus !== "PAID";

                  return (
                    <motion.tr
                      key={String(invoice.id)}
                      variants={reduced ? undefined : staggerItem}
                      className="border-b border-line transition-colors last:border-0 hover:bg-paper/60"
                    >
                      <td className="px-4 py-3 font-mono-tabular text-ink">
                        {String(invoice.number ?? "")}
                      </td>

                      <td className="px-4 py-3 text-ink">
                        {String(customer?.companyName ?? "—")}
                      </td>

                      <td className="px-4 py-3">
                        {invoice.dueDate ? (
                          <span className={overdue ? "font-medium text-alert" : "text-slate"}>
                            {formatDate(invoice.dueDate as string)}
                            {overdue && " · échue"}
                          </span>
                        ) : (
                          <span className="text-slate">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono-tabular text-ink">
                        {formatMoney(totalAmount)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono-tabular">
                        {outstanding <= 0 ? (
                          <span className="text-signal">Soldée</span>
                        ) : (
                          <span className={overdue ? "text-alert" : "text-ink"}>
                            {formatMoney(outstanding)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[invoiceStatus] ?? "neutral"}>
                          {STATUS_LABELS[invoiceStatus] ?? invoiceStatus}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void downloadPdf(invoice)}
                            aria-label="Télécharger le PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {invoiceStatus !== "PAID" && invoiceStatus !== "CANCELLED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmSend(invoice)}
                                aria-label="Envoyer au client"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditor(invoice)}
                                aria-label="Modifier"
                              >
                                <PenLine className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-signal hover:bg-signal/10"
                                onClick={() => setConfirmPay(invoice)}
                                aria-label="Marquer comme réglée"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber hover:bg-amber/10"
                                onClick={() =>
                                  transition.mutate({ id: String(invoice.id), action: "cancel" })
                                }
                                aria-label="Annuler"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {invoiceStatus === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-alert hover:bg-alert/10"
                              onClick={() => setToDelete(invoice)}
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
                Page {page} sur {totalPages} · {total} facture{total > 1 ? "s" : ""}
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

      <InvoiceEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        invoice={editing}
      />

      <Modal
        open={Boolean(confirmSend)}
        onClose={() => setConfirmSend(null)}
        title="Envoyer la facture au client ?"
        description={String(confirmSend?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          La facture part par e-mail à{" "}
          <strong className="text-ink">
            {String((confirmSend?.customer as Row | undefined)?.email ?? "l'adresse du client")}
          </strong>
          , avec le PDF en pièce jointe. Un brouillon passe alors en « émise ».
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(null)}>
            Annuler
          </Button>
          <Button
            disabled={send.isPending}
            onClick={() => {
              if (confirmSend) send.mutate(String(confirmSend.id));
              setConfirmSend(null);
            }}
          >
            <Send className="h-4 w-4" />
            Envoyer
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmPay)}
        onClose={() => setConfirmPay(null)}
        title="Marquer comme réglée ?"
        description={String(confirmPay?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Cette action change uniquement le statut de la facture. Pour tracer le versement
          lui-même — montant, moyen de paiement, date — enregistrez-le depuis le module
          Encaissements.
        </p>

        {confirmPay && Number(confirmPay.total ?? 0) - settledAmount(confirmPay) > 0 && (
          <p className="mt-3 rounded-lg bg-amber/10 px-3 py-2 text-sm text-amber">
            Reste{" "}
            {formatMoney(Number(confirmPay.total ?? 0) - settledAmount(confirmPay))} sans
            encaissement rattaché.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmPay(null)}>
            Annuler
          </Button>
          <Button
            disabled={transition.isPending}
            onClick={() => {
              if (confirmPay) {
                transition.mutate({ id: String(confirmPay.id), action: "pay" });
              }
              setConfirmPay(null);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmer
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer cette facture ?"
        description={String(toDelete?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Seuls les brouillons peuvent être supprimés. Une facture émise s'annule plutôt qu'elle
          ne se supprime, pour conserver la continuité de la numérotation.
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
