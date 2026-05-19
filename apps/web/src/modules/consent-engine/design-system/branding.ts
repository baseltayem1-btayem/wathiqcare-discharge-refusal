/**
 * Legal-Grade Consent Design System — Branding Tokens
 *
 * WathiqCare™ / IMC-compatible branding for medico-legal preview rendering.
 * Subtle, professional, hospital-grade. No hardcoded external assets.
 */

export const CONSENT_BRANDING = {
  productName: "WathiqCare™",
  productTagline: "Enterprise Medico-Legal Consent Platform",
  productTaglineAr: "منصة مؤسسية للموافقات الطبية القانونية",

  partnerLabel: "International Medical Center",
  partnerLabelAr: "المركز الطبي الدولي",
  partnerShort: "IMC",

  // Inline SVG logo mark (no external network assets)
  logoMarkSvg: `<svg viewBox="0 0 48 48" width="36" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="2" y="2" width="44" height="44" rx="10" fill="#0b3d63"/>
  <path d="M14 32 V16 h4 l6 10 6-10 h4 v16 h-4 v-9 l-5 8 h-2 l-5-8 v9 z" fill="#ffffff"/>
</svg>`,

  documentClassification: "MEDICO-LEGAL DOCUMENT",
  documentClassificationAr: "وثيقة طبية قانونية",

  evidenceFooter: "Evidence-Ready • Chain-of-Custody Protected",
  evidenceFooterAr: "جاهز كدليل قانوني — محمي بسلسلة الإسناد",
} as const;

export type ConsentBranding = typeof CONSENT_BRANDING;
