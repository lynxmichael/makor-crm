import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// `btn`, `btn-primary` et `btn-ghost` viennent de la maquette (index.css,
// @layer components) : dégradé orange, léger soulèvement au survol, halo au
// survol de l'action principale.
const variantClasses: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "bg-surface text-text border border-border hover:bg-bg",
  ghost: "btn-ghost text-text",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "btn whitespace-nowrap",
        // Pas de `pointer-events-none` : une action refusée doit conserver
        // son infobulle, qui dit pourquoi elle l'est.
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
