"use client";

import type { ReactNode } from "react";

export type PhysicianAcknowledgmentCardProps = {
  language: "en" | "ar";
  physicianName: string;
  licenseNumber?: string;
  department?: string;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
  trailing?: ReactNode;
};

const STRINGS = {
  en: {
    title: "Physician Acknowledgment",
    subtitle: "Treating physician confirms patient understanding",
    declaration:
      "I confirm that I have personally explained the diagnosis, the proposed procedure, its benefits, the material risks, the available alternatives, and the consequences of refusal to the patient (or their legal representative) in a language they understand, and have answered their questions to their satisfaction.",
    checkbox: "I confirm the above statement.",
    physician: "Treating physician",
    license: "License #",
    department: "Department",
  },
  ar: {
    title: "إقرار الطبيب المعالج",
    subtitle: "يؤكد الطبيب المعالج فهم المريض",
    declaration:
      "أقر بأنني قد شرحت شخصياً للمريض (أو لممثله النظامي) التشخيص والإجراء المقترح وفوائده والمخاطر الجوهرية والبدائل المتاحة وعواقب الرفض، وذلك بلغة يفهمها، وأجبت على أسئلته بما يرضيه.",
    checkbox: "أقر بصحة البيان أعلاه.",
    physician: "الطبيب المعالج",
    license: "رقم الترخيص",
    department: "القسم",
  },
} as const;

/**
 * Physician acknowledgment card — preview-only UI shell.
 * Mirrors the production `physicianConfirmed` boolean gate without
 * invoking any server action.
 */
export default function PhysicianAcknowledgmentCard({
  language,
  physicianName,
  licenseNumber,
  department,
  confirmed,
  onConfirmedChange,
  trailing,
}: PhysicianAcknowledgmentCardProps) {
  const s = STRINGS[language];

  return (
    <section
      className="wc-ent-card"
      style={{ border: "var(--wc-ent-border)" }}
      data-testid="physician-acknowledgment-card"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <header
        className="flex items-start justify-between gap-3 border-b px-3 py-2"
        style={{ borderColor: "var(--wc-ent-surface-ribbon-border)", background: "#f6f8fb" }}
      >
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--wc-ent-fg-muted)" }}
          >
            {s.subtitle}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--wc-ent-fg-strong)" }}>
            {s.title}
          </div>
        </div>
        {trailing ? <div>{trailing}</div> : null}
      </header>

      <div className="grid gap-3 p-3 md:grid-cols-3">
        <Field label={s.physician} value={physicianName} />
        <Field label={s.license} value={licenseNumber ?? "—"} mono />
        <Field label={s.department} value={department ?? "—"} />
      </div>

      <div
        className="mx-3 mb-3 rounded px-3 py-2 text-[13px] leading-relaxed"
        style={{
          background: "#f9fbfd",
          border: "var(--wc-ent-border)",
          color: "var(--wc-ent-fg-strong)",
        }}
      >
        {s.declaration}
      </div>

      <label
        className="mx-3 mb-3 flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-xs"
        style={{
          background: confirmed
            ? "var(--wc-ent-state-ok-bg)"
            : "var(--wc-ent-state-neutral-bg)",
          color: confirmed
            ? "var(--wc-ent-state-ok-fg)"
            : "var(--wc-ent-state-neutral-fg)",
          border: "var(--wc-ent-border)",
        }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="h-4 w-4"
          data-testid="physician-acknowledgment-checkbox"
        />
        <span className="font-semibold">{s.checkbox}</span>
      </label>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--wc-ent-fg-muted)" }}
      >
        {label}
      </div>
      <div
        className={`text-sm ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--wc-ent-fg-strong)" }}
      >
        <bdi dir="ltr">{value}</bdi>
      </div>
    </div>
  );
}
