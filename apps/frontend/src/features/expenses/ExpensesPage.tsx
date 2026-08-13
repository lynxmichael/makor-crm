import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  Info,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { http } from "@/services/api";
import { customersService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { QK } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export const EXPENSE_CATEGORIES: Record<string, string> = {
  DEPLACEMENT: "Déplacement",
  CARBURANT: "Carburant",
  RESTAURATION_CLIENT: "Restauration client",
  ECHANTILLONS: "Échantillons",
  COMMUNICATIONS: "Communications",
  HEBERGEMENT: "Hébergement",
  AUTRE: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Validé",
  REJECTED: "Refusé",
  REIMBURSED: "Remboursé",
};

const STATUS_TONES: Record<string, "neutral" | "amber" | "signal" | "alert"> = {
  PENDING: "amber",
  APPROVED: "signal",
  REJECTED: "alert",
  REIMBURSED: "signal",
};

interface Totals {
  engaged: number;
  pending: number;
  pendingCount: number;
  reimbursed: number;
  outstanding: number;
}

interface Payload {
  data: Row[];
  totals: Totals;
  byCategory: { category: string; amount: number }[];
}

/**
 * Notes de frais (demande du 13/08/2026).
 *
 * Le périmètre est appliqué côté serveur : un commercial ne reçoit que ses
 * propres notes, quoi qu'il demande. L'écran n'a donc pas à filtrer lui-même —
 * il adapte seulement ce qu'il propose.
 */
export function ExpensesPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role?.name);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const canReview = role === "SUPER_ADMIN" || role === "ADMIN_VENTES";
  const canReimburse = canReview || role === "MANAGER";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [toReject, setToReject] = useState<Row | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
    }),
    [debouncedSearch, category, status],
  );

  const query = useQuery({
    queryKey: ["expenses", params],
    queryFn: () => http.get<Payload>("/expenses", { params }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const act = useMutation({
    mutationFn: ({ id, verb, body }: { id: string; verb: string; body?: Row }) =>
      http.patch(`/expenses/${id}/${verb}`, body),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.verb === "approve"
          ? "Note validée"
          : variables.verb === "reject"
            ? "Note refusée"
            : "Note remboursée",
      );
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => http.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success("Note supprimée");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const totals = query.data?.totals;
  const byCategory = query.data?.byCategory ?? [];
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.amount));
  const hasFilters = Boolean(debouncedSearch || category || status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Notes de frais
          </h1>
          <p className="mt-1 text-sm text-slate">
            Frais engagés, validation et remboursement
          </p>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle note de frais
        </Button>
      </header>

      {/* Totaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Frais engagés", totals?.engaged ?? 0, "text-wire"],
            ["En attente", totals?.pending ?? 0, "text-amber"],
            ["Remboursés", totals?.reimbursed ?? 0, "text-ink"],
            ["Reste à rembourser", totals?.outstanding ?? 0, "text-signal"],
          ] as const
        ).map(([label, value, tone]) => (
          <article key={label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-slate">{label}</p>
            {query.isPending ? (
              <Skeleton className="mt-2 h-7 w-28" />
            ) : (
              <p className={cn("mt-1.5 font-display text-2xl font-semibold tracking-tight", tone)}>
                {formatMoney(value)}
              </p>
            )}
          </article>
        ))}
      </div>

      {/* Le justificatif n'est pas exigé : on l'annonce plutôt que de laisser
          croire à un oubli. */}
      <p className="flex items-start gap-2 rounded-xl border border-line bg-paper/60 px-4 py-3 text-sm leading-relaxed text-slate">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong className="text-ink">Pas de justificatif obligatoire.</strong> Le contexte
          local ne permet pas toujours d'obtenir un reçu — un taxi, par exemple. La déclaration
          suffit, la validation est humaine.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un frais, un client…"
            className="pl-9"
            aria-label="Rechercher une note de frais"
          />
        </div>

        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-auto min-w-[170px]"
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>
          {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-auto min-w-[150px]"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setCategory("");
              setStatus("");
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "Aucune note ne correspond" : "Aucune note de frais"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou changez de filtre."
              : "Déclarez vos frais engagés pour en demander le remboursement."
          }
          action={
            !hasFilters ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle note de frais
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="scrollbar-thin overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Rattaché à</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <motion.tbody
              variants={reduced ? undefined : staggerContainer}
              initial="initial"
              animate="animate"
            >
              {rows.map((expense) => {
                const expenseStatus = String(expense.status ?? "");
                const author = expense.user as Row | undefined;
                const customer = expense.customer as Row | undefined;
                const isMine = String(author?.id ?? "") === currentUserId;

                return (
                  <motion.tr
                    key={String(expense.id)}
                    variants={reduced ? undefined : staggerItem}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-3 text-slate">
                      {formatDate(expense.spentAt as string)}
                    </td>

                    <td className="px-4 py-3 text-slate">
                      {EXPENSE_CATEGORIES[String(expense.category)] ?? String(expense.category)}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{String(expense.label ?? "")}</p>
                      {/* L'auteur n'est utile qu'à qui voit l'équipe. */}
                      {canReview && author && (
                        <p className="text-xs text-slate">
                          {String(author.firstName ?? "")} {String(author.lastName ?? "")}
                        </p>
                      )}
                      {expense.rejectionReason ? (
                        <p className="mt-0.5 text-xs text-alert">
                          Refus : {String(expense.rejectionReason)}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-slate">
                      {customer ? String(customer.companyName ?? "") : "—"}
                    </td>

                    <td className="px-4 py-3 text-right font-mono-tabular font-medium text-ink">
                      {formatMoney(expense.amount as string)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONES[expenseStatus] ?? "neutral"}>
                        {STATUS_LABELS[expenseStatus] ?? expenseStatus}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canReview && expenseStatus === "PENDING" && !isMine && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-signal hover:bg-signal/10"
                              onClick={() =>
                                act.mutate({ id: String(expense.id), verb: "approve" })
                              }
                              disabled={act.isPending}
                              aria-label="Valider"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-alert hover:bg-alert/10"
                              onClick={() => {
                                setToReject(expense);
                                setRejectionReason("");
                              }}
                              aria-label="Refuser"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Un valideur ne traite pas sa propre note : le serveur
                            le refuse, autant ne pas proposer le bouton. */}
                        {canReview && expenseStatus === "PENDING" && isMine && (
                          <span className="text-xs text-slate">
                            En attente d'un autre validateur
                          </span>
                        )}

                        {canReimburse && expenseStatus === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              act.mutate({ id: String(expense.id), verb: "reimburse" })
                            }
                            disabled={act.isPending}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Rembourser
                          </Button>
                        )}

                        {expenseStatus === "APPROVED" && !canReimburse && (
                          <span className="text-xs text-slate">En attente de remboursement</span>
                        )}

                        {isMine && expenseStatus === "PENDING" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-alert hover:bg-alert/10"
                            onClick={() => remove.mutate(String(expense.id))}
                            disabled={remove.isPending}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        {expenseStatus === "REIMBURSED" && (
                          <span className="text-slate">—</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>
      )}

      {/* Répartition par catégorie */}
      {byCategory.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-sm font-semibold text-ink">Frais par catégorie</h2>
          <p className="mt-0.5 text-xs text-slate">
            Hors notes refusées — {formatMoney(totals?.engaged ?? 0)} au total
          </p>

          <ul className="mt-4 space-y-2.5">
            {byCategory.map((entry) => (
              <li key={entry.category} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-slate">
                  {EXPENSE_CATEGORIES[entry.category] ?? entry.category}
                </span>

                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/50">
                  <span
                    className="block h-full rounded-full bg-wire transition-[width] duration-500"
                    style={{ width: `${Math.round((entry.amount / maxCategory) * 100)}%` }}
                  />
                </span>

                <span className="w-32 shrink-0 text-right font-mono-tabular text-ink">
                  {formatMoney(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      {/* Refus motivé */}
      <Modal
        open={Boolean(toReject)}
        onClose={() => setToReject(null)}
        title="Refuser cette note ?"
        description={toReject ? String(toReject.label ?? "") : undefined}
      >
        <div className="space-y-4">
          <Field
            label="Motif du refus"
            htmlFor="e-reject"
            required
            hint="Sans explication, la même note reviendra la semaine prochaine."
          >
            <Textarea
              id="e-reject"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setToReject(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={act.isPending || rejectionReason.trim().length < 5}
              onClick={() => {
                if (toReject) {
                  act.mutate({
                    id: String(toReject.id),
                    verb: "reject",
                    body: { rejectionReason: rejectionReason.trim() },
                  });
                }
                setToReject(null);
              }}
            >
              Refuser
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Dépôt d'une note. Elle est toujours déposée pour soi-même. */
function ExpenseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("DEPLACEMENT");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: () =>
      http.post("/expenses", {
        category,
        label: label.trim(),
        amount: Number(amount),
        spentAt: new Date(spentAt).toISOString(),
        ...(customerId ? { customerId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success("Note de frais déposée");
      setLabel("");
      setAmount("");
      setCustomerId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const canSubmit = label.trim().length >= 3 && Number(amount) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle note de frais"
      description="Le justificatif n'est pas exigé — la validation est humaine."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="e-cat" required>
            <Select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(EXPENSE_CATEGORIES).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date de la dépense" htmlFor="e-date" required>
            <Input
              id="e-date"
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Objet"
          htmlFor="e-label"
          required
          hint="Ce qui permettra de reconnaître la dépense dans six mois."
        >
          <Input
            id="e-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Abidjan → Yamoussoukro"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant (FCFA)" htmlFor="e-amount" required>
            <Input
              id="e-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field
            label="Rattaché à"
            htmlFor="e-customer"
            hint="Facultatif — pour les frais engagés chez un client."
          >
            <EntitySelect
              id="e-customer"
              service={customersService}
              queryKey={QK.customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder="Rechercher un client"
              render={(row) => ({
                label: String(row.companyName ?? ""),
                detail: String(row.code ?? ""),
              })}
            />
          </Field>
        </div>

        <Field label="Précisions" htmlFor="e-notes">
          <Textarea
            id="e-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexte utile au validateur…"
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Déposer la note
          </Button>
        </div>
      </div>
    </Modal>
  );
}
