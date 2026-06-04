import crypto from "node:crypto";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import type { Prisma } from "@prisma/client";
import puppeteer from "puppeteer";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ConsentRiskClass } from "@/lib/server/prisma-enums";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  collectArabicMojibakeDiagnostics,
  normalizeArabicForPatientFacingText,
} from "@/lib/server/arabic-mojibake-guard";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";

const prisma = () => getPrisma();
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";
const CORRUPTED_MARKER_REGEX = /[\u00d8\u00d9\u00db\u00c3\u00c2\u00e2]|\?{4,}/;
const NOT_PROVIDED = { ar: "\u063a\u064a\u0631 \u0645\u062f\u062e\u0644", en: "Not provided" };
const NOT_APPLICABLE = { ar: "\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642", en: "Not applicable" };
const FINAL_TITLE = {
  ar: "\u0646\u0645\u0648\u0630\u062c \u0645\u0648\u0627\u0641\u0642\u0629 \u0645\u0633\u062a\u0646\u064a\u0631\u0629 \u0646\u0647\u0627\u0626\u064a",
  en: "Final Informed Consent Form",
};
const PRODUCTION_RECORD_LABEL = "International Medical Center - Electronically Generated Consent Record";
const PRODUCTION_VERIFY_BASE_URL = "https://wathiqcare.online";
const FINAL_SIGNING_STATEMENT = {
  ar: "\u062a\u0645 \u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u064b\u0627 \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0648\u0627\u062b\u0642 \u0643\u064a\u0631",
  en: "Electronically Signed via Wathiq Care System",
};
const PDPL_CONSENT_AR_FALLBACK = "أوافق على استخدام ومعالجة معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، ووفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.";
const PDPL_CONSENT_EN_FALLBACK = "I consent to the use and processing of my personal health information as required for treatment and healthcare delivery.";
const PDPL_PURPOSES_AR_FALLBACK = "تقتصر معالجة معلوماتي الصحية على ما يلزم لأغراض العلاج والتوثيق الطبي والعمليات الصحية ذات الصلة.";
const PDPL_PURPOSES_EN_FALLBACK = "My health information may be processed only for treatment, medical documentation, and related healthcare operations.";
const PDPL_COMPLIANCE_AR_FALLBACK = "تتم معالجة المعلومات الصحية وفقًا لنظام حماية البيانات الشخصية واللوائح الصحية المعمول بها في المملكة العربية السعودية.";
const PDPL_COMPLIANCE_EN_FALLBACK = "The processing of health information is governed by the Personal Data Protection Law and applicable Saudi healthcare regulations.";
const NO_GUARANTEE_AR_FALLBACK = "أفهم أنه لا يمكن ضمان نتيجة محددة للإجراء أو العلاج.";
const NO_GUARANTEE_EN_FALLBACK = "I understand that no specific outcome can be guaranteed for the procedure or treatment.";
const PHYSICIAN_CERT_AR_FALLBACK = "إقرار الطبيب: أقر أنا الطبيب أو الممارس الصحي الموقع أدناه بأنني قمت بشرح الحالة الطبية للمريض وطبيعة الإجراء المقترح والفوائد والمخاطر والمضاعفات المحتملة والبدائل العلاجية ومخاطر رفض العلاج للمريض أو لممثله النظامي بصورة واضحة ومفهومة، وأجبت على جميع الاستفسارات المطروحة وفقًا للأصول المهنية والطبية المتعارف عليها.";
const PHYSICIAN_CERT_EN_FALLBACK = "Physician Certification: I, the undersigned physician or healthcare practitioner, certify that I have explained to the patient or the patient's legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.";
const PHYSICIAN_CERT_CONDITION_AR = "أقر بأنني شرحت للمريض أو لممثله النظامي الحالة الطبية وطبيعة الإجراء المقترح بصورة واضحة ومفهومة.";
const PHYSICIAN_CERT_CONDITION_EN = "I certify that I explained the medical condition and the nature of the proposed procedure in a clear and understandable manner.";
const PHYSICIAN_CERT_RISKS_AR = "أقر بأنني شرحت الفوائد المتوقعة والمخاطر والمضاعفات المحتملة والبدائل العلاجية ومخاطر رفض العلاج.";
const PHYSICIAN_CERT_RISKS_EN = "I certify that I explained the expected benefits, potential risks and complications, treatment alternatives, and the risks of refusing treatment.";
const PHYSICIAN_CERT_QUESTIONS_AR = "أقر بأنني أجبت على جميع الاستفسارات المطروحة وفقًا للأصول المهنية والطبية المتعارف عليها.";
const PHYSICIAN_CERT_QUESTIONS_EN = "I certify that I answered all related questions in accordance with accepted medical and professional standards.";
const SYSTEM_VALIDITY_STATEMENT_AR = "سجل موافقة مستنيرة مُنشأ إلكترونيًا من المركز الطبي الدولي عبر نظام واثق كير ويتمتع بحجية نظامية.";
const SYSTEM_VALIDITY_STATEMENT_EN = "International Medical Center electronically generated consent record via Wathiq Care System with full legal validity.";

const FINANCIAL_ACKNOWLEDGMENT_ROWS = [
  {
    labelAr: "الخطة العلاجية والتكاليف التقديرية",
    labelEn: "Treatment plan and estimated costs",
    valueAr: "أقر بأنني قد اطلعت على الخطة العلاجية والتكاليف التقديرية للخدمات الطبية وأوافق عليها.",
    valueEn: "I acknowledge that I have been informed of the treatment plan and estimated costs of medical services, and I accept them.",
  },
  {
    labelAr: "التكاليف الإضافية غير المغطاة",
    labelEn: "Additional uncovered costs",
    valueAr: "أقر وألتزم أنا أو ولي أمري الذي وقع على هذا الإقرار بدفع أي تكاليف إضافية لا يتم تغطيتها من متعهدي العلاج أو التأمين أو أهلية العلاج.",
    valueEn: "I acknowledge and commit that I, or my legal guardian who signed this consent, will pay any additional costs not covered by the insurer, treatment sponsor, or treatment eligibility.",
  },
  {
    labelAr: "تحويل الرسوم غير المدفوعة إلى فاتورة نقدية",
    labelEn: "Conversion of unpaid charges",
    valueAr: "أقر بحق المنشأة الصحية في تحويل أي تكاليف غير مغطاة أو غير مدفوعة إلى نقدية أو فاتورة مستحقة الدفع.",
    valueEn: "I acknowledge the right of the healthcare facility to convert any uncovered or unpaid costs into cash payment and issue an invoice for such amounts.",
  },
  {
    labelAr: "التحويل إلى منشأة صحية أخرى",
    labelEn: "Transfer to another healthcare facility",
    valueAr: "أقر بحق المنشأة الصحية دون اعتراض مني في تحويل المريض إلى منشأة صحية أخرى لاستكمال علاجه إذا اقتضت مصلحته الطبية ذلك.",
    valueEn: "I acknowledge the right of the healthcare facility, without objection from me, to transfer me to another healthcare facility to continue or complete my treatment if medically necessary.",
  },
] as const;

type SignaturePresentation = ReturnType<typeof resolveConsentSignaturePresentation>;

