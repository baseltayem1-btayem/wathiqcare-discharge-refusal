"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, cn } from "@/components/design-system";

interface ErrorStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-center",
        compact ? "px-4 py-5" : "min-h-[280px] px-6 py-10",
        className,
      )}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-white text-red-600 shadow-sm ring-1 ring-red-100">
        {icon || <AlertTriangle className="size-5" />}
      </span>
      <p className="text-sm font-semibold text-red-800">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-red-700">{message}</p>
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" uppercase={false} className="mt-4 rounded-xl" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}