/**
 * Static screenshot capture manifest. No I/O, no automation.
 *
 * The manifest enumerates the visual artifacts the team should capture
 * manually (or via the existing internal preview surface) during a
 * Phase 6 validation pass. It is exposed via the internal validation
 * API and is also written to qa-screenshots/dynamic-consent/manifest.json.
 */

import type { SpecialtyDemoId } from "../legal-grade/specialty-demos";

export type ScreenshotSection =
  | "full-document"
  | "header"
  | "signature-zone"
  | "audit-footer"
  | "print-preview";

export type ScreenshotLanguage = "bilingual" | "ar" | "en";

export interface ScreenshotPlanItem {
  id: string;
  demo: SpecialtyDemoId;
  language: ScreenshotLanguage;
  section: ScreenshotSection;
  description: string;
  /** Suggested capture filename (no binary is checked in). */
  suggestedFilename: string;
}

export const SCREENSHOT_MANIFEST: ScreenshotPlanItem[] = [
  {
    id: "cardiology-bilingual-full",
    demo: "cardiology",
    language: "bilingual",
    section: "full-document",
    description: "Cardiology preview — bilingual EN+AR full document.",
    suggestedFilename: "cardiology-bilingual-full.png",
  },
  {
    id: "general-surgery-bilingual-full",
    demo: "general-surgery",
    language: "bilingual",
    section: "full-document",
    description: "General surgery preview — bilingual EN+AR full document.",
    suggestedFilename: "general-surgery-bilingual-full.png",
  },
  {
    id: "dama-bilingual-full",
    demo: "dama",
    language: "bilingual",
    section: "full-document",
    description: "DAMA refusal preview — bilingual EN+AR full document.",
    suggestedFilename: "dama-bilingual-full.png",
  },
  {
    id: "anesthesia-bilingual-full",
    demo: "anesthesia",
    language: "bilingual",
    section: "full-document",
    description: "Anesthesia preview — bilingual EN+AR full document.",
    suggestedFilename: "anesthesia-bilingual-full.png",
  },
  {
    id: "blood-transfusion-bilingual-full",
    demo: "blood-transfusion",
    language: "bilingual",
    section: "full-document",
    description: "Blood transfusion preview — bilingual EN+AR full document.",
    suggestedFilename: "blood-transfusion-bilingual-full.png",
  },
  {
    id: "orthopedics-bilingual-full",
    demo: "orthopedics",
    language: "bilingual",
    section: "full-document",
    description: "Orthopedics preview — bilingual EN+AR full document.",
    suggestedFilename: "orthopedics-bilingual-full.png",
  },
  {
    id: "cardiology-signature-zone",
    demo: "cardiology",
    language: "bilingual",
    section: "signature-zone",
    description: "Cardiology — signature zone close-up (patient + physician + witness).",
    suggestedFilename: "cardiology-signature-zone.png",
  },
  {
    id: "cardiology-audit-footer",
    demo: "cardiology",
    language: "bilingual",
    section: "audit-footer",
    description: "Cardiology — audit footer close-up (evidence id, hash, generated-at).",
    suggestedFilename: "cardiology-audit-footer.png",
  },
  {
    id: "cardiology-print-preview",
    demo: "cardiology",
    language: "bilingual",
    section: "print-preview",
    description: "Cardiology — browser print preview (Ctrl+P) to verify @page A4.",
    suggestedFilename: "cardiology-print-preview.png",
  },
  {
    id: "dama-arabic-only",
    demo: "dama",
    language: "ar",
    section: "full-document",
    description: "DAMA refusal preview — Arabic-only render (set ?language=ar).",
    suggestedFilename: "dama-arabic-only.png",
  },
  {
    id: "cardiology-english-only",
    demo: "cardiology",
    language: "en",
    section: "full-document",
    description: "Cardiology preview — English-only render (set ?language=en).",
    suggestedFilename: "cardiology-english-only.png",
  },
];

export function listScreenshotManifest(): ScreenshotPlanItem[] {
  return SCREENSHOT_MANIFEST.slice();
}
