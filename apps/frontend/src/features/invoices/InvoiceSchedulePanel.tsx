import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Installment {
  id: string;
  sequence: number;
  label: string | null;
  dueDate: string;
  amount: number;
  paid: number;
  outstanding: number;
  state: "PAID" | "PARTIAL" | "DUE" | "OVERDUE" | "UPCOMING";
  daysLate: number;
}

interface Schedule {
  hasSchedule: boolean;
  installments: Installment[];
  summary: {
    total: number;
    settled: number;
    outstanding: number;
    paymentsCount: number;
    installmentsCount: number;
    installmentsPaid: number;
    overdueCount: number;
    overdueAmount: number;
    nextDue: Installment | null;
  };
}

const STATE_LABELS: Record<Installment["state"], string> = {
  PAID: "Réglée",
  PARTIAL: "Partielle",
  DUE: "Due aujourd'hui",
  OVERDUE: "En retard",
  UPCOMING: "À venir",
};

const STATE_TONES: Record<Installment["state"], "signal" | "amber" | "alert" | "neutral"> = {
  PAID: "signal",
  PARTIAL: "amber",
  DUE: "amber",
  OVERDUE: "alert",
  UPCOMING: "neutral",
};

/**
 * Échelonnement d'une facture (demande du 12/08/2026).
 *
 * L'échéancier est un engagement prévisionnel ; les versements enregistrés
 * dans le panneau Règlements restent la réalité constatée. Les deux sont
 * rapprochés côté serveur, les versements s'imputant aux échéances les plus
 * anciennes d'abord — sans quoi un paiement destiné au solde masquerait un
 * impayé ancien.
 */
export function InvoiceSchedulePanel({ invoice }: { invoice: Row }) {
  const queryClient = useQueryClient();
  const invoiceId = String(invoice.id);

  const [count, setCount] = useState("3");
  const [everyDays, setEveryDays] = useState("30");
  const [downPayment, setDownPayment] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["invoices", invoiceId, "schedule"],
    queryFn: () => http.get<Schedule>(`/invoices/${invoiceId}/schedule`),
    enabled: Boolean(invoiceId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId, "schedule"] });
    queryClient.invalidateQueries({ queryKey: QK.invoices });
  };

  const generate = useMutation({
    mutationFn: () =>
      http.post(`/invoices/${invoiceId}/schedule`, {
        count: Number(count),
        ...(Number(everyDays) ? { everyDays: Number(everyDays) } : {}),
        ...(Number(downPayment) ? { downPayment: Number(downPayment) } : {}),
        ...(firstDueDate ? { firstDueDate: new Date(firstDueDate).toISOString() } : {}),
      }),
    onSuccess: () => {
      toast.success("Échéancier créé");
      setOpen(false);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const clear = useMutation({
    mutationFn: () => http.delete(`/invoices/${invoiceId}/schedule`),
    onSuccess: () => {
      toast.success("Échéancier supprimé");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  if (query.isPending) return <Skeleton className="h-32 w-full rounded-xl" />;

  const schedule = query.data;
  const summary = schedule?.summary;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
        <CalendarClock className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">Échelonnement</h2>

        {schedule?.hasSchedule && summary && (
          <Badge tone={summary.overdueCount > 0 ? "alert" : "neutral"}>
            {summary.installmentsPaid} / {summary.installmentsCount} échéances réglées
          </Badge>
        )}

        <div className="ml-auto flex gap-2">
          {schedule?.hasSchedule && (
            <Button
              size="sm"
              variant="ghost"
              className="text-alert hover:bg-alert/10"
              onClick={() => clear.mutate()}
              disabled={clear.isPending}
              aria-label="Supprimer l'échéancier"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {(summary?.outstanding ?? 0) > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              {schedule?.hasSchedule ? "Refaire le plan" : "Échelonner"}
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        {open && (
          <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nombre de fois" htmlFor="s-count" required hint="Entre 2 et 36.">
                <Input
                  id="s-count"
                  type="number"
                  min={2}
                  max={36}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </Field>

              <Field label="Tous les (jours)" htmlFor="s-every" hint="30 par défaut.">
                <Input
                  id="s-every"
                  type="number"
                  min={1}
                  value={everyDays}
                  onChange={(e) => setEveryDays(e.target.value)}
                />
              </Field>

              <Field
                label="Acompte"
                htmlFor="s-down"
                hint="Dû immédiatement, déduit du reste."
              >
                <Input
                  id="s-down"
                  type="number"
                  min={0}
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                />
              </Field>

              <Field label="Première échéance" htmlFor="s-first">
                <Input
                  id="s-first"
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
              </Field>
            </div>

            {schedule?.hasSchedule && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-amber">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                L'échéancier actuel sera remplacé. Les versements déjà enregistrés ne sont pas
                touchés : ils seront réimputés sur le nouveau plan.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => generate.mutate()}
                disabled={generate.isPending || Number(count) < 2}
              >
                {generate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Créer l'échéancier
              </Button>
            </div>
          </div>
        )}

        {!schedule?.hasSchedule ? (
          <p className="text-sm leading-relaxed text-slate">
            Aucun échéancier. Le client règle en une fois, ou au fil de l'eau. Créez un plan pour
            fixer des échéances datées et suivre les retards.
          </p>
        ) : (
          <>
            {summary && summary.overdueCount > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {summary.overdueCount} échéance{summary.overdueCount > 1 ? "s" : ""} en retard —{" "}
                {formatMoney(summary.overdueAmount)} à recouvrer
              </p>
            )}

            {summary?.nextDue && summary.overdueCount === 0 && (
              <p className="text-sm text-slate">
                Prochaine échéance le{" "}
                <strong className="text-ink">{formatDate(summary.nextDue.dueDate)}</strong> :{" "}
                {formatMoney(summary.nextDue.outstanding)}
              </p>
            )}

            <ol className="divide-y divide-line rounded-xl border border-line">
              {schedule.installments.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      row.state === "PAID"
                        ? "bg-signal/10 text-signal"
                        : row.state === "OVERDUE"
                          ? "bg-alert/10 text-alert"
                          : "bg-paper text-slate",
                    )}
                  >
                    {row.state === "PAID" ? <Check className="h-3.5 w-3.5" /> : row.sequence}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {row.label ?? `Échéance ${row.sequence}`}
                    </p>
                    <p className="text-xs text-slate">
                      {formatDate(row.dueDate)}
                      {row.daysLate > 0 && ` · ${row.daysLate} jour${row.daysLate > 1 ? "s" : ""} de retard`}
                      {row.paid > 0 && row.outstanding > 0 && ` · ${formatMoney(row.paid)} versé`}
                    </p>
                  </div>

                  <Badge tone={STATE_TONES[row.state]}>{STATE_LABELS[row.state]}</Badge>

                  <span className="font-mono-tabular text-sm font-medium text-ink">
                    {formatMoney(row.amount)}
                  </span>
                </li>
              ))}
            </ol>

            {summary && (
              <p className="text-xs leading-relaxed text-slate">
                {summary.paymentsCount} versement{summary.paymentsCount > 1 ? "s" : ""} enregistré
                {summary.paymentsCount > 1 ? "s" : ""} · {formatMoney(summary.settled)} payé sur{" "}
                {formatMoney(summary.total)} · reste {formatMoney(summary.outstanding)}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
