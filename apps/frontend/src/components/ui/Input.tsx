import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-slate",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
