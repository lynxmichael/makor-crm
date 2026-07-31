import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-wire to-[#e07e00] text-white shadow-[0_2px_8px_-2px_rgba(243,147,4,.5)] hover:from-[#ffa01a] hover:to-wire hover:shadow-[var(--sh-glow)]",
  secondary: "bg-surface text-ink border border-line hover:bg-wire-soft hover:text-wire-dim",
  ghost: "text-ink hover:bg-paper",
  danger: "bg-alert text-white hover:bg-alert/90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/**
 * Classes du bouton, exposées pour les éléments qui ne sont pas des <button>
 * — typiquement un <Link> de react-router, qui doit rester un <a> pour que
 * le clic milieu et « ouvrir dans un nouvel onglet » fonctionnent.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] font-semibold tracking-[-0.01em]",
    "transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-[1.5px] active:translate-y-0 active:scale-[0.975]",
    "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] font-semibold tracking-[-0.01em]",
    "transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-[1.5px] active:translate-y-0 active:scale-[0.975]",
    "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
