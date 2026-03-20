import * as React from "react";

import { cn } from "./utils";

type ProgressProps = {
  value?: number;
  className?: string;
};

export function Progress({ value = 0, className }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}>
      <div className="h-full bg-emerald-600 transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
