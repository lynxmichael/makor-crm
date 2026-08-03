import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Target, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { EASE_OUT, staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Factor {
  label: string;
  points: number;
  max: number;
  detail?: string;
}

const GRADE_TONES: Record<string, "signal" | "wire" | "amber" | "alert"> = {
  A: "signal",
  B: "wire",
  C: "amber",
  D: "alert",
};

const GRADE_HINTS: Record<string, string> = {
  A: "À traiter en priorité",
  B: "À suivre activement",
  C: "À relancer",
  D: "À requalifier ou écarter",
};

export function ScoringPage() {
  const reduced = usePrefersReducedMotion();
  const role = useAuthStore((s) => s.user?.role?.name);
  const canSeeAll = role !== "COMMERCIAL";

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["scoring", "leads", scope],
    queryFn: () =>
      http.get<Row[]>("/scoring/leads/ranking", {
        params: { scope: scope === "all" ? "all" : undefined, limit: 30 },
      }),
  });

  const leads = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Priorités commerciales
          </h1>
          <p className="mt-1 text-sm text-slate">
            Classement de vos prospects selon des signaux observés : potentiel, complétude du
            dossier, avancement et fraîcheur du suivi.
          </p>
        </div>

        {canSeeAll && (
          <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
            {(
              [
                ["mine", "Mon portefeuille"],
                ["all", "Toute l'équipe"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  scope === value ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun prospect à prioriser"
          detail="Les prospects gagnés ou perdus sont écartés du classement. Créez-en un pour voir apparaître son score."
        />
      ) : (
        <motion.ul
          variants={reduced ? undefined : staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {leads.map((lead, index) => {
            const id = String(lead.id);
            const score = Number(lead.score ?? 0);
            const grade = String(lead.grade ?? "D");
            const factors = (lead.factors as Factor[]) ?? [];
            const isOpen = expanded === id;

            return (
              <motion.li
                key={id}
                variants={reduced ? undefined : staggerItem}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-paper/60"
                >
                  <span className="w-6 shrink-0 text-center font-mono-tabular text-sm text-slate">
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {String(lead.firstName ?? "")} {String(lead.lastName ?? "")}
                    </span>
                    <span className="block truncate text-xs text-slate">
                      {String(lead.company ?? "Sans entreprise")} · {String(lead.status ?? "")}
                    </span>
                  </span>

                  {/* Jauge : la position dans la barre se lit plus vite que le
                      nombre, surtout quand on parcourt une liste de trente. */}
                  <span className="hidden w-32 shrink-0 sm:block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-500",
                          grade === "A"
                            ? "bg-signal"
                            : grade === "B"
                              ? "bg-wire"
                              : grade === "C"
                                ? "bg-amber"
                                : "bg-alert",
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </span>
                  </span>

                  <span className="shrink-0 font-mono-tabular text-sm font-semibold text-ink">
                    {score}
                  </span>

                  <Badge tone={GRADE_TONES[grade] ?? "neutral"}>{grade}</Badge>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: EASE_OUT }}
                      className="overflow-hidden border-t border-line"
                    >
                      <div className="space-y-3 px-4 py-4">
                        <p className="text-xs text-slate">
                          {GRADE_HINTS[grade] ?? ""} — détail du calcul :
                        </p>

                        <ul className="space-y-2">
                          {factors.map((factor) => (
                            <li key={factor.label} className="flex items-center gap-3 text-sm">
                              <span className="w-40 shrink-0 text-slate">{factor.label}</span>

                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                                <span
                                  className="block h-full rounded-full bg-wire"
                                  style={{
                                    width: factor.max
                                      ? `${(factor.points / factor.max) * 100}%`
                                      : "0%",
                                  }}
                                />
                              </span>

                              <span className="w-14 shrink-0 text-right font-mono-tabular text-xs text-ink">
                                {factor.points}/{factor.max}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {factors.some((f) => f.detail) && (
                          <ul className="space-y-1 border-t border-line pt-2">
                            {factors
                              .filter((f) => f.detail)
                              .map((f) => (
                                <li key={`${f.label}-detail`} className="text-xs text-slate">
                                  <span className="text-ink">{f.label}</span> — {f.detail}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-paper/50 px-4 py-3 text-xs leading-relaxed text-slate">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Ce classement repose sur des signaux observés dans le CRM, pas sur une prédiction : le
        détail du calcul est affiché pour chaque prospect afin que le score reste discutable.
      </p>
    </div>
  );
}
