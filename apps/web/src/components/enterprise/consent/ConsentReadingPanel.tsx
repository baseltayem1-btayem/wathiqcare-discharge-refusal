"use client";

import type { ConsentSectionViewModel, RiskSeverity } from "./types";

export type ConsentReadingPanelProps = {
  sections: ConsentSectionViewModel[];
  language: "en" | "ar";
  /** When true, renders English and Arabic side-by-side. Otherwise single language. */
  bilingual?: boolean;
  /** Optional caption shown above the body — usually template id + version. */
  caption?: { en: string; ar: string };
};

const SEVERITY_TONE: Record<
  RiskSeverity,
  { bg: string; fg: string; border: string; label: { en: string; ar: string } }
> = {
  low: {
    bg: "var(--wc-ent-state-info-bg)",
    fg: "var(--wc-ent-state-info-fg)",
    border: "var(--wc-ent-state-info-fg)",
    label: { en: "Low", ar: "منخفض" },
  },
  moderate: {
    bg: "var(--wc-ent-state-warn-bg)",
    fg: "var(--wc-ent-state-warn-fg)",
    border: "var(--wc-ent-state-warn-fg)",
    label: { en: "Moderate", ar: "متوسط" },
  },
  high: {
    bg: "var(--wc-ent-state-err-bg)",
    fg: "var(--wc-ent-state-err-fg)",
    border: "var(--wc-ent-state-err-fg)",
    label: { en: "High", ar: "مرتفع" },
  },
  critical: {
    bg: "var(--wc-ent-state-err-bg)",
    fg: "var(--wc-ent-state-err-fg)",
    border: "var(--wc-ent-state-err-fg)",
    label: { en: "Critical", ar: "حرج" },
  },
};

/**
 * Phase 12.2 — dense, tablet-optimized reading panel for informed-consent
 * body content. Renders sections, paragraphs, bullets, risk blocks (with
 * severity badges), and declarations. Supports single-language or
 * side-by-side bilingual layouts.
 *
 * Preview-only. Reads from a view-model. Does not call any signing or
 * persistence APIs.
 */
export default function ConsentReadingPanel({
  sections,
  language,
  bilingual = false,
  caption,
}: ConsentReadingPanelProps) {
  const isAr = language === "ar";

  return (
    <article
      className="wc-ent-card"
      style={{ border: "var(--wc-ent-border)", background: "#ffffff" }}
      data-testid="consent-reading-panel"
      data-bilingual={bilingual ? "true" : "false"}
    >
      {caption ? (
        <header
          className="border-b px-4 py-2"
          style={{ borderColor: "var(--wc-ent-surface-ribbon-border)", background: "#f6f8fb" }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--wc-ent-fg-muted)" }}
          >
            {isAr ? "وثيقة الموافقة المستنيرة" : "Informed Consent Document"}
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--wc-ent-fg-strong)" }}>
            {isAr ? caption.ar : caption.en}
          </div>
        </header>
      ) : null}

      <div
        className="grid gap-4 px-4 py-4"
        style={{
          maxWidth: bilingual ? "100%" : "76ch",
          marginInline: bilingual ? undefined : "auto",
        }}
      >
        {sections.map((section, index) => (
          <section
            key={section.id}
            data-section-id={section.id}
            className="space-y-2"
            style={{
              paddingTop: index === 0 ? 0 : "var(--wc-ent-space-3)",
              borderTop:
                index === 0
                  ? undefined
                  : "1px dashed var(--wc-ent-surface-ribbon-border)",
            }}
          >
            <h3
              className="text-[13px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--wc-ent-fg-strong)" }}
            >
              {bilingual ? (
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span dir="ltr">{section.title.en}</span>
                  <span
                    className="text-[11px] font-normal normal-case"
                    style={{ color: "var(--wc-ent-fg-muted)" }}
                    dir="rtl"
                  >
                    {section.title.ar}
                  </span>
                </span>
              ) : isAr ? (
                section.title.ar
              ) : (
                section.title.en
              )}
            </h3>

            {section.paragraphs?.map((p, pi) => (
              <BilingualBlock
                key={`${section.id}-p-${pi}`}
                en={p.en}
                ar={p.ar}
                language={language}
                bilingual={bilingual}
              />
            ))}

            {section.bullets && section.bullets.length > 0 ? (
              <ul className="space-y-2">
                {section.bullets.map((b) => (
                  <li
                    key={b.id}
                    className="rounded px-3 py-2"
                    style={{ background: "#f9fbfd", border: "var(--wc-ent-border)" }}
                  >
                    {b.label ? (
                      <div
                        className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: "var(--wc-ent-fg-muted)" }}
                      >
                        {bilingual ? (
                          <span className="flex flex-wrap gap-x-3">
                            <span dir="ltr">{b.label.en}</span>
                            <span dir="rtl">{b.label.ar}</span>
                          </span>
                        ) : isAr ? (
                          b.label.ar
                        ) : (
                          b.label.en
                        )}
                      </div>
                    ) : null}
                    <BilingualBlock
                      en={b.text.en}
                      ar={b.text.ar}
                      language={language}
                      bilingual={bilingual}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {section.riskBlocks && section.riskBlocks.length > 0 ? (
              <div className="grid gap-2" data-testid={`risk-blocks-${section.id}`}>
                {section.riskBlocks.map((r) => {
                  const tone = SEVERITY_TONE[r.severity];
                  return (
                    <div
                      key={r.id}
                      className="rounded border-s-4 px-3 py-2"
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        borderInlineStartColor: tone.border,
                        borderTop: "1px solid rgba(0,0,0,0.04)",
                        borderRight: "1px solid rgba(0,0,0,0.04)",
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                      }}
                      data-risk-severity={r.severity}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                        <span
                          className="rounded px-1.5 py-0.5"
                          style={{ background: "rgba(0,0,0,0.08)" }}
                        >
                          {isAr ? tone.label.ar : tone.label.en}
                        </span>
                        <span className="opacity-70">
                          {isAr ? "خطر" : "Risk"} · {r.id}
                        </span>
                      </div>
                      <BilingualBlock
                        en={r.en}
                        ar={r.ar}
                        language={language}
                        bilingual={bilingual}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {section.declarations && section.declarations.length > 0 ? (
              <ol
                className="list-decimal space-y-1.5 ps-5 text-[13px] leading-relaxed"
                style={{ color: "var(--wc-ent-fg-strong)" }}
              >
                {section.declarations.map((d) => (
                  <li key={d.id} data-declaration-id={d.id}>
                    <BilingualBlock
                      en={d.en}
                      ar={d.ar}
                      language={language}
                      bilingual={bilingual}
                    />
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}

function BilingualBlock({
  en,
  ar,
  language,
  bilingual,
}: {
  en: string;
  ar: string;
  language: "en" | "ar";
  bilingual: boolean;
}) {
  if (!bilingual) {
    return (
      <p
        className="wc-ent-break text-[13px] leading-relaxed"
        style={{ color: "var(--wc-ent-fg-strong)" }}
      >
        {language === "ar" ? ar : en}
      </p>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <p
        dir="ltr"
        className="wc-ent-break text-[13px] leading-relaxed"
        style={{ color: "var(--wc-ent-fg-strong)" }}
      >
        {en}
      </p>
      <p
        dir="rtl"
        className="wc-ent-break text-[13px] leading-relaxed"
        style={{
          color: "var(--wc-ent-fg-strong)",
          borderInlineStart: "1px dashed var(--wc-ent-surface-ribbon-border)",
          paddingInlineStart: "0.75rem",
        }}
      >
        {ar}
      </p>
    </div>
  );
}