type FinalConsentPdfRow = {
  sectionKey: string;
  sectionTitleAr: string;
  sectionTitleEn: string;
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
};

type FinalConsentPdfPayload = {
  header: Record<string, string | null>;
  patient: Record<string, string | null>;
  encounter: Record<string, string | null>;
  consent: Record<string, string | null>;
  procedure: Record<string, string | null>;
  anesthesia: Record<string, string | null>;
  disclosures: Record<string, string | null>;
  pdpl: Record<string, string | null>;
  financialAcknowledgment: Record<string, string | null>;
  signatures: Record<string, string | null>;
  evidence: Record<string, string | null>;
  bilingualRows: FinalConsentPdfRow[];
  status: string;
  consentDocumentId: string;
  immutablePdfHash: string | null;
  patientSignature: SignaturePresentation | null;
  physicianSignature: SignaturePresentation | null;
  guardianSignature: SignaturePresentation | null;
  interpreterSignature: SignaturePresentation | null;
  witnessSignature: SignaturePresentation | null;
  qrPayload: string;
  qrVerificationUrl: string;
  logoSrc: string;
};

type RenderArgs = {
  documentId: string;
  tenantId: string;
  request: NextRequest;
  lang: "ar" | "en" | "bilingual";
  copyType: "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY";
  disposition?: "inline" | "attachment";
};

type FinalConsentDocument = Prisma.PromiseReturnType<typeof getFinalConsentPdfDocumentOrThrow>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNestedValue(source: unknown, path: string[]): unknown {
  let current: unknown = source;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function firstString(source: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const value = readNestedValue(source, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstBoolean(source: unknown, paths: string[][]): boolean | null {
  for (const path of paths) {
    const value = readNestedValue(source, path);
    if (typeof value === "boolean") return value;
  }
  return null;
}

function toMultilineList(values: Array<string | null | undefined>): string | null {
  const cleaned = values.map((value) => normalizeText(value)).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join("\n");
}

function repairGenericMojibake(input: string): string {
  if (!input || !CORRUPTED_MARKER_REGEX.test(input)) return input;
  try {
    const decoded = Buffer.from(input, "latin1").toString("utf8");
    if (decoded && !decoded.includes("�")) {
      return decoded;
    }
  } catch {
    return input;
  }
  return input;
}

function normalizeText(value: string | null | undefined): string {
  const repaired = repairGenericMojibake(value || "");
  return repaired.trim();
}

function normalizeArabicText(value: string | null | undefined): string {
  return normalizeArabicForPatientFacingText(normalizeText(value));
}

function normalizeArabicLegalText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeArabicText(value);
  if (!normalized || CORRUPTED_MARKER_REGEX.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function normalizeLegalText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeText(value);
  if (!normalized || CORRUPTED_MARKER_REGEX.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function normalizeArabicRowValue(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeArabicLegalText(value, fallback);
  return /[A-Za-z]{3,}/.test(normalized) ? fallback : normalized;
}

function normalizeEnglishRowValue(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeLegalText(value, fallback);
  return /[\u0600-\u06FF]/.test(normalized) ? fallback : normalized;
}

function hasText(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function isPlaceholder(value: string | null | undefined): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return true;
  return /^\[.*\]$/.test(normalized) || /^-\s*\[.*\]$/.test(normalized);
}

function formatDateTime(value: string | Date | null | undefined, locale: "ar" | "en"): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : null;
  return parsed.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDobAge(dob: string | null | undefined, locale: "ar" | "en"): string | null {
  const normalizedDob = normalizeText(dob);
  if (!normalizedDob) return null;
  const parsed = new Date(normalizedDob);
  if (Number.isNaN(parsed.getTime())) return normalizedDob;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDelta = now.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  const dateLabel = parsed.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return locale === "ar" ? `${dateLabel} (${Math.max(age, 0)} سنة)` : `${dateLabel} (${Math.max(age, 0)} years)`;
}

function formatStatus(status: string): { ar: string; en: string } {
  const normalized = normalizeText(status).toUpperCase();
  if (normalized === "FINALIZED") return { ar: "مكتمل ومؤرشف نهائيا", en: "Completed and finalized" };
  if (normalized === "SIGNED") return { ar: "موقّع", en: "Signed" };
  return { ar: "قيد المعالجة", en: "In progress" };
}

function normalizeValuePair(args: {
  ar?: string | null;
  en?: string | null;
  applicable?: boolean;
}): { ar: string; en: string } {
  const applicable = args.applicable ?? true;
  if (!applicable) return { ...NOT_APPLICABLE };
  const ar = normalizeArabicText(args.ar);
  const en = normalizeText(args.en);
  return {
    ar: ar || NOT_PROVIDED.ar,
    en: en || NOT_PROVIDED.en,
  };
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function signatureSummary(signature: SignaturePresentation | null, locale: "ar" | "en"): string | null {
  if (!signature) return null;
  const parts = [signature.signerName];
  if (signature.signedAt) {
    parts.push(locale === "ar" ? `تم التوقيع ${formatDateTime(signature.signedAt, "ar")}` : `Signed ${formatDateTime(signature.signedAt, "en")}`);
  }
  if (signature.evidenceId) {
    parts.push(locale === "ar" ? `مرجع الدليل: ${signature.evidenceId}` : `Evidence ID: ${signature.evidenceId}`);
  }
  return parts.filter(Boolean).join("\n");
}

function riskListByClass(document: FinalConsentDocument, riskClass: ConsentRiskClass): { ar: string | null; en: string | null } {
  const risks = document.documentRisks
    .filter((risk) => risk.riskClass === riskClass)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    ar: toMultilineList(risks.map((risk) => `- ${normalizeArabicText(risk.wordingAr)}`)),
    en: toMultilineList(risks.map((risk) => `- ${normalizeText(risk.wordingEn)}`)),
  };
}

function getSection(document: FinalConsentDocument, keys: string[]): { contentAr: string | null; contentEn: string | null } {
  const match = document.sections.find((section) => keys.includes(section.sectionKey));
  if (!match) return { contentAr: null, contentEn: null };
  return {
    contentAr: isPlaceholder(match.contentAr) ? null : normalizeArabicText(match.contentAr),
    contentEn: isPlaceholder(match.contentEn) ? null : normalizeText(match.contentEn),
  };
}

function getSectionByTitle(document: FinalConsentDocument, titleMatch: RegExp): { contentAr: string | null; contentEn: string | null } {
  const match = document.sections.find((section) => titleMatch.test(section.titleEn) || titleMatch.test(section.sectionKey));
  if (!match) return { contentAr: null, contentEn: null };
  return {
    contentAr: isPlaceholder(match.contentAr) ? null : normalizeArabicText(match.contentAr),
    contentEn: isPlaceholder(match.contentEn) ? null : normalizeText(match.contentEn),
  };
}

function computeFixedClauseChecksum(document: FinalConsentDocument): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    legalTextAr: document.legalTextAr,
    legalTextEn: document.legalTextEn,
    pdplTextAr: document.pdplTextAr,
    pdplTextEn: document.pdplTextEn,
    witnessDeclAr: document.witnessDeclAr,
    witnessDeclEn: document.witnessDeclEn,
    physicianCertAr: document.physicianCertAr,
    physicianCertEn: document.physicianCertEn,
  })).digest("hex");
}

async function resolveLogoSource(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(IMC_LOGO_URL, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!response.ok) return IMC_LOGO_URL;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) return IMC_LOGO_URL;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return IMC_LOGO_URL;
  }
}

