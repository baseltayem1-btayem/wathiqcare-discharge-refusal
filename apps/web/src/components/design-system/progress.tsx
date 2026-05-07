import * as React from "react";
import { cn } from "./utils";

type ProgressProps = {
  value?: number;
  max?: number;
  className?: string;
  title?: string;
};

export function Progress({ value = 0, max = 100, className, title = "Progress" }: ProgressProps) {
  const normalizedValue = Math.min(Math.max(value, 0), max);

  return (
    <progress
      title={title}
      className={cn("relative h-2 w-full overflow-hidden border border-[var(--border)] bg-[#eef3f8]", className)}
      value={normalizedValue}
      max={max}
    >
      {normalizedValue}
    </progress>
  );
}
