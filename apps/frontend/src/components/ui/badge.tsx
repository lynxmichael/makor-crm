import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "signal" | "amber" | "alert" | "wire";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-paper text-slate border-line",
  signal: "bg-signal/10 text-signal border-signal/20",
  amber: "bg-amber/10 text-amber border-amber/20",
  alert: "bg-alert/10 text-alert border-alert/20",
  wire: "bg-wire/10 text-wire border-wire/20",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