async function launchBrowser(): Promise<Browser> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"];
  const defaultOptions: LaunchOptions = { headless: true, args: defaultArgs };
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // Fall back to bundled runtime.
    }
  }

  try {
    return await puppeteer.launch(defaultOptions);
  } catch {
    const executablePath = await chromium.executablePath();
    return await puppeteer.launch({
      ...defaultOptions,
      executablePath,
      args: [...chromium.args, ...defaultArgs],
    });
  }
}

async function getFinalConsentPdfDocumentOrThrow(args: { documentId: string; tenantId: string }) {
  const document = await prisma().consentDocument.findFirst({
    where: { id: args.documentId, tenantId: args.tenantId },
    include: {
      tenant: { select: { name: true } },
      template: {
        select: {
          titleAr: true,
          titleEn: true,
          consentType: true,
          specialty: true,
          requiresGuardian: true,
          requiresInterpreter: true,
        },
      },
      templateVersion: {
        select: {
          id: true,
          versionLabel: true,
          approvedAt: true,
        },
      },
      case: { select: { caseNumber: true } },
      emrMappings: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          physicianIdentifier: true,
          encounterIdentifier: true,
          diagnosisCode: true,
          procedureCode: true,
          metadata: true,
        },
      },
      signatures: { orderBy: [{ signedAt: "asc" }, { createdAt: "asc" }] },
      sections: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      documentRisks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      auditEvents: { orderBy: { createdAt: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      evidencePackages: { orderBy: { generatedAt: "desc" } },
    },
  });

  if (!document) {
    throw new ApiError(404, "Consent document not found");
  }

  return document;
}

export function validateFinalConsentPdfPayload(payload: FinalConsentPdfPayload): void {
  const blockers: string[] = [];
  const physicianCertificationRow = payload.bilingualRows.find((row) => row.labelEn === "Physician Certification");
  if (!hasText(payload.consentDocumentId)) blockers.push("Consent document ID is missing.");
  if (payload.bilingualRows.length === 0) blockers.push("No bilingual rows were generated.");
  if (!hasText(payload.patient.patientName) || payload.patient.patientName === NOT_PROVIDED.en) {
    blockers.push("Patient information is incomplete.");
  }
  if (!hasText(payload.header.documentStatus)) {
    blockers.push("Signature status is missing.");
  }
  if (!["SIGNED", "FINALIZED"].includes(payload.status.toUpperCase())) {
    blockers.push("Signature status must be signed or finalized before PDF generation.");
  }
  if (!hasText(payload.pdpl.patientHealthInformationProcessingAcknowledgment)) {
    blockers.push("PDPL acknowledgment is missing.");
  }
  if (!hasText(payload.disclosures.noGuaranteeOfOutcome)) {
    blockers.push("Required legal acknowledgment is missing.");
  }
  if (!hasText(payload.consent.diagnosis)) {
    blockers.push("Diagnosis row is missing.");
  }
  if (!payload.bilingualRows.some((row) => row.sectionKey === "financial_acknowledgment")) {
    blockers.push("Financial acknowledgment rows are missing.");
  }
  if (!payload.bilingualRows.some((row) => row.sectionKey === "signature_and_evidence")) {
    blockers.push("Signature and evidence rows are missing.");
  }

  const arabicDiagnostics = collectArabicMojibakeDiagnostics(
    payload.bilingualRows.flatMap((row) => [
      { fieldPath: `${row.sectionKey}.${row.labelEn}.valueAr`, value: row.valueAr },
      { fieldPath: `${row.sectionKey}.${row.labelEn}.labelAr`, value: row.labelAr },
    ]),
  );
  if (arabicDiagnostics.length > 0) {
    blockers.push(`Corrupted Arabic text detected in: ${arabicDiagnostics.map((item) => item.fieldPath).join(", ")}`);
  }

  const corruptedEnglishFields = payload.bilingualRows
    .filter((row) => CORRUPTED_MARKER_REGEX.test(row.valueEn) || CORRUPTED_MARKER_REGEX.test(row.labelEn))
    .map((row) => `${row.sectionKey}.${row.labelEn}`);
  if (corruptedEnglishFields.length > 0) {
    blockers.push(`Corrupted text detected in: ${corruptedEnglishFields.join(", ")}`);
  }

  const coreArabicLegalFields = [
    payload.pdpl.saudiPdplComplianceWording,
    payload.pdpl.patientHealthInformationProcessingAcknowledgment,
    physicianCertificationRow?.valueAr,
  ];
  if (coreArabicLegalFields.some((value) => CORRUPTED_MARKER_REGEX.test(value || ""))) {
    blockers.push("Core Arabic legal wording is corrupted.");
  }

  if (blockers.length > 0) {
    throw new ApiError(409, `Final consent PDF validation failed: ${blockers.join(" ")}`);
  }
}

