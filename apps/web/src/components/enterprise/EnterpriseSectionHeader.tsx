"use client";

import type { ReactNode } from "react";
import EnterpriseStatusPill, {
  type EnterpriseStatus,
} from "./EnterpriseStatusPill";

export type EnterpriseSectionHeaderProps = {
  title: string;
  subtitle?: string;
  status?: { label: string; tone: EnterpriseStatus };
  actions?: ReactNode;
};

export default function EnterpriseSectionHeader({
  title,
  subtitle,
  status,
  actions,
}: EnterpriseSectionHeaderProps) {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b pb-2"
      data-testid="enterprise-section-header"
    >
      <div>
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--wc-ent-fg-strong)" }}
          >
            {title}
          </h3>
          {status ? (
            <EnterpriseStatusPill status={status.tone} label={status.label} />
          ) : null}
        </div>
        {subtitle ? (
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--wc-ent-fg-muted)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
