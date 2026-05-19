import type { PdfEvidenceLanguage } from "@/lib/pdf-engine/core/pdf-types";

export interface PdfLanguageLayoutFlags {
  language: PdfEvidenceLanguage;
  dir: "rtl" | "ltr";
  isRtl: boolean;
  isBilingual: boolean;
}

export function resolvePdfDirection(language: PdfEvidenceLanguage): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

export function isArabicText(value: string | null | undefined): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value ?? "");
}

export function normalizeArabicText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPdfLanguageLayoutFlags(
  language: PdfEvidenceLanguage,
  options: { isBilingual?: boolean } = {},
): PdfLanguageLayoutFlags {
  return {
    language,
    dir: resolvePdfDirection(language),
    isRtl: language === "ar",
    isBilingual: options.isBilingual ?? false,
  };
}