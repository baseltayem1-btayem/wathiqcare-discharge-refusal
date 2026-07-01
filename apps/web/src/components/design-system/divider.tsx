import * as React from "react";
import { cn } from "./utils";

type DividerProps = React.ComponentProps<"hr"> & {
  label?: React.ReactNode;
};

export function Divider({ className, label, ...props }: DividerProps) {
  if (label) {
    return (
      <div className={cn("relative flex items-center py-2", className)}>
        <div className="flex-1 border-t border-[var(--wc-border)]" />
        <span className="mx-3 text-xs font-medium text-[var(--wc-text-light)]">
          {label}
        </span>
        <div className="flex-1 border-t border-[var(--wc-border)]" />
      </div>
    );
  }

  return (
    <hr
      className={cn("border-0 border-t border-[var(--wc-border)]", className)}
      {...props}
    />
  );
}
