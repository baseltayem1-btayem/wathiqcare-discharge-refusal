/**
 * Patient secure signing journey — server contract types and helpers.
 *
 * Mirrors the payloads returned by the public-signing API and shared
 * across the redesigned patient journey components.
 */
import type { ClinicalKnowledgeIllustration } from "@/lib/clinical-knowledge/types";

export type Lang = "ar" | "en";

export type Bootstrap = {
  documentId: string;
  moduleType: "INFORMED_CONSENT" | "DISCHARGE_REFUSAL" | "LEGAL_CONSENT" | string;
  signerRole: "PATIENT" | "GUARDIAN" | string;
  facilityName?: string | null;
  templateTitleAr?: string | null;
  templateTitleEn?: string | null;
  approvedPdfUrl?: string | null;
  approvedContentAvailable?: boolean;
  locale?: "ar" | "en" | "bilingual" | string | null;
  educationRequired?: boolean;
  maskedMobile?: string | null;
  otpRequiredAt?: string | null;
};

export type Section = {
  id: string;
  sectionKey?: string;
  sectionKind?: string;
  titleAr?: string | null;
  titleEn?: string | null;
  contentAr?: string | null;
  contentEn?: string | null;
};

export type EducationFaq = {
  questionAr?: string | null;
  questionEn?: string | null;
  answerAr?: string | null;
  answerEn?: string | null;
};

export type EducationListItem = { ar?: string | null; en?: string | null };

export type EducationPayload = {
  required?: boolean;
  packageId?: string | null;
  packageKey?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  versionId?: string | null;
  versionLabel?: string | null;
  summary?: { ar?: string | null; en?: string | null } | null;
  risks?: EducationListItem[] | null;
  benefits?: EducationListItem[] | null;
  faq?: EducationFaq[] | null;
  preProcedureInstructions?: EducationListItem[] | null;
  postProcedureInstructions?: EducationListItem[] | null;
  completed?: boolean;
  patientAcknowledged?: boolean;
};

export type DecisionPayload = {
  status?: "UNDECIDED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED" | string;
  consentPresentedAt?: string | null;
  selectedAt?: string | null;
  refusalAcknowledged?: boolean;
  refusalAcknowledgedAt?: string | null;
  refusalForm?: {
    statementAr?: string | null;
    statementEn?: string | null;
    acknowledgementAr?: string | null;
    acknowledgementEn?: string | null;
    formHash?: string | null;
  } | null;
};

export type FullDocument = {
  documentId: string;
  consentReference?: string | null;
  status?: string;
  signerRole?: string;
  patientName?: string | null;
  patientMrn?: string | null;
  mrn?: string | null;
  physicianName?: string | null;
  diagnosis?: string | null;
  plannedProcedure?: string | null;
  templateTitleAr?: string | null;
  templateTitleEn?: string | null;
  approvedPdfUrl?: string | null;
  approvedContentAvailable?: boolean;
  versionLabel?: string | null;
  facilityName?: string | null;
  sections?: Section[];
  legalTextAr?: string | null;
  legalTextEn?: string | null;
  pdplTextAr?: string | null;
  pdplTextEn?: string | null;
  signatureCaptured?: boolean;
  decision?: DecisionPayload | null;
  education?: EducationPayload | null;
  illustrations?: ClinicalKnowledgeIllustration[];
};

export type DocumentResponse =
  | { phase: "pre-otp"; bootstrap: Bootstrap }
  | (FullDocument & { phase?: undefined });

export type SignatureResult = {
  documentId: string;
  signatureId: string;
  status: string;
  signerName: string;
  signedAt: string;
  evidence?: {
    documentHash?: string | null;
    otpHash?: string | null;
    educationCompleted?: boolean;
    patientAcknowledged?: boolean;
    decisionStatus?: string;
  } | null;
};

export type PatientScreen =
  | "review"
  | "otp"
  | "language"
  | "education"
  | "disclosures"
  | "acknowledgement"
  | "signature"
  | "confirmation"
  | "refusal-ack"
  | "refusal-signature"
  | "refusal-confirmed";

function containsArabicGlyphs(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

export function looksCorruptedArabic(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (containsArabicGlyphs(trimmed)) return false;
  return /^[?\s\-_/\\().,:;!%0-9A-Za-z]+$/.test(trimmed) && trimmed.includes("?");
}

export function resolveProcedureTitles(args: {
  titleAr?: string | null;
  titleEn?: string | null;
  plannedProcedure?: string | null;
}): { ar: string; en: string } {
  const english = args.titleEn?.trim() || args.plannedProcedure?.trim() || "";
  const rawArabic = args.titleAr?.trim() || "";
  const normalizedEnglish = english.toLowerCase();

  let resolvedArabic = !looksCorruptedArabic(rawArabic) ? rawArabic : "";

  if (!resolvedArabic && normalizedEnglish.includes("icu and critical care consent")) {
    resolvedArabic = "موافقة العناية المركزة والعلاج الحرج";
  }

  return {
    ar: resolvedArabic || english,
    en: english || resolvedArabic,
  };
}

export function pickLocalized(
  lang: Lang,
  ar?: string | null,
  en?: string | null,
): string {
  const isAr = lang === "ar";
  if (isAr) return (ar?.trim() || en?.trim() || "").toString();
  return (en?.trim() || ar?.trim() || "").toString();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = text ? JSON.parse(text) : null;
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      /* ignore */
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function formatTimestamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function shortHash(s?: string | null): string {
  if (!s) return "—";
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}
