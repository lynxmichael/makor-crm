import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/Field";

import { paymentsService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export const PAYMENT_METHODS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  MOBILE_MONEY: "Mobile Money",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  CINETPAY: "CinetPay",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
};

const STATUS_TONES: Record<string, "neutral" | "amber" | "signal" | "alert"> = {
  PENDING: "neutral",
  PROCESSING: "amber",
  SUCCESS: "signal",
  FAILED: "alert",
  CANCELLED: "neutral",
  REFUNDED: "amber",
};

/** Somme des versements aboutis. Les autres ne soldent rien. */
export function settledAmount(invoice: Row): number {
  return ((invoice.payments as Row[]) ?? [])
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
}

/**
 * Règlements d'une facture (demande du 05/08/2026).
 *
 * Une facture se règle rarement d'un coup ici : un acompte, un versement à la
 * livraison, un solde. Le module Encaissements enregistrait déjà ces
 * versements, mais rien ne les rassemblait au niveau de la facture — on ne
 * pouvait donc pas répondre à « combien reste-t-il à payer ».
 */
export function InvoicePaymentsPanel({ invoice }: { invoice: Row }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  const payments = ((invoice.payments as Row[]) ?? [])
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  const total = Number(invoice.total ?? 0);
  const settled = settledAmount(invoice);
  const outstanding = Math.max(0, total - settled);
  const successful = payments.filter((p) => p.status === "SUCCESS").length;
  const progress = total > 0 ? Math.min(1, settled / total) : 0;

  const record = useMutation({
    mutationFn: () =>
      paymentsService.create({
        invoiceId: String(invoice.id),
        customerId: String(invoice.customerId ?? ""),
        amount: Number(amount),
        method,
        status: "SUCCESS",
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(paidAt ? { paidAt: new Date(paidAt).toISOString() } : {}),
        ...(currentUserId ? { createdById: currentUserId } : {}),
      } as never),
    onSuccess: () => {
      toast.success("Versement enregistré");
      setAmount("");
      setReference("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: QK.invoices });
      // L'échéancier impute les versements : il doit suivre.
      queryClient.invalidateQueries({ queryKey: ["invoices", String(invoice.id), "schedule"] });
      queryClient.invalidateQueries({ queryKey: QK.payments });
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const entered = Number(amount) || 0;
  // Un versement supérieur au reste dû est presque toujours une faute de
  // frappe : on l'annonce avant l'enregistrement plutôt qu'après.
  const overpaying = entered > outstanding && outstanding > 0;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
        <Wallet className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">Règlements</h2>

        {successful > 0 && (
          <Badge tone="neutral">
            {successful} versement{successful > 1 ? "s" : ""}
          </Badge>
        )}

        {outstanding <= 0 && total > 0 && <Badge tone="signal">Soldée</Badge>}

        {outstanding > 0 && (
          <Button size="sm" className="ml-auto" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Enregistrer un versement
          </Button>
        )}
      </header>

      <div className="space-y-4 px-5 py-4">
        {/* Avancement du règlement */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-slate">
              Payé <span className="font-mono-tabular text-ink">{formatMoney(settled)}</span> sur{" "}
              <span className="font-mono-tabular text-ink">{formatMoney(total)}</span>
            </span>
            <span
              className={
                outstanding > 0
                  ? "font-mono-tabular font-medium text-amber"
                  : "font-medium text-signal"
              }
            >
              {outstanding > 0 ? `Reste ${formatMoney(outstanding)}` : "Intégralement réglée"}
            </span>
          </div>

          <span className="block h-2 overflow-hidden rounded-full bg-line">
            <motion.span
              className={`block h-full rounded-full ${outstanding > 0 ? "bg-amber" : "bg-signal"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          </span>
        </div>

        {open && (
          <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Montant"
                htmlFor="p-amount"
                required
                hint={`Reste à régler : ${formatMoney(outstanding)}`}
                error={overpaying ? "Montant supérieur au reste dû." : undefined}
              >
                <Input
                  id="p-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(outstanding)}
                  autoFocus
                />
              </Field>

              <Field label="Moyen de paiement" htmlFor="p-method" required>
                <Select id="p-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Référence" htmlFor="p-ref" hint="Numéro de transaction ou de bordereau.">
                <Input
                  id="p-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>

              <Field label="Date du versement" htmlFor="p-date">
                <Input
                  id="p-date"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {outstanding > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAmount(String(outstanding))}
                >
                  Solder la facture
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => record.mutate()}
                disabled={record.isPending || entered <= 0}
              >
                {record.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate">
            Aucun versement enregistré. Une facture peut être réglée en plusieurs fois : chaque
            versement s'ajoute ici et le reste dû se met à jour.
          </p>
        ) : (
          <ol className="divide-y divide-line rounded-xl border border-line">
            {payments.map((payment, index) => {
              const status = String(payment.status ?? "");

              return (
                <li
                  key={String(payment.id)}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-semibold text-slate">
                    {status === "SUCCESS" ? <Check className="h-3.5 w-3.5 text-signal" /> : index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {PAYMENT_METHODS[String(payment.method)] ?? String(payment.method ?? "")}
                    </p>
                    <p className="truncate text-xs text-slate">
                      {payment.paidAt ? formatDate(payment.paidAt as string) : "Date non précisée"}
                      {payment.reference ? ` · ${String(payment.reference)}` : ""}
                    </p>
                  </div>

                  <Badge tone={STATUS_TONES[status] ?? "neutral"}>{status}</Badge>

                  <span className="font-mono-tabular text-sm font-medium text-ink">
                    {formatMoney(payment.amount as string)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
