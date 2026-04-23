import * as React from "react";
import { cn } from "./utils";

type ProgressProps = {
  value?: number;
  max?: number;
  className?: string;
};

export function Progress({ value = 0, max = 100, className }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="h-full bg-[linear-gradient(90deg,#1f5fa7_0%,#2f6fb7_100%)] transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
