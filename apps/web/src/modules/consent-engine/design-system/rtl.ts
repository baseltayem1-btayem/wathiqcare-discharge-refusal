/**
 * Legal-Grade Consent Design System — RTL/LTR Layout Tokens
 *
 * Provides direction-aware utilities for bilingual rendering.
 * No runtime side effects.
 */

export type ConsentDirection = "ltr" | "rtl";

export interface BilingualPair {
  en: string;
  ar: string;
}

export function pickPrimaryDirection(
  language: "ar" | "en" | "bilingual",
): ConsentDirection {
  if (language === "ar") return "rtl";
  return "ltr";
}

export function shouldRenderEnglish(
  language: "ar" | "en" | "bilingual",
): boolean {
  return language === "en" || language === "bilingual";
}

export function shouldRenderArabic(
  language: "ar" | "en" | "bilingual",
): boolean {
  return language === "ar" || language === "bilingual";
}

/**
 * Bilingual grid: side-by-side EN/AR when language=bilingual,
 * single column when only one language is selected.
 */
export function bilingualGridColumns(
  language: "ar" | "en" | "bilingual",
): string {
  if (language === "bilingual") return "1fr 1fr";
  return "1fr";
}
