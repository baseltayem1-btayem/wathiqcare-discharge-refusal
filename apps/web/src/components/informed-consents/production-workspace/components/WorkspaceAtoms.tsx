"use client";

import type { ReactNode } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/components/design-system";

export function WorkspaceCard({ children, className, ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function WorkspaceSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      <span className="h-px w-4 bg-slate-200" aria-hidden />
      {children}
    </p>
  );
}

export function WorkspaceCardHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

type WorkspaceBadgeTone = "blue" | "green" | "gold" | "slate" | "red";

const workspaceBadgeToneMap: Record<WorkspaceBadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  gold: "bg-amber-100/70 text-amber-900 ring-amber-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  red: "bg-red-50 text-red-700 ring-red-100",
};

export function WorkspaceBadge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: WorkspaceBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        workspaceBadgeToneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function WorkspaceField({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <dl>
      <div>
        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className={cn("mt-1 text-sm font-medium text-slate-900", mono && "font-mono text-[13px]")}>{value}</dd>
      </div>
    </dl>
  );
}