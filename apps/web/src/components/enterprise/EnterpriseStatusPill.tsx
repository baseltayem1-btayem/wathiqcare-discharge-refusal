"use client";

import type { ReactNode } from "react";

export type EnterpriseStatus = "ok" | "warn" | "err" | "info" | "neutral";

export type EnterpriseStatusPillProps = {
  status: EnterpriseStatus;
  label: string;
  icon?: ReactNode;
};

const styles: Record<EnterpriseStatus, { bg: string; fg: string }> = {
  ok: { bg: "var(--wc-ent-state-ok-bg)", fg: "var(--wc-ent-state-ok-fg)" },
  warn: { bg: "var(--wc-ent-state-warn-bg)", fg: "var(--wc-ent-state-warn-fg)" },
  err: { bg: "var(--wc-ent-state-err-bg)", fg: "var(--wc-ent-state-err-fg)" },
  info: { bg: "var(--wc-ent-state-info-bg)", fg: "var(--wc-ent-state-info-fg)" },
  neutral: { bg: "var(--wc-ent-state-neutral-bg)", fg: "var(--wc-ent-state-neutral-fg)" },
};

export default function EnterpriseStatusPill({
  status,
  label,
  icon,
}: EnterpriseStatusPillProps) {
  const { bg, fg } = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
      data-testid="enterprise-status-pill"
      data-status={status}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {label}
    </span>
  );
}
