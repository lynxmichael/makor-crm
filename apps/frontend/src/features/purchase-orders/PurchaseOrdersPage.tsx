import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ban,
  Download,
  FileSignature,
  PenLine,
  Plus,
  Search,
  Send,
  ShoppingCart,
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

import { PurchaseOrderEditorModal } from "./PurchaseOrderEditorModal";
import { purchaseOrdersService } from "@/services/resources";
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
  SENT: "Envoyé",
  SIGNED: "Signé",
  CANCELLED: "Annulé",
};

const STATUS_TONES: Record<string, "neutral" | "wire" | "signal" | "alert"> = {
  DRAFT: "neutral",
  SENT: "wire",
  SIGNED: "signal",
  CANCELLED: "alert",
};

export function PurchaseOrdersPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmSend, setConfirmSend] = useState<Row | null>(null);
  const [confirmSign, setConfirmSign] = useState<Row | null>(null);
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

  const query = useResourceList<Row>(QK.purchaseOrders, purchaseOrdersService, params);

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "send" | "sign" | "cancel" }) =>
      action === "send"
        ? http.post(`/purchase-orders/${id}/send`)
        : http.patch(`/purchase-orders/${id}/${action}`, action === "sign" ? {} : undefined),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "send"
          ? "Bon de commande envoyé au client"
          : variables.action === "sign"
            ? "Bon de commande marqué comme signé"
            : "Bon de commande annulé",
      );
      queryClient.invalidateQueries({ queryKey: QK.purchaseOrders });
      // Un BC signé peut donner lieu à un contrat : la liste des contrats
      // n'est plus à jour.
      queryClient.invalidateQueries({ queryKey: QK.contracts });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => purchaseOrdersService.remove(id),
    onSuccess: () => {
      toast.success("Bon de commande supprimé");
      queryClient.invalidateQueries({ queryKey: QK.purchaseOrders });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  async function downloadPdf(order: Row) {
    try {
      const response = await api.get(`/purchase-orders/${String(order.id)}/pdf`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(order.number ?? "bon-de-commande")}.pdf`;
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

  function openEditor(order: Row | null) {
    setEditing(order);
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
            Bons de commande
          </h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending
              ? "Chargement…"
              : `${total} bon${total > 1 ? "s" : ""} de commande`}
          </p>
        </div>

        <Button onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" />
          Nouveau bon de commande
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
            aria-label="Rechercher un bon de commande"
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
          icon={ShoppingCart}
          title={hasFilters ? "Aucun résultat" : "Aucun bon de commande"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : "Un bon de commande se crée généralement en transformant un devis accepté."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button onClick={() => openEditor(null)}>
                <Plus className="h-4 w-4" />
                Nouveau bon de commande
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
                  <th className="px-4 py-3">Devis d'origine</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Signé le</th>
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
                {rows.map((order) => {
                  const orderStatus = String(order.status ?? "DRAFT");
                  const quote = order.quote as Row | undefined;
                  const customer = order.customer as Row | undefined;

                  return (
                    <motion.tr
                      key={String(order.id)}
                      variants={reduced ? undefined : staggerItem}
                      className="border-b border-line transition-colors last:border-0 hover:bg-paper/60"
                    >
                      <td className="px-4 py-3 font-mono-tabular text-ink">
                        {String(order.number ?? "")}
                      </td>

                      <td className="px-4 py-3 text-ink">
                        {String(customer?.companyName ?? "—")}
                      </td>

                      <td className="px-4 py-3 text-slate">
                        {quote?.number ? (
                          <span className="font-mono-tabular">{String(quote.number)}</span>
                        ) : (
                          "Saisie libre"
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono-tabular text-ink">
                        {formatMoney(order.amount as string)}
                      </td>

                      <td className="px-4 py-3 text-slate">
                        {order.signedAt ? formatDate(order.signedAt as string) : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[orderStatus] ?? "neutral"}>
                          {STATUS_LABELS[orderStatus] ?? orderStatus}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void downloadPdf(order)}
                            aria-label="Télécharger le PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {orderStatus === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditor(order)}
                                aria-label="Modifier"
                              >
                                <PenLine className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmSend(order)}
                                aria-label="Envoyer au client"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {orderStatus === "SENT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-signal hover:bg-signal/10"
                              onClick={() => setConfirmSign(order)}
                              aria-label="Marquer comme signé"
                            >
                              <FileSignature className="h-4 w-4" />
                            </Button>
                          )}

                          {orderStatus !== "CANCELLED" && orderStatus !== "SIGNED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber hover:bg-amber/10"
                              onClick={() =>
                                transition.mutate({ id: String(order.id), action: "cancel" })
                              }
                              aria-label="Annuler"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}

                          {orderStatus === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-alert hover:bg-alert/10"
                              onClick={() => setToDelete(order)}
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

      <PurchaseOrderEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        purchaseOrder={editing}
      />

      <Modal
        open={Boolean(confirmSend)}
        onClose={() => setConfirmSend(null)}
        title="Envoyer au client ?"
        description={String(confirmSend?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Le bon de commande sera envoyé par e-mail au client, PDF joint. Une fois envoyé, il ne
          pourra plus être modifié.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(null)}>
            Annuler
          </Button>
          <Button
            disabled={transition.isPending}
            onClick={() => {
              if (confirmSend) {
                transition.mutate({ id: String(confirmSend.id), action: "send" });
              }
              setConfirmSend(null);
            }}
          >
            <Send className="h-4 w-4" />
            Envoyer
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmSign)}
        onClose={() => setConfirmSign(null)}
        title="Marquer comme signé ?"
        description={String(confirmSign?.number ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          En V1, la signature est papier : vous confirmez ici avoir reçu le bon de commande signé
          par le client. Le scan se dépose ensuite depuis la fiche client. La signature
          électronique est prévue en V2.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSign(null)}>
            Annuler
          </Button>
          <Button
            disabled={transition.isPending}
            onClick={() => {
              if (confirmSign) {
                transition.mutate({ id: String(confirmSign.id), action: "sign" });
              }
              setConfirmSign(null);
            }}
          >
            <FileSignature className="h-4 w-4" />
            Confirmer la signature
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce bon de commande ?"
        description={String(toDelete?.number ?? "")}
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