export async function buildFinalConsentPdfPayload(args: {
  documentId: string;
  tenantId: string;
  requestOrigin: string;
}): Promise<FinalConsentPdfPayload> {
  const document = await getFinalConsentPdfDocumentOrThrow({ documentId: args.documentId, tenantId: args.tenantId });
  const metadata = asRecord(document.metadata);
  const executionContext = asRecord(metadata.executionContext);
  const decisionContext = asRecord(executionContext.decision);
  const wordingSnapshot = asRecord(metadata.finalizedWordingSnapshot);
  const fixedClauses = asRecord(wordingSnapshot.fixedClauses);
  const evidenceVault = asRecord(metadata.evidenceVault);
  const signatureSecurity = asRecord(metadata.signatureSecurity);
  const signatureOrchestration = asRecord(metadata.signatureOrchestration);
  const emrMapping = document.emrMappings[0] || null;
  const emrMetadata = asRecord(emrMapping?.metadata);
  const emrPayload: Record<string, unknown> = {};
  const demographics = asRecord(metadata.demographics);
  const patientIdentity = asRecord(metadata.patientIdentity);
  const encounter = asRecord(metadata.encounter);
  const procedureMetadata = asRecord(metadata.procedure);
  const anesthesiaMetadata = asRecord(metadata.anesthesia);
  const disclosuresMetadata = asRecord(metadata.disclosures);
  const facilityName = normalizeText(document.tenant?.name || "International Medical Center");
  const visitDate = firstString(
    { metadata, encounter, emrMetadata, emrPayload },
    [
      ["encounter", "visitDate"],
      ["metadata", "visitDate"],
      ["emrPayload", "visitDate"],
      ["emrMetadata", "visitDate"],
    ],
  );
  const nationalId = firstString(
    { metadata, patientIdentity, demographics, emrPayload },
    [
      ["patientIdentity", "nationalId"],
      ["patientIdentity", "iqama"],
      ["demographics", "nationalId"],
      ["metadata", "nationalId"],
      ["metadata", "iqama"],
      ["emrPayload", "nationalId"],
    ],
  );

  const sectionMedicalCondition = getSection(document, ["dynamic_medical_condition", "05_diagnosis_indication"]);
  const sectionProcedure = getSection(document, ["dynamic_proposed_procedure", "04_description"]);
  const sectionSite = getSection(document, ["dynamic_procedure_site_laterality"]);
  const sectionBenefits = getSection(document, ["dynamic_expected_benefits", "06_expected_benefits"]);
  const sectionComplications = getSection(document, ["dynamic_complications", "08_possible_complications"]);
  const sectionAlternatives = getSection(document, ["dynamic_treatment_alternatives", "10_alternatives"]);
  const sectionRefusal = getSection(document, ["dynamic_refusal_risks", "refusal_risks"]);
  const sectionPostProcedure = getSection(document, ["dynamic_post_procedure_instructions"]);
  const sectionPhysicianNotes = getSection(document, ["dynamic_physician_notes"]);
  const sectionSpecialPrecautions = getSection(document, ["dynamic_special_precautions"]);
  const sectionNoGuarantee = getSection(document, ["fixed_no_guarantee"]);
  const sectionInterpreter = getSection(document, ["interpreter_acknowledgment"]);
  const anesthesiaSection = getSectionByTitle(document, /anesthesia/i);
  const commonRisks = riskListByClass(document, ConsentRiskClass.COMMON);
  const uncommonRisks = riskListByClass(document, ConsentRiskClass.LESS_COMMON);
  const seriousRisks = riskListByClass(document, ConsentRiskClass.SERIOUS);
  const lifeThreateningRisks = riskListByClass(document, ConsentRiskClass.LIFE_THREATENING);

  const patientSignatureRaw = document.signatures.find((item) => item.role === "PATIENT") || null;
  const guardianSignatureRaw = document.signatures.find((item) => item.role === "GUARDIAN") || null;
  const physicianSignatureRaw = document.signatures.find((item) => item.role === "PHYSICIAN") || null;
  const interpreterSignatureRaw = document.signatures.find((item) => item.role === "INTERPRETER") || null;
  const witnessSignatureRaw = document.signatures.find((item) => item.role === "WITNESS") || null;

  const toPresentation = (signature: typeof patientSignatureRaw) => signature
    ? resolveConsentSignaturePresentation({
        metadata: signature.metadata || null,
        signatureMethod: signature.signatureMethod || null,
        signedAt: signature.signedAt || null,
        signerName: signature.signerName || "",
      })
    : null;

  const patientSignature = toPresentation(patientSignatureRaw);
  const guardianSignature = toPresentation(guardianSignatureRaw);
  const physicianSignature = toPresentation(physicianSignatureRaw);
  const interpreterSignature = toPresentation(interpreterSignatureRaw);
  const witnessSignature = toPresentation(witnessSignatureRaw);

  const qrVerificationUrl = `${PRODUCTION_VERIFY_BASE_URL}/verify/consent/${document.id}`;
  const effectiveHash = normalizeText(document.auditChecksum || document.immutablePdfHash || computeFixedClauseChecksum(document));
  const qrPayload = document.qrPayload || [
    `CONSENT:${document.consentReference}`,
    `DOC:${document.id}`,
    `STATUS:${document.status}`,
    `HASH:${effectiveHash}`,
    `VERIFY:${qrVerificationUrl}`,
  ].join("|");

  const rows: FinalConsentPdfRow[] = [];
  const addSectionRows = (
    sectionKey: string,
    sectionTitleAr: string,
    sectionTitleEn: string,
    items: Array<{ labelAr: string; labelEn: string; valueAr?: string | null; valueEn?: string | null; applicable?: boolean }>,
  ) => {
    for (const item of items) {
      const valuePair = normalizeValuePair({ ar: item.valueAr, en: item.valueEn, applicable: item.applicable });
      rows.push({
        sectionKey,
        sectionTitleAr,
        sectionTitleEn,
        labelAr: item.labelAr,
        labelEn: item.labelEn,
        valueAr: valuePair.ar,
        valueEn: valuePair.en,
      });
    }
  };

  const statusLabel = formatStatus(document.status);

  addSectionRows("patient_information", "معلومات المريض", "Patient Information", [
    { labelAr: "اسم المريض", labelEn: "Patient Name", valueAr: document.patientName, valueEn: document.patientName },
    { labelAr: "رقم الملف الطبي", labelEn: "MRN / Medical Record Number", valueAr: document.mrn, valueEn: document.mrn },
    { labelAr: "رقم الزيارة", labelEn: "Encounter / Visit Number", valueAr: emrMapping?.encounterIdentifier || firstString(encounter, [["identifier"]]), valueEn: emrMapping?.encounterIdentifier || firstString(encounter, [["identifier"]]) },
    { labelAr: "تاريخ الميلاد / العمر", labelEn: "Date of Birth / Age", valueAr: formatDobAge(document.dob, "ar"), valueEn: formatDobAge(document.dob, "en") },
    { labelAr: "الجنس", labelEn: "Gender", valueAr: document.gender, valueEn: document.gender },
    { labelAr: "الهوية الوطنية / الإقامة", labelEn: "National ID / Iqama", valueAr: nationalId, valueEn: nationalId },
    { labelAr: "القسم / التخصص", labelEn: "Department / Specialty", valueAr: document.department || document.physicianSpecialty, valueEn: document.department || document.physicianSpecialty },
    { labelAr: "الطبيب المعالج", labelEn: "Treating Physician", valueAr: document.physicianName, valueEn: document.physicianName },
    { labelAr: "تاريخ الزيارة", labelEn: "Visit Date", valueAr: formatDateTime(visitDate, "ar"), valueEn: formatDateTime(visitDate, "en") },
  ]);

  addSectionRows("consent_information", "معلومات الإجراء الطبي", "Consent / Procedure Information", [
    { labelAr: "التشخيص", labelEn: "Diagnosis", valueAr: document.diagnosis, valueEn: document.diagnosis },
    { labelAr: "الحالة الطبية", labelEn: "Medical Condition", valueAr: sectionMedicalCondition.contentAr || document.admissionDetails, valueEn: sectionMedicalCondition.contentEn || document.admissionDetails },
    { labelAr: "الإجراء المقترح", labelEn: "Proposed Procedure", valueAr: sectionProcedure.contentAr || document.plannedProcedure, valueEn: sectionProcedure.contentEn || document.plannedProcedure },
    { labelAr: "موضع الإجراء / الجهة", labelEn: "Procedure Site / Laterality", valueAr: sectionSite.contentAr || firstString(procedureMetadata, [["procedureSite"], ["laterality"]]), valueEn: sectionSite.contentEn || firstString(procedureMetadata, [["procedureSite"], ["laterality"]]) },
    { labelAr: "الفوائد المتوقعة", labelEn: "Expected Benefits", valueAr: sectionBenefits.contentAr || document.expectedOutcomesAr, valueEn: sectionBenefits.contentEn || document.expectedOutcomesEn },
    { labelAr: "المخاطر الشائعة", labelEn: "Common Risks", valueAr: commonRisks.ar || getSection(document, ["dynamic_common_risks"]).contentAr, valueEn: commonRisks.en || getSection(document, ["dynamic_common_risks"]).contentEn },
    { labelAr: "المخاطر غير الشائعة", labelEn: "Uncommon Risks", valueAr: uncommonRisks.ar || getSection(document, ["dynamic_uncommon_risks"]).contentAr, valueEn: uncommonRisks.en || getSection(document, ["dynamic_uncommon_risks"]).contentEn },
    { labelAr: "المخاطر الجسيمة أو المهددة للحياة", labelEn: "Serious / Life-threatening Risks", valueAr: toMultilineList([seriousRisks.ar, lifeThreateningRisks.ar]) || getSection(document, ["dynamic_serious_risks", "09_serious_complications"]).contentAr, valueEn: toMultilineList([seriousRisks.en, lifeThreateningRisks.en]) || getSection(document, ["dynamic_serious_risks", "09_serious_complications"]).contentEn },
    { labelAr: "المضاعفات المحتملة", labelEn: "Potential Complications", valueAr: sectionComplications.contentAr || document.sideEffectsAr, valueEn: sectionComplications.contentEn || document.sideEffectsEn },
    { labelAr: "البدائل العلاجية", labelEn: "Treatment Alternatives", valueAr: sectionAlternatives.contentAr || document.alternativesAr, valueEn: sectionAlternatives.contentEn || document.alternativesEn },
    { labelAr: "مخاطر رفض العلاج أو تأجيله", labelEn: "Risks of Refusal / Delay", valueAr: sectionRefusal.contentAr || document.refusalRisksAr, valueEn: sectionRefusal.contentEn || document.refusalRisksEn },
    { labelAr: "تعليمات ما بعد الإجراء", labelEn: "Post-procedure Instructions", valueAr: sectionPostProcedure.contentAr || firstString(procedureMetadata, [["postProcedureAr"]]), valueEn: sectionPostProcedure.contentEn || firstString(procedureMetadata, [["postProcedureEn"]]) },
    { labelAr: "ملاحظات الطبيب", labelEn: "Physician Notes", valueAr: sectionPhysicianNotes.contentAr || document.physicianNotesAr, valueEn: sectionPhysicianNotes.contentEn || document.physicianNotesEn },
    { labelAr: "احتياطات خاصة", labelEn: "Special Precautions", valueAr: sectionSpecialPrecautions.contentAr || firstString(procedureMetadata, [["specialPrecautionsAr"]]), valueEn: sectionSpecialPrecautions.contentEn || firstString(procedureMetadata, [["specialPrecautionsEn"]]) },
  ]);

  const anesthesiaApplicable = Boolean(
    firstBoolean({ anesthesiaMetadata, signatureSecurity }, [["anesthesiaMetadata", "applies"], ["signatureSecurity", "anesthesiaRequired"]])
    ?? hasText(anesthesiaSection.contentEn)
    ?? hasText(anesthesiaSection.contentAr),
  );
  addSectionRows("anesthesia_information", "معلومات التخدير", "Anesthesia Information", [
    { labelAr: "هل التخدير منطبق؟", labelEn: "Does Anesthesia Apply?", valueAr: anesthesiaApplicable ? "نعم" : NOT_APPLICABLE.ar, valueEn: anesthesiaApplicable ? "Yes" : NOT_APPLICABLE.en, applicable: true },
    { labelAr: "نوع التخدير", labelEn: "Type of Anesthesia", valueAr: firstString(anesthesiaMetadata, [["typeAr"], ["type"]]), valueEn: firstString(anesthesiaMetadata, [["typeEn"], ["type"]]), applicable: anesthesiaApplicable },
    { labelAr: "خيارات التخدير", labelEn: "Anesthesia Options", valueAr: firstString(anesthesiaMetadata, [["optionsAr"]]), valueEn: firstString(anesthesiaMetadata, [["optionsEn"]]), applicable: anesthesiaApplicable },
    { labelAr: "مخاطر التخدير", labelEn: "Anesthesia Risks", valueAr: firstString(anesthesiaMetadata, [["risksAr"]]) || anesthesiaSection.contentAr, valueEn: firstString(anesthesiaMetadata, [["risksEn"]]) || anesthesiaSection.contentEn, applicable: anesthesiaApplicable },
    { labelAr: "إقرار المريض", labelEn: "Patient Acknowledgment", valueAr: firstString(anesthesiaMetadata, [["acknowledgmentAr"]]), valueEn: firstString(anesthesiaMetadata, [["acknowledgmentEn"]]), applicable: anesthesiaApplicable },
  ]);

  addSectionRows("patient_acknowledgment_disclosures", "إقرارات المريض والإفصاحات", "Patient Acknowledgment / Disclosures", [
    { labelAr: "أتيحت لي الفرصة لطرح الأسئلة", labelEn: "I had the opportunity to ask questions", valueAr: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "لا" : "نعم", valueEn: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "No" : "Yes" },
    { labelAr: "تمت الإجابة على جميع أسئلتي", labelEn: "All my questions were answered", valueAr: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "لا" : "نعم", valueEn: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "No" : "Yes" },
    { labelAr: "أفهم المعلومات المقدمة لي", labelEn: "I understand the information", valueAr: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "لا" : "نعم", valueEn: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "No" : "Yes" },
    { labelAr: "أوافق بإرادتي الحرة دون إكراه", labelEn: "I consent voluntarily", valueAr: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "لا" : "نعم", valueEn: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "No" : "Yes" },
    { labelAr: "أفهم أنه لا يمكن ضمان نتيجة محددة", labelEn: "I understand no guarantee of outcome", valueAr: normalizeArabicRowValue(sectionNoGuarantee.contentAr || document.legalTextAr, NO_GUARANTEE_AR_FALLBACK), valueEn: normalizeEnglishRowValue(sectionNoGuarantee.contentEn || document.legalTextEn, NO_GUARANTEE_EN_FALLBACK) },
    { labelAr: "أوافق على أي إجراءات إضافية ضرورية", labelEn: "Additional procedures if necessary", valueAr: firstString(disclosuresMetadata, [["emergencyProceduresAr"]]), valueEn: firstString(disclosuresMetadata, [["emergencyProceduresEn"]]) },
  ]);

  addSectionRows("pdpl_data_protection", "حماية البيانات الشخصية", "PDPL / Data Protection", [
    { labelAr: "أوافق على استخدام معلوماتي الصحية", labelEn: "I consent to use my health information", valueAr: normalizeArabicRowValue((fixedClauses.pdplTextAr as string | undefined) || document.pdplTextAr, PDPL_CONSENT_AR_FALLBACK), valueEn: normalizeEnglishRowValue((fixedClauses.pdplTextEn as string | undefined) || document.pdplTextEn, PDPL_CONSENT_EN_FALLBACK) },
    { labelAr: "لأغراض العلاج والتوثيق والتشغيل الصحي", labelEn: "For treatment, documentation, operations", valueAr: normalizeArabicRowValue(firstString(metadata, [["pdpl", "processingPurposesAr"]]) || document.pdplTextAr, PDPL_PURPOSES_AR_FALLBACK), valueEn: normalizeEnglishRowValue(firstString(metadata, [["pdpl", "processingPurposesEn"]]) || document.pdplTextEn, PDPL_PURPOSES_EN_FALLBACK) },
    { labelAr: "وفقًا لنظام حماية البيانات الشخصية", labelEn: "Compliance with Saudi PDPL", valueAr: normalizeArabicRowValue(document.pdplTextAr, PDPL_COMPLIANCE_AR_FALLBACK), valueEn: normalizeEnglishRowValue(document.pdplTextEn, PDPL_COMPLIANCE_EN_FALLBACK) },
  ]);

  addSectionRows("financial_acknowledgment", "الإقرار المالي", "Financial Acknowledgment", [...FINANCIAL_ACKNOWLEDGMENT_ROWS]);

  const otpVerified = signatureSecurity.otpVerified === true || signatureOrchestration.otpVerified === true;
  const auditReference = evidenceVault.verificationToken || effectiveHash || document.id;
  const evidencePackageReference = document.evidencePackages[0]?.id || normalizeText((evidenceVault.evidencePackageV2Id as string | undefined) || "") || null;
  const latestIp = patientSignatureRaw?.ipAddress || guardianSignatureRaw?.ipAddress || document.timelineEvents.at(-1)?.ipAddress || null;
  const latestDevice = patientSignatureRaw?.userAgent || guardianSignatureRaw?.userAgent || document.timelineEvents.at(-1)?.userAgent || null;
  addSectionRows("signature_and_evidence", "التوقيعات والأدلة", "Signatures & Evidence", [
    { labelAr: "توقيع المريض", labelEn: "Patient Signature", valueAr: signatureSummary(patientSignature, "ar"), valueEn: signatureSummary(patientSignature, "en") },
    { labelAr: "إقرار الطبيب", labelEn: "Physician Certification", valueAr: normalizeArabicRowValue(signatureSummary(physicianSignature, "ar") || document.physicianCertAr, PHYSICIAN_CERT_AR_FALLBACK), valueEn: normalizeEnglishRowValue(signatureSummary(physicianSignature, "en") || document.physicianCertEn, PHYSICIAN_CERT_EN_FALLBACK) },
    { labelAr: "شرح الحالة الطبية والإجراء", labelEn: "Condition and procedure explained", valueAr: PHYSICIAN_CERT_CONDITION_AR, valueEn: PHYSICIAN_CERT_CONDITION_EN },
    { labelAr: "شرح الفوائد والمخاطر والبدائل", labelEn: "Benefits, risks, and alternatives explained", valueAr: PHYSICIAN_CERT_RISKS_AR, valueEn: PHYSICIAN_CERT_RISKS_EN },
    { labelAr: "الإجابة على الاستفسارات", labelEn: "Questions answered", valueAr: PHYSICIAN_CERT_QUESTIONS_AR, valueEn: PHYSICIAN_CERT_QUESTIONS_EN },
    { labelAr: "توقيع شاهد أو مترجم إن وجد", labelEn: "Witness / Interpreter if any", valueAr: toMultilineList([signatureSummary(witnessSignature, "ar"), signatureSummary(interpreterSignature, "ar") || sectionInterpreter.contentAr]), valueEn: toMultilineList([signatureSummary(witnessSignature, "en"), signatureSummary(interpreterSignature, "en") || sectionInterpreter.contentEn]), applicable: Boolean(witnessSignature || interpreterSignature || document.template.requiresInterpreter) },
    { labelAr: "توقيع ولي الأمر إن وجد", labelEn: "Legal Representative if any", valueAr: signatureSummary(guardianSignature, "ar"), valueEn: signatureSummary(guardianSignature, "en"), applicable: document.template.requiresGuardian || Boolean(guardianSignature) },
    { labelAr: "التحقق عبر OTP", labelEn: "OTP Verification", valueAr: otpVerified ? "تم التحقق" : NOT_PROVIDED.ar, valueEn: otpVerified ? "Verified" : NOT_PROVIDED.en },
    { labelAr: "رمز الجلسة / التوقيع", labelEn: "Signing Token / Session", valueAr: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)), valueEn: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)) },
    { labelAr: "عنوان IP", labelEn: "IP Address", valueAr: latestIp, valueEn: latestIp },
    { labelAr: "الجهاز / المتصفح", labelEn: "Device / Browser", valueAr: latestDevice, valueEn: latestDevice },
    { labelAr: "مرجع سجل التدقيق", labelEn: "Audit Trail Reference", valueAr: auditReference, valueEn: auditReference },
    { labelAr: "حزمة الأدلة", labelEn: "Evidence Package", valueAr: evidencePackageReference, valueEn: evidencePackageReference },
    { labelAr: "رابط التحقق", labelEn: "Verification URL", valueAr: qrVerificationUrl, valueEn: qrVerificationUrl },
    { labelAr: "البيان النظامي", labelEn: "System validity statement", valueAr: SYSTEM_VALIDITY_STATEMENT_AR, valueEn: SYSTEM_VALIDITY_STATEMENT_EN },
  ]);

  const payload: FinalConsentPdfPayload = {
    header: {
      facilityName,
      documentId: document.id,
      issueDate: formatDateTime(document.finalizedAt || document.updatedAt, "en"),
      documentStatus: statusLabel.en,
      titleEn: FINAL_TITLE.en,
      titleAr: FINAL_TITLE.ar,
      signingStatementEn: FINAL_SIGNING_STATEMENT.en,
      signingStatementAr: FINAL_SIGNING_STATEMENT.ar,
      consentReference: document.consentReference,
    },
    patient: {
      patientName: document.patientName,
      mrn: document.mrn,
      encounterNumber: emrMapping?.encounterIdentifier || null,
      dateOfBirth: document.dob,
      gender: document.gender,
      nationalId,
      department: document.department,
      treatingPhysician: document.physicianName,
      visitDate,
    },
    encounter: {
      caseNumber: document.case?.caseNumber || null,
      encounterIdentifier: emrMapping?.encounterIdentifier || null,
      physicianIdentifier: emrMapping?.physicianIdentifier || null,
      diagnosisCode: emrMapping?.diagnosisCode || null,
      procedureCode: emrMapping?.procedureCode || null,
    },
    consent: {
      consentType: document.template.consentType,
      templateTitle: document.template.titleEn,
      diagnosis: document.diagnosis || NOT_PROVIDED.en,
      medicalCondition: sectionMedicalCondition.contentEn || document.admissionDetails,
    },
    procedure: {
      proposedProcedure: sectionProcedure.contentEn || document.plannedProcedure,
      procedureSite: sectionSite.contentEn,
      expectedBenefits: sectionBenefits.contentEn || document.expectedOutcomesEn,
      commonRisks: commonRisks.en,
      uncommonRisks: uncommonRisks.en,
      seriousRisks: toMultilineList([seriousRisks.en, lifeThreateningRisks.en]),
      potentialComplications: sectionComplications.contentEn || document.sideEffectsEn,
      treatmentAlternatives: sectionAlternatives.contentEn || document.alternativesEn,
      refusalRisks: sectionRefusal.contentEn || document.refusalRisksEn,
      postProcedureInstructions: sectionPostProcedure.contentEn,
      physicianNotes: sectionPhysicianNotes.contentEn || document.physicianNotesEn,
      specialPrecautions: sectionSpecialPrecautions.contentEn,
    },
    anesthesia: {
      applies: anesthesiaApplicable ? "Applies" : NOT_APPLICABLE.en,
      type: firstString(anesthesiaMetadata, [["typeEn"], ["type"]]),
      options: firstString(anesthesiaMetadata, [["optionsEn"]]),
      risks: firstString(anesthesiaMetadata, [["risksEn"]]) || anesthesiaSection.contentEn,
      acknowledgement: firstString(anesthesiaMetadata, [["acknowledgmentEn"]]),
    },
    disclosures: {
      patientQuestionsOpportunity: firstBoolean(disclosuresMetadata, [["questionsOpportunity"]]) === false ? "No" : "Yes",
      allQuestionsAnswered: firstBoolean(disclosuresMetadata, [["allQuestionsAnswered"]]) === false ? "No" : "Yes",
      patientUnderstood: firstBoolean(disclosuresMetadata, [["patientUnderstood"]]) === false ? "No" : "Yes",
      voluntaryConsent: firstBoolean(disclosuresMetadata, [["voluntaryConsent"]]) === false ? "No" : "Yes",
      noGuaranteeOfOutcome: sectionNoGuarantee.contentEn || document.legalTextEn,
      emergencyProcedures: firstString(disclosuresMetadata, [["emergencyProceduresEn"]]),
    },
    pdpl: {
      patientHealthInformationProcessingAcknowledgment: normalizeText(document.pdplTextEn),
      processingPurposes: firstString(metadata, [["pdpl", "processingPurposesEn"]]) || normalizeText(document.pdplTextEn),
      saudiPdplComplianceWording: normalizeText(document.pdplTextEn),
    },
    financialAcknowledgment: {
      treatmentPlanAndEstimatedCosts: FINANCIAL_ACKNOWLEDGMENT_ROWS[0].valueEn,
      uncoveredCostsCommitment: FINANCIAL_ACKNOWLEDGMENT_ROWS[1].valueEn,
      convertUnpaidCharges: FINANCIAL_ACKNOWLEDGMENT_ROWS[2].valueEn,
      transferAuthorization: FINANCIAL_ACKNOWLEDGMENT_ROWS[3].valueEn,
    },
    signatures: {
      patientSignature: signatureSummary(patientSignature, "en"),
      guardianSignature: signatureSummary(guardianSignature, "en"),
      physicianCertification: normalizeLegalText(signatureSummary(physicianSignature, "en") || document.physicianCertEn, PHYSICIAN_CERT_EN_FALLBACK),
      interpreterAcknowledgment: signatureSummary(interpreterSignature, "en") || sectionInterpreter.contentEn,
      signatureDateTime: formatDateTime((guardianSignatureRaw || patientSignatureRaw || physicianSignatureRaw)?.signedAt || document.updatedAt, "en"),
      otpVerificationStatus: otpVerified ? "Verified" : NOT_PROVIDED.en,
    },
    evidence: {
      secureSigningReference: normalizeText((signatureOrchestration.sessionId as string | undefined) || (signatureOrchestration.challengeId as string | undefined)),
      ipAddress: latestIp,
      deviceMetadata: latestDevice,
      auditTrailReference: auditReference,
      evidencePackageReference,
      fixedClauseChecksum: computeFixedClauseChecksum(document),
    },
    bilingualRows: rows,
    status: document.status,
    consentDocumentId: document.id,
    immutablePdfHash: effectiveHash || null,
    patientSignature,
    physicianSignature,
    guardianSignature,
    interpreterSignature,
    witnessSignature,
    qrPayload,
    qrVerificationUrl,
    logoSrc: await resolveLogoSource(),
  };

  validateFinalConsentPdfPayload(payload);
  return payload;
}

