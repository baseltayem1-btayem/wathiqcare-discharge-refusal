"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/components/design-system";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, message, icon, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center",
        compact ? "px-4 py-5" : "min-h-[280px] px-6 py-10",
        className,
      )}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
        {icon || <Inbox className="size-5" />}
      </span>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
    </div>
  );
}