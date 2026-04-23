"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

type UXStateVariant = "loading" | "empty" | "error";

type UXStateCardProps = {
  variant: UXStateVariant;
  title: string;
  message: string;
  action?: React.ReactNode;
};

function iconForVariant(variant: UXStateVariant) {
  if (variant === "loading") {
    return <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />;
  }
  if (variant === "error") {
    return <AlertTriangle className="h-5 w-5 text-[var(--state-error)]" />;
  }
  return <Inbox className="h-5 w-5 text-slate-500" />;
}

function toneForVariant(variant: UXStateVariant): string {
  if (variant === "loading") {
    return "border-[var(--primary-soft-border)] bg-[var(--primary-soft)]";
  }
  if (variant === "error") {
    return "border-[var(--state-error-border)] bg-[var(--state-error-bg)]";
  }
  return "border-[var(--border-soft)] bg-slate-50/70";
}

export default function UXStateCard({ variant, title, message, action }: UXStateCardProps) {
  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-[var(--shadow-sm)] ${toneForVariant(variant)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{iconForVariant(variant)}</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{message}</div>
          </div>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
