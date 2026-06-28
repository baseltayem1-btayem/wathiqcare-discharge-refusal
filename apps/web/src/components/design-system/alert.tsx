import * as React from "react";
import { cn } from "./utils";

type AlertProps = React.ComponentProps<"div"> & {
  variant?: "info" | "success" | "warning" | "error";
  icon?: React.ReactNode;
};

export function Alert({
  className,
  variant = "info",
  icon,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
        variant === "info" &&
          "border border-[var(--wc-info)]/20 bg-[var(--wc-info-bg)] text-[var(--wc-info)]",
        variant === "success" &&
          "border border-[var(--wc-success)]/20 bg-[var(--wc-success-bg)] text-[var(--wc-success)]",
        variant === "warning" &&
          "border border-[var(--wc-warning)]/20 bg-[var(--wc-warning-bg)] text-[var(--wc-warning)]",
        variant === "error" &&
          "border border-[#fecaca] bg-[#fef2f2] text-[var(--wc-danger)]",
        className,
      )}
      {...props}
    >
      {icon ? <span className="flex-shrink-0">{icon}</span> : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
