import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarCheck, ChevronDown, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { formatDate, initials } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export const CANCELLATION_LABELS: Record<string, string> = {
  CLIENT_INDISPONIBLE: "Client indisponible",
  CLIENT_REPORTE: "Reporté par le client",
  CLIENT_DESISTE: "Client désisté",
  COMMERCIAL_INDISPONIBLE: "Commercial indisponible",
  DOUBLON: "Doublon",
  AUTRE: "Autre",
};

/** Premier jour du mois courant, au format attendu par un champ date. */
function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

export function EvaluationPage() {
  const reduced = usePrefersReducedMotion();

  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const team = useQuery({
    queryKey: ["evaluation", "team", from, to],
    queryFn: () =>
      http.get<Row[]>("/evaluation/team", {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      }),
  });

  const cancellations = useQuery({
    queryKey: ["evaluation", "cancellations", expanded, from, to],
    queryFn: () =>
      http.get<Row[]>(`/evaluation/cancellations/${expanded}`, {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      }),
    enabled: Boolean(expanded),
  });

  const rows = team.data ?? [];
  const totalUnjustified = rows.reduce(
    (sum, row) => sum + Number(row.unjustifiedCancellations ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Évaluation des commerciaux
        </h1>
        <p className="mt-1 text-sm text-slate">
          Rendez-vous pris et réalisés sur la période, avec le motif de chaque annulation.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
        <div>
          <label htmlFor="e-from" className="mb-1.5 block text-xs font-medium text-slate">
            Du
          </label>
          <Input id="e-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="e-to" className="mb-1.5 block text-xs font-medium text-slate">
            Au
          </label>
          <Input id="e-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {totalUnjustified > 0 && (
          <p className="ml-auto flex items-center gap-2 rounded-lg bg-amber/10 px-3 py-2 text-xs text-amber">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {totalUnjustified} annulation{totalUnjustified > 1 ? "s" : ""} sans motif — à
            régulariser
          </p>
        )}
      </div>

      {team.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : team.isError ? (
        <ErrorState error={team.error as ApiError} onRetry={() => void team.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun commercial à évaluer"
          detail="Les comptes actifs de profil Commercial ou Superviseur apparaîtront ici."
        />
      ) : (
        <motion.ul
          variants={reduced ? undefined : staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {rows.map((row) => {
            const agent = row.agent as Row;
            const id = String(agent.id);
            const taken = Number(row.meetingsTaken ?? 0);
            const completed = Number(row.meetingsCompleted ?? 0);
            const cancelled = Number(row.meetingsCancelled ?? 0);
            const rate = Number(row.completionRate ?? 0);
            const isOpen = expanded === id;

            return (
              <motion.li
                key={id}
                variants={reduced ? undefined : staggerItem}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wire/10 text-xs font-semibold text-wire">
                    {initials(String(agent.firstName ?? ""), String(agent.lastName ?? ""))}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {String(agent.firstName ?? "")} {String(agent.lastName ?? "")}
                    </p>
                    <p className="text-xs text-slate">
                      {taken} rendez-vous pris · {completed} réalisé{completed > 1 ? "s" : ""}
                      {cancelled > 0 && ` · ${cancelled} annulé${cancelled > 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Le taux de réalisation prime sur le volume : prendre
                      beaucoup de rendez-vous sans les honorer n'est pas
                      une performance. */}
                  <div className="w-40 shrink-0">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate">Réalisation</span>
                      <span className="font-mono-tabular text-ink">
                        {(rate * 100).toFixed(0)} %
                      </span>
                    </div>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-500",
                          rate >= 0.7 ? "bg-signal" : rate >= 0.4 ? "bg-amber" : "bg-alert",
                        )}
                        style={{ width: `${Math.round(rate * 100)}%` }}
                      />
                    </span>
                  </div>

                  {Number(row.unjustifiedCancellations ?? 0) > 0 && (
                    <Badge tone="amber">
                      {String(row.unjustifiedCancellations)} sans motif
                    </Badge>
                  )}

                  {cancelled > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : id)}
                    >
                      Annulations
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                      />
                    </Button>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t border-line bg-paper/40 px-4 py-3">
                    {cancellations.isPending ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (cancellations.data ?? []).length === 0 ? (
                      <p className="text-sm text-slate">Aucune annulation sur la période.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(cancellations.data ?? []).map((entry) => (
                          <li
                            key={String(entry.id)}
                            className="rounded-lg border border-line bg-surface px-3 py-2"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-medium text-ink">
                                {String(entry.title ?? "")}
                              </span>
                              <span className="text-xs text-slate">
                                {String(
                                  (entry.customer as Row | undefined)?.companyName ?? "",
                                )}
                              </span>
                              <span className="ml-auto text-xs text-slate">
                                {entry.cancelledAt ? formatDate(entry.cancelledAt as string) : "—"}
                              </span>
                            </div>

                            {entry.cancellationReason ? (
                              <p className="mt-1 text-xs text-slate">
                                <span className="text-ink">
                                  {CANCELLATION_LABELS[String(entry.cancellationReason)] ??
                                    String(entry.cancellationReason)}
                                </span>
                                {entry.cancellationNote && ` — ${String(entry.cancellationNote)}`}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-amber">
                                Annulation non justifiée — à régulariser auprès du commercial.
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-paper/50 px-4 py-3 text-xs leading-relaxed text-slate">
        <CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Seuls les rendez-vous sont comptés — appels, tâches et notes en sont exclus. Un commercial
        n'a pas accès à cet écran.
      </p>
    </div>
  );
}
