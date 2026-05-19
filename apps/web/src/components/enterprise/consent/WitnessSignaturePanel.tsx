"use client";

import type { ReactNode } from "react";

export type WitnessSignatureState = {
  witnessName: string;
  witnessRole: string;
  witnessIdNumber: string;
  signed: boolean;
  signedAt?: string;
};

export type WitnessSignaturePanelProps = {
  language: "en" | "ar";
  value: WitnessSignatureState;
  onChange: (next: WitnessSignatureState) => void;
  trailing?: ReactNode;
};

const STRINGS = {
  en: {
    title: "Witness Signature",
    subtitle: "Independent staff confirmation",
    witnessName: "Witness full name",
    witnessRole: "Role / position",
    witnessId: "Staff ID",
    declaration:
      "I confirm that I personally witnessed the patient (or legal representative) sign this consent form voluntarily, after they were given the opportunity to ask questions.",
    sign: "Confirm witness signature",
    signed: "Witness confirmed",
    revoke: "Revoke confirmation",
    signedAt: "Confirmed at",
  },
  ar: {
    title: "توقيع الشاهد",
    subtitle: "تأكيد مستقل من الكادر",
    witnessName: "الاسم الكامل للشاهد",
    witnessRole: "المسمى الوظيفي",
    witnessId: "الرقم الوظيفي",
    declaration:
      "أؤكد أنني شخصياً قد شهدت توقيع المريض (أو ممثله النظامي) على هذه الموافقة بإرادته الحرة، بعد أن أُتيحت له الفرصة لطرح الأسئلة.",
    sign: "تأكيد توقيع الشاهد",
    signed: "تم تأكيد الشاهد",
    revoke: "إلغاء التأكيد",
    signedAt: "تم التأكيد في",
  },
} as const;

/**
 * Witness signature panel — preview-only UI shell.
 * Mirrors the production `witnessSigned` boolean gate (which currently
 * has placeholder UX) with a fuller form pattern that captures the
 * witness identity and a single-tap confirm. No server action invoked.
 */
export default function WitnessSignaturePanel({
  language,
  value,
  onChange,
  trailing,
}: WitnessSignaturePanelProps) {
  const s = STRINGS[language];
  const isAr = language === "ar";

  const handleSign = () => {
    onChange({
      ...value,
      signed: true,
      signedAt: new Date().toISOString(),
    });
  };

  const handleRevoke = () => {
    onChange({ ...value, signed: false, signedAt: undefined });
  };

  return (
    <section
      className="wc-ent-card"
      style={{ border: "var(--wc-ent-border)" }}
      data-testid="witness-signature-panel"
      data-signed={value.signed ? "true" : "false"}
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
        <TextField
          label={s.witnessName}
          value={value.witnessName}
          onChange={(v) => onChange({ ...value, witnessName: v })}
          dir={isAr ? "rtl" : "ltr"}
          disabled={value.signed}
        />
        <TextField
          label={s.witnessRole}
          value={value.witnessRole}
          onChange={(v) => onChange({ ...value, witnessRole: v })}
          dir={isAr ? "rtl" : "ltr"}
          disabled={value.signed}
        />
        <TextField
          label={s.witnessId}
          value={value.witnessIdNumber}
          onChange={(v) => onChange({ ...value, witnessIdNumber: v })}
          dir="ltr"
          mono
          disabled={value.signed}
        />
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

      <div className="flex items-center justify-between gap-3 border-t px-3 py-2"
        style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
      >
        {value.signed ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className="rounded px-2 py-1 font-semibold"
              style={{
                background: "var(--wc-ent-state-ok-bg)",
                color: "var(--wc-ent-state-ok-fg)",
              }}
              data-testid="witness-signed-pill"
            >
              ✓ {s.signed}
            </span>
            {value.signedAt ? (
              <span style={{ color: "var(--wc-ent-fg-muted)" }}>
                {s.signedAt}: <bdi dir="ltr">{value.signedAt}</bdi>
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleRevoke}
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--wc-ent-surface-ribbon-border)",
                color: "var(--wc-ent-fg-strong)",
              }}
              data-testid="witness-revoke-button"
            >
              {s.revoke}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSign}
            disabled={!value.witnessName || !value.witnessIdNumber}
            className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{
              background: "var(--wc-ent-state-info-bg)",
              color: "var(--wc-ent-state-info-fg)",
              border: "var(--wc-ent-border)",
            }}
            data-testid="witness-sign-button"
          >
            {s.sign}
          </button>
        )}
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  dir,
  mono,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir: "ltr" | "rtl";
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--wc-ent-fg-muted)" }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        dir={dir}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border px-2 py-1.5 text-sm disabled:bg-slate-50 ${mono ? "font-mono" : ""}`}
        style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
      />
    </label>
  );
}
