/**
 * Legal-Grade Consent — Stylesheet Builder
 *
 * Generates a deterministic CSS stylesheet from design-system tokens.
 * Pure function. No side effects.
 */

import {
  CONSENT_COLORS,
  CONSENT_PRINT,
  CONSENT_SPACING,
  CONSENT_TYPOGRAPHY,
} from "@/modules/consent-engine/design-system";

export function buildLegalGradeStylesheet(): string {
  const t = CONSENT_TYPOGRAPHY;
  const c = CONSENT_COLORS;
  const s = CONSENT_SPACING;
  const p = CONSENT_PRINT;

  return `
  :root {
    --lg-font-latin: ${t.fontStackLatin};
    --lg-font-arabic: ${t.fontStackArabic};
    --lg-font-serif: ${t.fontStackSerifLegal};
    --lg-font-mono: ${t.fontStackMonospaceAudit};
    --lg-color-page: ${c.pageBackground};
    --lg-color-surface: ${c.documentSurface};
    --lg-color-border: ${c.documentBorder};
    --lg-color-text: ${c.textPrimary};
    --lg-color-text-secondary: ${c.textSecondary};
    --lg-color-text-muted: ${c.textMuted};
    --lg-color-rule-strong: ${c.ruleStrong};
    --lg-color-rule-medium: ${c.ruleMedium};
    --lg-color-rule-soft: ${c.ruleSoft};
    --lg-color-brand: ${c.brandPrimary};
    --lg-color-brand-accent: ${c.brandAccent};
    --lg-color-audit-bg: ${c.auditBackground};
    --lg-color-audit-border: ${c.auditBorder};
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: var(--lg-font-latin);
    color: var(--lg-color-text);
    background: var(--lg-color-page);
    font-size: ${t.bodyEn.size};
    line-height: ${t.bodyEn.lineHeight};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  main.lg-page { max-width: 210mm; margin: 24px auto; padding: 0 12px; }

  .lg-document {
    background: var(--lg-color-surface);
    border: 1px solid var(--lg-color-border);
    border-radius: ${s.shellRadius};
    box-shadow: ${c.documentShadow};
    padding: ${s.shellPadding};
  }

  /* Header */
  .lg-header { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; padding-bottom: 14px; border-bottom: 2px solid var(--lg-color-rule-strong); }
  .lg-brand { display: flex; align-items: center; gap: 10px; }
  .lg-brand-text { display: flex; flex-direction: column; line-height: 1.15; }
  .lg-brand-product { font-weight: 700; font-size: 14px; color: var(--lg-color-brand); letter-spacing: -0.01em; }
  .lg-brand-partner { font-size: 10.5px; color: var(--lg-color-text-muted); letter-spacing: 0.06em; text-transform: uppercase; }
  .lg-classification { font-size: ${t.metaCaption.size}; letter-spacing: ${t.metaCaption.letterSpacing}; color: var(--lg-color-text-muted); text-transform: uppercase; text-align: center; }
  .lg-classification strong { display: block; color: var(--lg-color-brand); font-weight: 700; }
  .lg-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  .lg-badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--lg-color-rule-medium); color: var(--lg-color-text-secondary); background: #fbfcfd; letter-spacing: 0.04em; text-transform: uppercase; }
  .lg-badge-specialty { border-color: var(--lg-color-brand-accent); color: var(--lg-color-brand-accent); }

  /* Document title */
  .lg-title-block { display: grid; gap: 4px; padding: 18px 0 12px; border-bottom: 1px solid var(--lg-color-rule-soft); margin-bottom: 14px; }
  .lg-title-en { font-family: var(--lg-font-serif); font-size: ${t.documentTitleEn.size}; line-height: ${t.documentTitleEn.lineHeight}; font-weight: ${t.documentTitleEn.weight}; letter-spacing: ${t.documentTitleEn.letterSpacing}; color: var(--lg-color-text); margin: 0; }
  .lg-title-ar { font-family: var(--lg-font-arabic); font-size: ${t.documentTitleAr.size}; line-height: ${t.documentTitleAr.lineHeight}; font-weight: ${t.documentTitleAr.weight}; color: var(--lg-color-text); margin: 0; text-align: right; direction: rtl; }

  /* Metadata grid */
  .lg-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; padding: 10px 0 0; }
  .lg-meta-cell { display: flex; flex-direction: column; }
  .lg-meta-label { font-size: 9.5px; color: var(--lg-color-text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
  .lg-meta-value { font-size: 12px; color: var(--lg-color-text); font-weight: 500; }

  /* Sections */
  .lg-section { margin-top: ${s.sectionGap}; padding-top: 12px; border-top: 1px solid var(--lg-color-rule-soft); page-break-inside: avoid; break-inside: avoid; }
  .lg-section-heading { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 12px; margin-bottom: 8px; }
  .lg-section-heading-en { font-size: ${t.sectionHeadingEn.size}; font-weight: ${t.sectionHeadingEn.weight}; letter-spacing: ${t.sectionHeadingEn.letterSpacing}; text-transform: uppercase; color: var(--lg-color-brand); margin: 0; }
  .lg-section-heading-ar { font-family: var(--lg-font-arabic); font-size: ${t.sectionHeadingAr.size}; font-weight: ${t.sectionHeadingAr.weight}; color: var(--lg-color-brand); margin: 0; text-align: right; direction: rtl; }
  .lg-section-num { display: inline-block; font-family: var(--lg-font-mono); font-size: 10px; color: var(--lg-color-text-muted); margin-right: 6px; }

  .lg-copy-grid { display: grid; gap: 10px 18px; }
  .lg-copy-grid.bilingual { grid-template-columns: 1fr 1fr; }
  .lg-copy-grid.single { grid-template-columns: 1fr; }
  .lg-copy-en { font-size: ${t.bodyEn.size}; line-height: ${t.bodyEn.lineHeight}; color: var(--lg-color-text); margin: 0; text-align: justify; }
  .lg-copy-ar { font-family: var(--lg-font-arabic); font-size: ${t.bodyAr.size}; line-height: ${t.bodyAr.lineHeight}; color: var(--lg-color-text); margin: 0; text-align: justify; direction: rtl; }

  /* Risks */
  .lg-risk-list { display: grid; gap: ${s.riskRowGap}; margin-top: 6px; padding: 0; list-style: none; }
  .lg-risk { padding: ${s.riskPadding}; border-radius: 4px; border: 1px solid var(--lg-color-rule-medium); background: #fbfcfd; page-break-inside: avoid; break-inside: avoid; }
  .lg-risk-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .lg-risk-title { font-weight: 700; font-size: 12.5px; color: var(--lg-color-text); }
  .lg-risk-title-ar { font-family: var(--lg-font-arabic); font-weight: 700; font-size: 13px; color: var(--lg-color-text); direction: rtl; }
  .lg-risk-severity { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 3px; border: 1px solid currentColor; text-transform: uppercase; }
  .lg-risk-desc { font-size: 11.5px; line-height: 1.55; color: var(--lg-color-text-secondary); margin: 0; }
  .lg-risk-desc-ar { font-family: var(--lg-font-arabic); font-size: 12.5px; line-height: 1.85; color: var(--lg-color-text-secondary); margin: 4px 0 0; direction: rtl; }

  .lg-sev-low { background: ${c.severityLow.bg}; border-color: ${c.severityLow.border}; }
  .lg-sev-low .lg-risk-severity { color: ${c.severityLow.text}; }
  .lg-sev-moderate { background: ${c.severityModerate.bg}; border-color: ${c.severityModerate.border}; }
  .lg-sev-moderate .lg-risk-severity { color: ${c.severityModerate.text}; }
  .lg-sev-high { background: ${c.severityHigh.bg}; border-color: ${c.severityHigh.border}; }
  .lg-sev-high .lg-risk-severity { color: ${c.severityHigh.text}; }
  .lg-sev-critical { background: ${c.severityCritical.bg}; border-color: ${c.severityCritical.border}; }
  .lg-sev-critical .lg-risk-severity { color: ${c.severityCritical.text}; font-weight: 800; }
  .lg-sev-critical .lg-risk-title { color: ${c.severityCritical.text}; }

  /* Numbered legal disclosures */
  .lg-legal-list { counter-reset: lg-legal; list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  .lg-legal-item { counter-increment: lg-legal; padding: 8px 12px 8px 36px; position: relative; border-left: 3px solid var(--lg-color-brand); background: #fafbfc; border-radius: 0 3px 3px 0; page-break-inside: avoid; break-inside: avoid; }
  .lg-legal-item::before { content: counter(lg-legal, decimal-leading-zero); position: absolute; left: 8px; top: 8px; font-family: var(--lg-font-mono); font-size: 11px; font-weight: 700; color: var(--lg-color-brand); }

  /* Declarations / acknowledgments */
  .lg-declaration { background: #fbfaf6; border: 1px solid #e2d9bf; border-left: 4px solid #a07f1f; padding: 12px 16px; margin-top: 12px; border-radius: 0 4px 4px 0; page-break-inside: avoid; break-inside: avoid; }
  .lg-declaration h4 { margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6a4f0d; }
  .lg-declaration p { margin: 0; font-size: 12px; line-height: 1.65; }

  /* Warning block (refusal / critical-risk highlight) */
  .lg-warning { background: ${c.severityCritical.bg}; border: 1px solid ${c.severityCritical.border}; border-left: 4px solid ${c.severityCritical.text}; color: ${c.severityCritical.text}; padding: 12px 16px; border-radius: 0 4px 4px 0; margin-top: 12px; page-break-inside: avoid; break-inside: avoid; }
  .lg-warning h4 { margin: 0 0 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .lg-warning p { margin: 0; font-size: 12px; line-height: 1.65; }

  /* Signatures */
  .lg-signatures { margin-top: 22px; page-break-inside: avoid; break-inside: avoid; }
  .lg-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: ${s.signatureBlockGap}; }
  .lg-signature-block { border: 1px solid var(--lg-color-rule-medium); border-radius: 4px; padding: 12px 14px; min-height: 110px; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; }
  .lg-signature-role { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--lg-color-brand); }
  .lg-signature-role-ar { font-family: var(--lg-font-arabic); font-size: 11px; font-weight: 700; color: var(--lg-color-brand); direction: rtl; }
  .lg-signature-name { font-size: 12.5px; font-weight: 600; color: var(--lg-color-text); }
  .lg-signature-line { border-bottom: 1px solid var(--lg-color-rule-strong); height: ${s.signatureMinHeight}; margin: 8px 0 4px; }
  .lg-signature-stamp { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9.5px; color: var(--lg-color-text-muted); }
  .lg-signature-stamp span { display: block; }
  .lg-signature-stamp strong { display: block; color: var(--lg-color-text-secondary); font-weight: 600; }

  /* Audit footer / QR placeholder */
  .lg-audit-footer { margin-top: 22px; padding: 14px 16px; background: var(--lg-color-audit-bg); border: 1px solid var(--lg-color-audit-border); border-radius: 6px; display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; page-break-inside: avoid; break-inside: avoid; }
  .lg-audit-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; font-family: var(--lg-font-mono); font-size: 9.5px; color: var(--lg-color-text-secondary); }
  .lg-audit-label { color: var(--lg-color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 8.5px; }
  .lg-audit-value { color: var(--lg-color-text); word-break: break-all; }
  .lg-qr-placeholder { width: 78px; height: 78px; border: 1px dashed var(--lg-color-audit-border); display: flex; align-items: center; justify-content: center; font-family: var(--lg-font-mono); font-size: 8.5px; color: var(--lg-color-text-muted); text-align: center; padding: 4px; background: #fff; border-radius: 4px; }

  .lg-evidence-strip { margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--lg-color-audit-border); display: flex; justify-content: space-between; gap: 12px; font-size: 9.5px; color: var(--lg-color-text-muted); }
  .lg-evidence-strip span { font-family: var(--lg-font-mono); }

  /* Print rules */
  @page { size: ${p.pageSize}; margin: ${p.pageMargin}; }
  @media print {
    body { background: #ffffff; }
    main.lg-page { margin: 0; padding: 0; max-width: 100%; }
    .lg-document { box-shadow: none; border: none; border-radius: 0; padding: 0; }
    .lg-section, .lg-risk, .lg-signature-block, .lg-audit-footer, .lg-declaration, .lg-warning, .lg-legal-item { page-break-inside: avoid; break-inside: avoid; }
    .lg-section-heading-en, .lg-section-heading-ar { page-break-after: avoid; break-after: avoid; }
    .lg-no-print { display: none !important; }
  }
  `;
}
