/**
 * Legal-Grade Consent Design System — Spacing Tokens
 * Isolated. Used only by preview renderer.
 */

export const CONSENT_SPACING = {
  pageMarginTop: "18mm",
  pageMarginBottom: "20mm",
  pageMarginInline: "16mm",

  sectionGap: "16px",
  sectionGapPrint: "12pt",
  blockGap: "10px",
  inlineGap: "8px",

  shellPadding: "28px",
  shellPaddingPrint: "0",
  shellRadius: "10px",

  signatureBlockGap: "22px",
  signatureMinHeight: "70px",

  riskRowGap: "8px",
  riskPadding: "10px 14px",
} as const;

export type ConsentSpacing = typeof CONSENT_SPACING;
