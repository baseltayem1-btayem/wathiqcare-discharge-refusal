export interface PdfFontRegistration {
  family: string;
  weights: readonly number[];
  placeholder: true;
  notes: string;
}

export const PDF_FONT_PLACEHOLDERS: readonly PdfFontRegistration[] = [
  {
    family: "Noto Sans Arabic",
    weights: [400, 500, 700],
    placeholder: true,
    notes: "Register when server-side font assets are approved and available.",
  },
  {
    family: "Cairo",
    weights: [400, 600, 700],
    placeholder: true,
    notes: "Use for Arabic-first branded headings when font assets exist.",
  },
  {
    family: "IBM Plex Sans Arabic",
    weights: [400, 500, 700],
    placeholder: true,
    notes: "Fallback enterprise Arabic sans family placeholder.",
  },
];

export function getPdfFontStack(language: "ar" | "en"): string {
  if (language === "ar") {
    return '"Noto Sans Arabic", "Cairo", "IBM Plex Sans Arabic", "Tahoma", sans-serif';
  }

  return '"Segoe UI", Arial, sans-serif';
}

export function getPdfFontRegistrationPlan(): readonly PdfFontRegistration[] {
  return PDF_FONT_PLACEHOLDERS;
}