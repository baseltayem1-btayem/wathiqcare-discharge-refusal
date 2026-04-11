import * as React from "react";
import { cn } from "./utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2",
        variant === "default" && "border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary)]",
        variant === "secondary" && "border-slate-200 bg-slate-100 text-slate-700",
        variant === "outline" && "border-slate-300 bg-white text-slate-700",
        variant === "success" && "border-[var(--state-success-border)] bg-[var(--state-success-bg)] text-[var(--state-success)]",
        variant === "warning" && "border-[var(--state-warning-border)] bg-[var(--state-warning-bg)] text-[var(--state-warning)]",
        variant === "destructive" && "border-[var(--state-error-border)] bg-[var(--state-error-bg)] text-[var(--state-error)]",
        className
      )}
      {...props}
    />
  );
}
