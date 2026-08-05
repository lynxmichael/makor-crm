import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// `field` vient de la maquette : rayon 11px, bordure orange et halo
// `0 0 0 3.5px rgba(243,147,4,.14)` au focus.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "field h-10 w-full text-text placeholder:text-muted",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
