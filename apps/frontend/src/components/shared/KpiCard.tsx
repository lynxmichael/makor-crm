import { Card, CardContent } from "@/components/ui/Card";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { cn } from "@/lib/utils";
import type { KpiSummary } from "@/types";

export function KpiCard({ label, value, delta, deltaTone, level }: KpiSummary) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate">{label}</p>
        <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className={cn("text-xs font-medium", deltaTone === "signal" ? "text-signal" : "text-alert")}>
            {delta}
          </span>
          <SignalMeter level={level} tone={deltaTone} />
        </div>
      </CardContent>
    </Card>
  );
}
