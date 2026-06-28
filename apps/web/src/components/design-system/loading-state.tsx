import * as React from "react";
import { cn } from "./utils";

type LoadingStateProps = React.ComponentProps<"div"> & {
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  center?: boolean;
};

export function LoadingState({
  className,
  label,
  size = "md",
  center = true,
  ...props
}: LoadingStateProps) {
  const spinnerSize =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-[var(--wc-text-muted)]",
        center && "justify-center",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-[var(--wc-border)] border-t-[var(--wc-blue)]",
          spinnerSize,
        )}
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