function resolveSignatureForRow(payload: FinalConsentPdfPayload, row: FinalConsentPdfRow): SignaturePresentation | null {
  switch (row.labelEn) {
    case "Patient Signature":
      return payload.patientSignature;
    case "Physician Certification":
      return payload.physicianSignature;
    case "Witness / Interpreter if any":
      return payload.witnessSignature || payload.interpreterSignature;
    case "Legal Representative if any":
      return payload.guardianSignature;
    default:
      return null;
  }
}

function renderRowValueHtml(row: FinalConsentPdfRow, locale: "ar" | "en", payload: FinalConsentPdfPayload): string {
  const value = locale === "ar" ? row.valueAr : row.valueEn;
  const signature = row.sectionKey === "signature_and_evidence" ? resolveSignatureForRow(payload, row) : null;
  const signatureImage = signature?.signatureImageDataUrl
    ? `<img class="signature-inline" src="${escapeHtml(signature.signatureImageDataUrl)}" alt="${escapeHtml(row.labelEn)}" />`
    : "";
  return `<div class="value">${signatureImage}${renderMultiline(value)}</div>`;
}

function buildTableHtml(payload: FinalConsentPdfPayload, copyTypeLabel: string): string {
  const groupedRows: string[] = [];
  let currentSection = "";
  for (const row of payload.bilingualRows) {
    if (row.sectionKey !== currentSection) {
      currentSection = row.sectionKey;
      groupedRows.push(`
        <tr class="section-row">
          <td colspan="2">
            <div class="section-header-en">${escapeHtml(row.sectionTitleEn)}</div>
            <div class="section-header-ar">${escapeHtml(row.sectionTitleAr)}</div>
          </td>
        </tr>
      `);
    }
    groupedRows.push(`
      <tr>
        <td class="cell-en">
          <div class="label">${escapeHtml(row.labelEn)}</div>
          ${renderRowValueHtml(row, "en", payload)}
        </td>
        <td class="cell-ar">
          <div class="label">${escapeHtml(row.labelAr)}</div>
          ${renderRowValueHtml(row, "ar", payload)}
        </td>
      </tr>
    `);
  }

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #0f172a;
          background: #ffffff;
          font-family: "Segoe UI", Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .document { width: 100%; }
        .header {
          border: 1px solid #c6d2df;
          border-top: 4px solid #1f5f96;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: stretch;
          margin-bottom: 10px;
        }
        .header-left,
        .header-center,
        .header-right {
          min-width: 0;
        }
        .header-left {
          width: 24%;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-center {
          width: 46%;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }
        .header-right {
          width: 30%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
        }
        .imc-logo {
          width: 54px;
          height: 54px;
          object-fit: contain;
          flex: 0 0 auto;
        }
        .imc-brand {
          font-size: 10px;
          line-height: 1.35;
          color: #1e3a5f;
        }
        .imc-brand strong {
          display: block;
          font-size: 11px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          color: #164c7a;
          font-weight: 700;
        }
        .header-title-ar {
          margin: 0;
          font-size: 18px;
          color: #164c7a;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
          direction: rtl;
        }
        .header-signing-en,
        .header-signing-ar {
          font-size: 10px;
          color: #475569;
        }
        .header-signing-ar {
          direction: rtl;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
        }
        .metadata-panel {
          border: 1px solid #d6e1eb;
          background: #f8fbfe;
          padding: 8px;
          display: grid;
          gap: 6px;
        }
        .meta-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: start;
          font-size: 9px;
          color: #334155;
        }
        .meta-label {
          font-weight: 700;
          color: #164c7a;
        }
        .meta-label-ar {
          direction: rtl;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
          color: #64748b;
        }
        .meta-value {
          text-align: right;
          font-weight: 600;
          color: #0f172a;
          word-break: break-word;
        }
        .qr-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid #d6e1eb;
          background: #fff;
          padding: 8px;
        }
        .qr-box img {
          width: 72px;
          height: 72px;
          border: 1px solid #dbe4ee;
          background: #fff;
        }
        .qr-copy {
          text-align: right;
          font-size: 9px;
          color: #334155;
        }
        .qr-copy strong {
          display: block;
          color: #164c7a;
          margin-bottom: 2px;
        }
        .qr-copy .ar {
          direction: rtl;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #b8c9d8;
        }
        col { width: 50%; }
        td {
          border: 1px solid #d7e2ec;
          vertical-align: top;
          padding: 7px 9px;
        }
        .cell-en {
          direction: ltr;
          text-align: left;
        }
        .cell-ar {
          direction: rtl;
          text-align: right;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
        }
        .label {
          font-size: 9.5px;
          font-weight: 700;
          color: #164c7a;
          margin-bottom: 4px;
        }
        .value {
          font-size: 9.5px;
          line-height: 1.55;
          color: #111827;
          white-space: normal;
          word-break: break-word;
        }
        .signature-inline {
          display: block;
          max-width: 150px;
          max-height: 42px;
          object-fit: contain;
          margin: 0 0 6px;
          border-bottom: 1px solid #d5e0ea;
          background: #fff;
        }
        .section-row td {
          background: #ddebf7;
          border-top: 2px solid #1f5f96;
          padding: 6px 10px;
        }
        .section-header-en {
          font-size: 10px;
          font-weight: 700;
          color: #164c7a;
        }
        .section-header-ar {
          font-size: 10px;
          font-weight: 700;
          color: #164c7a;
          direction: rtl;
          text-align: right;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
        }
        .footer {
          margin-top: 12px;
          border: 1px solid #c6d2df;
          background: #f7fafc;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .footer-copy {
          font-size: 10px;
          color: #334155;
        }
        .footer-copy strong {
          color: #164c7a;
          display: block;
          margin-bottom: 3px;
        }
        .footer-copy .rtl {
          direction: rtl;
          font-family: "Noto Naskh Arabic", Tahoma, serif;
          margin-top: 4px;
        }
        .footer-brand {
          border-left: 2px solid #1f5f96;
          padding-left: 10px;
          text-align: right;
          min-width: 165px;
        }
        .footer-brand strong {
          display: block;
          color: #164c7a;
          font-size: 12px;
        }
        .footer-brand .sub {
          font-size: 9px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <div class="header">
          <div class="header-left">
            <img class="imc-logo" src="${escapeHtml(payload.logoSrc)}" alt="International Medical Center" />
            <div class="imc-brand">
              <strong>IMC</strong>
              <div>International Medical Center</div>
            </div>
          </div>
          <div class="header-center">
            <h1>${escapeHtml(FINAL_TITLE.en)}</h1>
            <div class="header-title-ar">${escapeHtml(FINAL_TITLE.ar)}</div>
            <div class="header-signing-en">${escapeHtml(FINAL_SIGNING_STATEMENT.en)}</div>
            <div class="header-signing-ar">${escapeHtml(FINAL_SIGNING_STATEMENT.ar)}</div>
          </div>
          <div class="header-right">
            <div class="metadata-panel">
              <div class="meta-row">
                <div>
                  <div class="meta-label">Document ID</div>
                  <div class="meta-label-ar">معرف المستند</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.consentDocumentId)}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Issue Date</div>
                  <div class="meta-label-ar">تاريخ الإصدار</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.issueDate || "")}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Status</div>
                  <div class="meta-label-ar">الحالة</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.documentStatus || "")}</div>
              </div>
              <div class="meta-row">
                <div>
                  <div class="meta-label">Reference</div>
                  <div class="meta-label-ar">المرجع</div>
                </div>
                <div class="meta-value">${escapeHtml(payload.header.consentReference || "")}</div>
              </div>
            </div>
            <div class="qr-box">
              <img src="__QR_DATA_URL__" alt="QR verification" />
              <div class="qr-copy">
                <strong>Verify Document</strong>
                <div class="ar">التحقق من المستند</div>
                <div>${escapeHtml(copyTypeLabel)}</div>
              </div>
            </div>
          </div>
        </div>
        <table>
          <colgroup><col /><col /></colgroup>
          <tbody>${groupedRows.join("")}</tbody>
        </table>
        <div class="footer">
          <div class="footer-copy">
            <strong>This document is electronically generated and signed via Wathiq Care system and is legally valid.</strong>
            <div class="rtl">تم إصدار هذا المستند وتوقيعه إلكترونيًا عبر نظام واثق كير، وهو وثيقة قانونية معتمدة.</div>
            <div>Verification URL: ${escapeHtml(payload.qrVerificationUrl)}</div>
          </div>
          <div class="footer-brand">
            <strong>Wathiq Care</strong>
            <div class="sub">System-generated legal validity statement</div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function renderFinalConsentPdfResponse(args: RenderArgs): Promise<NextResponse> {
  let browser: Browser | null = null;
  try {
    const { payload, html } = await buildFinalConsentPdfRenderContext(args);

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "12mm", right: "8mm", bottom: "12mm", left: "8mm" },
      headerTemplate: `<div style="font-size:8px;width:100%;padding:0 8mm;color:#334155;display:flex;justify-content:space-between;"><span>${escapeHtml(payload.header.facilityName || "")}</span><span>${escapeHtml(payload.consentDocumentId)}</span></div>`,
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 8mm;color:#334155;display:flex;justify-content:space-between;"><span>Confidential medico-legal consent record</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    await page.close();

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${args.disposition || "attachment"}; filename="CONSENT-${payload.consentDocumentId}-${args.copyType}-${args.lang}.pdf"`,
        "Cache-Control": "no-store",
        "X-Wathiq-Document-Status": payload.status,
        "X-Wathiq-Audit-Checksum": payload.immutablePdfHash || "",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("renderFinalConsentPdfResponse", error);
    return NextResponse.json({ error: "Failed to generate final consent PDF" }, { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // no-op
      }
    }
  }
}

async function buildFinalConsentPdfRenderContext(args: RenderArgs): Promise<{ payload: FinalConsentPdfPayload; html: string }> {
  const payload = await buildFinalConsentPdfPayload({
    documentId: args.documentId,
    tenantId: args.tenantId,
    requestOrigin: args.request.nextUrl.origin,
  });
  const qrDataUrl = await QRCode.toDataURL(payload.qrPayload, {
    errorCorrectionLevel: "M",
    width: 180,
    margin: 1,
  });
  const copyTypeLabel = args.copyType === "LEGAL_ARCHIVE_COPY"
    ? "Legal Archive Copy / نسخة الأرشيف القانوني"
    : args.copyType === "MEDICAL_RECORD_COPY"
      ? "Medical Record Copy / نسخة السجل الطبي"
      : "Patient Copy / نسخة المريض";
  const html = buildTableHtml(payload, copyTypeLabel).replace("__QR_DATA_URL__", escapeHtml(qrDataUrl));
  return { payload, html };
}

export async function renderFinalConsentHtmlPreviewResponse(args: RenderArgs): Promise<NextResponse> {
  try {
    const { html } = await buildFinalConsentPdfRenderContext(args);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("renderFinalConsentHtmlPreviewResponse", error);
    return NextResponse.json({ error: "Failed to generate final consent HTML preview" }, { status: 500 });
  }
}
