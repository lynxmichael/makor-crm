import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, Coins, Loader2, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import { formatDateTime, formatMoney, initials } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Autorisé",
  REJECTED: "Refusé",
  PAID: "Versé",
  CANCELLED: "Annulé",
};

const STATUS_TONES: Record<string, "neutral" | "amber" | "signal" | "alert" | "wire"> = {
  PENDING: "amber",
  APPROVED: "wire",
  REJECTED: "alert",
  PAID: "signal",
  CANCELLED: "neutral",
};

const PAYMENT_METHODS: Record<string, string> = {
  BANK_TRANSFER: "Virement bancaire",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  CASH: "Espèces",
};

/**
 * Retraits de commission (demande du 08/08/2026).
 *
 * Deux lectures d'un même écran : le commercial y demande un retrait et suit
 * ses demandes ; le Super Admin et l'Admin ventes y autorisent ou refusent.
 * L'historique est commun, ce qui évite qu'un désaccord porte sur des chiffres
 * différents de part et d'autre.
 */
export function WithdrawalsPanel() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role?.name);

  const canReview = role === "SUPER_ADMIN" || role === "ADMIN_VENTES";
  const canPay = canReview || role === "MANAGER";

  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [toReject, setToReject] = useState<Row | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [toPay, setToPay] = useState<Row | null>(null);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  const balance = useQuery({
    queryKey: ["withdrawals", "balance"],
    queryFn: () => http.get<{ earned: number; held: number; available: number }>(
      "/commissions/withdrawals/balance",
    ),
  });

  const history = useQuery({
    queryKey: ["withdrawals", "history"],
    queryFn: () =>
      http.get<{ data: Row[]; totalPaid: number }>("/commissions/withdrawals"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["commissions"] });
    queryClient.invalidateQueries({ queryKey: QK.dashboard });
  };

  const request = useMutation({
    mutationFn: () =>
      http.post("/commissions/withdrawals", {
        amount: Number(amount),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success("Demande déposée");
      setAmount("");
      setReason("");
      setRequestOpen(false);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const decide = useMutation({
    mutationFn: ({ id, verb, body }: { id: string; verb: string; body?: Row }) =>
      http.patch(`/commissions/withdrawals/${id}/${verb}`, body),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.verb === "approve"
          ? "Retrait autorisé"
          : variables.verb === "reject"
            ? "Retrait refusé"
            : variables.verb === "pay"
              ? "Retrait marqué comme versé"
              : "Demande annulée",
      );
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = history.data?.data ?? [];
  const pending = rows.filter((r) => r.status === "PENDING");
  const available = Number(balance.data?.available ?? 0);
  const entered = Number(amount) || 0;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
        <Coins className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">Retraits</h2>

        {canReview && pending.length > 0 && (
          <Badge tone="amber">
            {pending.length} à traiter
          </Badge>
        )}

        {!canReview && available > 0 && (
          <Button size="sm" className="ml-auto" onClick={() => setRequestOpen((v) => !v)}>
            <Wallet className="h-3.5 w-3.5" />
            Demander un retrait
          </Button>
        )}
      </header>

      <div className="space-y-4 px-5 py-4">
        {/* Solde — visible du seul demandeur : un pilote lit les soldes dans
            le tableau des commissions par commercial. */}
        {!canReview &&
          (balance.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-paper p-3">
                <dt className="text-xs text-slate">Commissions validées</dt>
                <dd className="mt-1 font-mono-tabular text-lg text-ink">
                  {formatMoney(balance.data?.earned ?? 0)}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-paper p-3">
                <dt className="text-xs text-slate">Déjà demandé ou versé</dt>
                <dd className="mt-1 font-mono-tabular text-lg text-ink">
                  {formatMoney(balance.data?.held ?? 0)}
                </dd>
              </div>
              <div className="rounded-xl border border-signal/25 bg-signal/5 p-3">
                <dt className="text-xs text-signal">Disponible au retrait</dt>
                <dd className="mt-1 font-mono-tabular text-lg font-semibold text-signal">
                  {formatMoney(available)}
                </dd>
              </div>
            </dl>
          ))}

        <AnimatePresence initial={false}>
          {requestOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
                <Field
                  label="Montant demandé"
                  htmlFor="w-amount"
                  required
                  hint={`Disponible : ${formatMoney(available)}`}
                  error={
                    entered > available ? "Le montant dépasse votre solde disponible." : undefined
                  }
                >
                  <Input
                    id="w-amount"
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </Field>

                <Field label="Motif" htmlFor="w-reason" hint="Facultatif, mais souvent utile.">
                  <Textarea
                    id="w-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAmount(String(available))}>
                    Tout retirer
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRequestOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => request.mutate()}
                    disabled={request.isPending || entered <= 0 || entered > available}
                  >
                    {request.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Déposer la demande
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {history.isPending ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate">
            {canReview
              ? "Aucune demande de retrait pour l'instant."
              : "Vous n'avez déposé aucune demande. Le retrait porte sur vos commissions validées, pas sur celles encore en attente."}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {rows.map((row) => {
              const status = String(row.status ?? "");
              const user = row.user as Row | undefined;
              const reviewer = row.reviewedBy as Row | undefined;

              return (
                <li key={String(row.id)} className="flex flex-wrap items-center gap-3 px-3 py-3">
                  {canReview && user && (
                    <span
                      title={`${String(user.firstName ?? "")} ${String(user.lastName ?? "")}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wire/10 text-[10px] font-semibold text-wire"
                    >
                      {initials(String(user.firstName ?? ""), String(user.lastName ?? ""))}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {formatMoney(row.amount as string)}
                      {canReview && user && (
                        <span className="ml-2 font-normal text-slate">
                          {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate">
                      Demandé le {formatDateTime(row.createdAt as string)}
                      {reviewer &&
                        ` · traité par ${String(reviewer.firstName ?? "")} ${String(reviewer.lastName ?? "")}`}
                    </p>
                    {row.reason ? (
                      <p className="mt-0.5 text-xs text-slate">Motif : {String(row.reason)}</p>
                    ) : null}
                    {row.rejectionReason ? (
                      <p className="mt-0.5 text-xs text-alert">
                        Refus : {String(row.rejectionReason)}
                      </p>
                    ) : null}
                    {row.reference ? (
                      <p className="mt-0.5 font-mono-tabular text-xs text-slate">
                        Réf. {String(row.reference)}
                      </p>
                    ) : null}
                  </div>

                  <Badge tone={STATUS_TONES[status] ?? "neutral"}>
                    {STATUS_LABELS[status] ?? status}
                  </Badge>

                  <div className="flex gap-1">
                    {canReview && status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-signal hover:bg-signal/10"
                          onClick={() => decide.mutate({ id: String(row.id), verb: "approve" })}
                          disabled={decide.isPending}
                          aria-label="Autoriser"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-alert hover:bg-alert/10"
                          onClick={() => {
                            setToReject(row);
                            setRejectionReason("");
                          }}
                          aria-label="Refuser"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {canPay && status === "APPROVED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setToPay(row);
                          setReference("");
                        }}
                      >
                        Marquer versé
                      </Button>
                    )}

                    {!canReview && status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate"
                        onClick={() => decide.mutate({ id: String(row.id), verb: "cancel" })}
                        disabled={decide.isPending}
                        aria-label="Retirer ma demande"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {(history.data?.totalPaid ?? 0) > 0 && (
          <p className="text-xs text-slate">
            Total versé : {formatMoney(history.data!.totalPaid)}
          </p>
        )}
      </div>

      {/* Refus motivé */}
      <Modal
        open={Boolean(toReject)}
        onClose={() => setToReject(null)}
        title="Refuser cette demande ?"
        description={toReject ? formatMoney(toReject.amount as string) : undefined}
      >
        <div className="space-y-4">
          <Field
            label="Motif du refus"
            htmlFor="w-reject"
            required
            hint="Le demandeur doit savoir quoi corriger ou discuter."
          >
            <Textarea
              id="w-reject"
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
              disabled={decide.isPending || rejectionReason.trim().length < 5}
              onClick={() => {
                if (toReject) {
                  decide.mutate({
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

      {/* Versement */}
      <Modal
        open={Boolean(toPay)}
        onClose={() => setToPay(null)}
        title="Marquer comme versé"
        description={toPay ? formatMoney(toPay.amount as string) : undefined}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate">
            Les commissions correspondantes passeront en « payée », les plus anciennes d'abord.
            Le solde du bénéficiaire diminuera d'autant.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moyen" htmlFor="w-method">
              <Select id="w-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Référence" htmlFor="w-ref" hint="Pour le rapprochement bancaire.">
              <Input
                id="w-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setToPay(null)}>
              Annuler
            </Button>
            <Button
              disabled={decide.isPending}
              onClick={() => {
                if (toPay) {
                  decide.mutate({
                    id: String(toPay.id),
                    verb: "pay",
                    body: { method, ...(reference.trim() ? { reference: reference.trim() } : {}) },
                  });
                }
                setToPay(null);
              }}
            >
              Confirmer le versement
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
