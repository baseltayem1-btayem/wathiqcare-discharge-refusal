import * as React from "react";
import { cn } from "./utils";

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "start" | "center";
};

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  align = "center",
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        align === "center" && "items-center text-center",
        align === "start" && "items-start text-start",
        "py-10 px-4",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wc-surface-2)] text-[var(--wc-text-muted)]">
          {icon}
        </div>
      ) : null}
      {title ? (
        <h3 className="text-base font-semibold text-[var(--wc-text)]">{title}</h3>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm text-[var(--wc-text-muted)] max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
