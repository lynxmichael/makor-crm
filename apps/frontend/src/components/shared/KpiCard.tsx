import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string;
  /** Unité affichée en petit à droite de la valeur (« FCFA »). */
  unit?: string;
  /** Variation ou précision sous la valeur. */
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  /** Barre de progression 0-100, pour les KPI d'objectif. */
  progress?: number;
  /** Détail secondaire, ex. « SMS 28 · Email 24 · WhatsApp 15 ». */
  hint?: string;
}

const toneClasses: Record<NonNullable<KpiCardProps["deltaTone"]>, string> = {
  up: "text-success",
  down: "text-danger",
  neutral: "text-muted",
};

/**
 * Carte d'indicateur.
 *
 * Composant maison assumé (D10). Les classes `card` et `kpi` viennent de la
 * maquette : le liseré orange de 3 px se déploie en `scaleX` au survol.
 */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaTone = "neutral",
  progress,
  hint,
}: KpiCardProps) {
  return (
    <div className="card kpi p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-text">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>}
      </p>

      {delta && (
        <span className={cn("mt-1 inline-block text-xs font-medium", toneClasses[deltaTone])}>
          {delta}
        </span>
      )}

      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}

      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
