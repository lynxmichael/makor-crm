import { cn } from "@/lib/utils";

type Tone = "signal" | "amber" | "alert" | "wire";

const toneClasses: Record<Tone, string> = {
  signal: "bg-signal",
  amber: "bg-amber",
  alert: "bg-alert",
  wire: "bg-wire",
};

interface SignalMeterProps {
  level: 1 | 2 | 3 | 4;
  tone?: Tone;
  label?: string;
  className?: string;
}

/**
 * Jauge à quatre barres inspirée des indicateurs de signal réseau.
 * Utilisée comme indicateur compact de "santé" à travers l'app :
 * température d'un deal, délivrabilité d'une campagne, tendance d'un KPI.
 */
export function SignalMeter({ level, tone = "signal", label, className }: SignalMeterProps) {
  const bars = [1, 2, 3, 4] as const;
  const heights = ["h-1.5", "h-2.5", "h-3.5", "h-[1.15rem]"];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="flex items-end gap-[3px]" role="img" aria-label={label ?? `Niveau ${level} sur 4`}>
        {bars.map((bar, i) => (
          <span
            key={bar}
            className={cn(
              "w-[3px] rounded-full transition-colors duration-300",
              heights[i],
              bar <= level ? toneClasses[tone] : "bg-line"
            )}
          />
        ))}
      </div>
      {label && <span className="font-mono-tabular text-xs text-slate">{label}</span>}
    </div>
  );
}
