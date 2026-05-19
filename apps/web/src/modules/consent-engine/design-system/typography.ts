/**
 * Legal-Grade Consent Design System — Typography Tokens
 *
 * Isolated, feature-gated tokens used ONLY by the dynamic consent preview
 * renderer. Does NOT affect the production renderer or any existing styles.
 */

export const CONSENT_TYPOGRAPHY = {
  fontStackLatin:
    "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, system-ui, sans-serif",
  fontStackArabic:
    "'Noto Naskh Arabic', 'Amiri', 'Tahoma', 'Geeza Pro', 'Segoe UI', sans-serif",
  fontStackSerifLegal:
    "'Source Serif Pro', 'Charter', 'Georgia', 'Times New Roman', serif",
  fontStackMonospaceAudit:
    "'JetBrains Mono', 'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace",

  // Hierarchy
  documentTitleEn: { size: "22px", lineHeight: "1.25", weight: 700, letterSpacing: "-0.01em" },
  documentTitleAr: { size: "22px", lineHeight: "1.6", weight: 700 },
  sectionHeadingEn: { size: "14px", lineHeight: "1.35", weight: 700, letterSpacing: "0.04em" },
  sectionHeadingAr: { size: "15px", lineHeight: "1.7", weight: 700 },
  bodyEn: { size: "12.5px", lineHeight: "1.65", weight: 400 },
  bodyAr: { size: "13.5px", lineHeight: "1.95", weight: 400 },
  legalEmphasis: { size: "12.5px", lineHeight: "1.6", weight: 600 },
  declarationBlock: { size: "12.5px", lineHeight: "1.7", weight: 500 },
  metaCaption: { size: "10.5px", lineHeight: "1.4", weight: 500, letterSpacing: "0.05em" },
  auditCaption: { size: "9.5px", lineHeight: "1.4", weight: 500 },
} as const;

export type ConsentTypography = typeof CONSENT_TYPOGRAPHY;
