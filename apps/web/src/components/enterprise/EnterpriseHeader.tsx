"use client";

import type { ReactNode } from "react";

export type EnterpriseHeaderProps = {
  title: string;
  subtitle?: string;
  patient?: {
    name: string;
    mrn?: string;
    nationalId?: string;
    department?: string;
  };
  actions?: ReactNode;
};

/**
 * Patient/case context header. Always-on identity strip that physicians
 * rely on in dense clinical surfaces to avoid wrong-patient errors.
 */
export default function EnterpriseHeader({
  title,
  subtitle,
  patient,
  actions,
}: EnterpriseHeaderProps) {
  return (
    <div
      className="flex w-full items-center justify-between gap-4 px-4"
      style={{ background: "var(--wc-ent-surface-header)" }}
      data-testid="enterprise-header"
    >
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--wc-ent-fg-strong)" }}>
            {title}
          </div>
          {subtitle ? (
            <div className="text-[11px]" style={{ color: "var(--wc-ent-fg-muted)" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {patient ? (
          <div
            className="flex items-center gap-3 rounded px-3 py-1.5"
            style={{
              border: "var(--wc-ent-border)",
              background: "#fafbfd",
              fontSize: "var(--wc-ent-font-sm)",
            }}
            data-testid="enterprise-header-patient"
          >
            <span className="font-semibold" style={{ color: "var(--wc-ent-fg-strong)" }}>
              {patient.name}
            </span>
            {patient.mrn ? (
              <span style={{ color: "var(--wc-ent-fg-muted)" }}>
                MRN <bdi dir="ltr">{patient.mrn}</bdi>
              </span>
            ) : null}
            {patient.nationalId ? (
              <span style={{ color: "var(--wc-ent-fg-muted)" }}>
                ID <bdi dir="ltr">{patient.nationalId}</bdi>
              </span>
            ) : null}
            {patient.department ? (
              <span style={{ color: "var(--wc-ent-fg-muted)" }}>{patient.department}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
