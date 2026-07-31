import { forwardRef, type ReactNode, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-slate", className)} {...props} />;
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-slate",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/**
 * Regroupe libellé, champ et message d'erreur.
 *
 * L'erreur est rendue dans un conteneur de hauteur réservée : sans cela,
 * l'apparition d'un message décale tout le formulaire vers le bas au moment
 * précis où l'utilisateur essaie de corriger sa saisie.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-alert">*</span>}
      </Label>

      {children}

      {(error || hint) && (
        <p
          className={cn("mt-1 text-xs", error ? "text-alert" : "text-slate")}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
