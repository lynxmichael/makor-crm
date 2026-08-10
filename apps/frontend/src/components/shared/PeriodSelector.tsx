import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type PeriodKey =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "semester"
  | "year";

const LABELS: Record<PeriodKey, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Année",
};

/**
 * Bornes d'une période, calculées en temps universel.
 *
 * Le décalage horaire d'Abidjan est nul, mais un serveur déployé ailleurs
 * ne l'est pas : passer par UTC évite qu'un « aujourd'hui » calculé dans le
 * navigateur ne corresponde pas à celui du serveur.
 */
export function periodRange(key: PeriodKey, reference = new Date()) {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const d = reference.getUTCDate();

  let from: Date;

  switch (key) {
    case "day":
      from = new Date(Date.UTC(y, m, d));
      break;
    case "week": {
      // Semaine commençant le lundi, comme en usage courant ici.
      const day = reference.getUTCDay();
      const offset = day === 0 ? 6 : day - 1;
      from = new Date(Date.UTC(y, m, d - offset));
      break;
    }
    case "month":
      from = new Date(Date.UTC(y, m, 1));
      break;
    case "quarter":
      from = new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
      break;
    case "semester":
      from = new Date(Date.UTC(y, m < 6 ? 0 : 6, 1));
      break;
    case "year":
      from = new Date(Date.UTC(y, 0, 1));
      break;
  }

  return { from: from.toISOString(), to: new Date().toISOString() };
}

/** Libellé lisible de la période en cours, affiché sous le sélecteur. */
export function periodLabel(key: PeriodKey, reference = new Date()): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
  const { from } = periodRange(key, reference);

  if (key === "day") return `Aujourd'hui, ${fmt.format(reference)}`;
  return `Depuis le ${fmt.format(new Date(from))}`;
}

export function usePeriod(initial: PeriodKey = "month") {
  const [period, setPeriod] = useState<PeriodKey>(initial);
  const range = useMemo(() => periodRange(period), [period]);

  return { period, setPeriod, range, label: periodLabel(period) };
}

export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1">
      {(Object.keys(LABELS) as PeriodKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === key ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink",
          )}
        >
          {LABELS[key]}
        </button>
      ))}
    </div>
  );
}
