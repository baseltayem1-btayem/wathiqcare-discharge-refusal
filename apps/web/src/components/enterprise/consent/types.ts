/**
 * Phase 12.2 — preview-only types for composing the informed-consent
 * reading + signing experience inside the enterprise shell. These are
 * SHAPE-COMPATIBLE with the production consent-engine template (read
 * only) but live in the enterprise/consent namespace so production
 * components remain untouched.
 */

export type Bilingual = { en: string; ar: string };

export type RiskSeverity = "low" | "moderate" | "high" | "critical";

export type RiskItem = {
  id: string;
  severity: RiskSeverity;
  en: string;
  ar: string;
};

export type ConsentSectionViewModel = {
  id: string;
  title: Bilingual;
  /** Body paragraphs in the order they should render. */
  paragraphs?: Bilingual[];
  /** Labelled disclosure rows (used for benefits / risks / alternatives bullets). */
  bullets?: Array<{ id: string; label?: Bilingual; text: Bilingual }>;
  /** Risk blocks with severity tone. */
  riskBlocks?: RiskItem[];
  /** Acknowledgment statements the patient must agree to. */
  declarations?: Array<{ id: string; en: string; ar: string }>;
};

export type ConsentSignerStep =
  | "patient"
  | "witness"
  | "physician"
  | "otp";

export type ConsentSignerStatus =
  | "pending"
  | "in-progress"
  | "complete"
  | "skipped";

export type ConsentSignerProgressItem = {
  step: ConsentSignerStep;
  label: Bilingual;
  status: ConsentSignerStatus;
  actorName?: string;
  completedAt?: string;
};

export type MockOtpStatus =
  | "idle"
  | "sending"
  | "awaiting-code"
  | "verifying"
  | "verified"
  | "failed";
