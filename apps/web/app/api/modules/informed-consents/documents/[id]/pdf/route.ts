import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { validatePublicSigningSession } from "@/lib/server/public-signing-service";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";
import {
  buildInformedConsentEvidenceHtmlPreview,
  isInformedConsentPdfEnginePreviewEnabled,
} from "@/lib/server/informed-consent-pdf-preview-adapter";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";

async function launchBrowser(): Promise<Browser> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"];
  const defaultOptions: LaunchOptions = { headless: true, args: defaultArgs };

  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // Fall through to bundled runtime options.
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

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function content(value: string | null | undefined): string {
  const normalized = cleanupText(value || "").trim();
  return escapeHtml(normalized || "-");
}

function formatDate(value: string | Date, locale: "ar" | "en"): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string, isAr: boolean): string {
  const normalized = (status || "").toUpperCase();
  if (isAr) {
    if (normalized === "FINALIZED") return "مؤرشف نهائيا";
    if (normalized === "SIGNED") return "موقع";
    if (normalized === "APPROVED") return "معتمد";
    if (normalized === "AI_DRAFT") return "مسودة AI";
    if (normalized === "PHYSICIAN_REVIEW") return "مراجعة الطبيب";
    return "مسودة";
  }

  if (normalized === "FINALIZED") return "Finalized";
  if (normalized === "SIGNED") return "Signed";
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "AI_DRAFT") return "AI Draft";
  if (normalized === "PHYSICIAN_REVIEW") return "Physician Review";
  return "Draft";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function repairMojibake(input: string): string {
  if (!input) return input;
  if (!/[ÃÂâØÙ]/.test(input)) return input;

  try {
    const decoded = Buffer.from(input, "latin1").toString("utf8");
    if (!decoded || decoded.includes("�")) return input;
    if (/[\u0600-\u06FF]/.test(decoded) || /[’“”–—]/.test(decoded) || decoded.includes("patient's")) {
      return decoded;
    }
  } catch {
    return input;
  }

  return input;
}

function cleanupText(input: string): string {
  return repairMojibake(input);
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim();
}

function hasValue(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function computeFixedClauseChecksum(input: {
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
}): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function isBilingualSynchronized(doc: {
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
}): boolean {
  const pairs = [
    [doc.legalTextAr, doc.legalTextEn],
    [doc.pdplTextAr, doc.pdplTextEn],
    [doc.witnessDeclAr, doc.witnessDeclEn],
    [doc.physicianCertAr, doc.physicianCertEn],
  ];
  return pairs.every(([ar, en]) => hasValue(ar) && hasValue(en));
}

type EvidenceCopyType = "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY";

function parseCopyType(value: string | null): EvidenceCopyType {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === "MEDICAL_RECORD_COPY" || normalized === "MEDICAL") return "MEDICAL_RECORD_COPY";
  if (normalized === "LEGAL_ARCHIVE_COPY" || normalized === "LEGAL") return "LEGAL_ARCHIVE_COPY";
  return "PATIENT_COPY";
}

function copyTypeLabel(copyType: EvidenceCopyType, isAr: boolean): string {
  if (isAr) {
    if (copyType === "MEDICAL_RECORD_COPY") return "نسخة السجل الطبي";
    if (copyType === "LEGAL_ARCHIVE_COPY") return "نسخة الأرشيف القانوني";
    return "نسخة المريض";
  }

  if (copyType === "MEDICAL_RECORD_COPY") return "Medical Record Copy";
  if (copyType === "LEGAL_ARCHIVE_COPY") return "Legal Archive Copy";
  return "Patient Copy";
}

async function resolveImcLogoSource(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(IMC_LOGO_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!response.ok) {
      return IMC_LOGO_URL;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return IMC_LOGO_URL;
    }

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return IMC_LOGO_URL;
  }
}

function css(direction: "rtl" | "ltr"): string {
  const borderLead = direction === "rtl" ? "border-right" : "border-left";
  return `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      direction: ${direction};
      font-family: ${direction === "rtl" ? "'Noto Naskh Arabic','Tahoma',serif" : "'Segoe UI',Arial,sans-serif"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc { width: 100%; position: relative; }
    .wm {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-26deg);
      font-size: 46pt;
      letter-spacing: 0.2em;
      color: rgba(0, 43, 92, 0.08);
      text-transform: uppercase;
      font-weight: 700;
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
    }
    .header {
      border: 1px solid #cdd6df;
      border-top: 5px solid #002B5C;
      border-bottom: 3px solid #C9A13B;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
      color: #002B5C;
    }
    .header p {
      margin: 4px 0 0;
      color: #334155;
    }
    .brand { text-align: ${direction === "rtl" ? "left" : "right"}; color: #002B5C; }
    .brand .brand-row { display: flex; align-items: center; gap: 8px; justify-content: ${direction === "rtl" ? "flex-start" : "flex-end"}; }
    .brand img { width: 44px; height: 44px; object-fit: contain; }
    .brand strong { color: #C9A13B; font-size: 18pt; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .meta > div {
      border: 1px solid #cdd6df;
      background: #f6f9fc;
      padding: 6px 8px;
    }
    .meta span { display: block; font-size: 8.8pt; color: #475569; }
    .meta strong { font-size: 9.8pt; color: #002B5C; }
    .warn {
      border: 1px dashed #b08929;
      background: #fff8e8;
      color: #7a5a0b;
      font-weight: 700;
      padding: 7px 9px;
      margin-bottom: 8px;
      font-size: 9pt;
      position: relative;
      z-index: 1;
    }
    .evidence {
      border: 1px solid #d4dde6;
      background: #f2f7fb;
      color: #0f172a;
      font-size: 8.2pt;
      padding: 6px 8px;
      margin-bottom: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
      position: relative;
      z-index: 1;
    }
    .evidence strong { color: #002B5C; }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
      position: relative;
      z-index: 1;
    }
    .card {
      border: 1px solid #cdd6df;
      padding: 7px;
      background: #fff;
      font-size: 9pt;
      line-height: 1.45;
      position: relative;
      z-index: 1;
    }
    .card h3 {
      margin: 0 0 6px;
      color: #002B5C;
      font-size: 10pt;
    }
    .card p { margin: 2px 0; }
    .card pre {
      margin: 2px 0 6px;
      white-space: pre-wrap;
      font-family: inherit;
      background: #f6f9fc;
      border: 1px solid #cdd6df;
      padding: 5px;
    }
    .full { margin-top: 6px; }
    .legal { ${borderLead}: 4px solid #C9A13B; }
    .sign {
      margin-top: 8px;
      border: 1px solid #cdd6df;
      background: #f6f9fc;
      padding: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      page-break-inside: avoid;
      position: relative;
      z-index: 1;
    }
    .sign .box { display: flex; flex-direction: column; gap: 6px; }
    .sign strong { color: #002B5C; font-size: 8.8pt; }
    .sign .sig-meta { font-size: 7.4pt; color: #475569; line-height: 1.45; }
    .sign .sig-image { width: 120px; height: 48px; object-fit: contain; border-bottom: 1px solid #cbd5e1; background: #fff; }
    .qr { align-items: center; text-align: center; }
    .qr img { width: 82px; height: 82px; border: 1px solid #cdd6df; background: #fff; }
    .qr small { margin-top: 6px; display: block; font-size: 7.5pt; word-break: break-all; }
    .doc-footer {
      margin-top: 8px;
      border-top: 1px solid #cdd6df;
      padding-top: 6px;
      font-size: 8pt;
      color: #334155;
      text-align: center;
      position: relative;
      z-index: 1;
    }
  `;
}

type SignaturePresentation = ReturnType<typeof resolveConsentSignaturePresentation>;

type EducationEvidenceSummary = {
  viewed: boolean;
  viewedAt: Date | null;
  completedAt: Date | null;
  language: string | null;
  templateCode: string | null;
  score: number | null;
  attempts: number | null;
  faqViewedCount: number;
  patientAcknowledged: boolean;
};

function extractEducationEvidenceSummary(input: {
  auditEvents: Array<{ action: string; source: string | null; createdAt: Date; metadata: unknown }>;
  hasPatientSignature: boolean;
}): EducationEvidenceSummary {
  const educationEvents = input.auditEvents.filter((event) => {
    const source = (event.source || "").toLowerCase();
    return source === "patient-education" || event.action.startsWith("EDUCATION_") || event.action.startsWith("UNDERSTANDING_");
  });

  const viewedAt = educationEvents.length > 0 ? educationEvents[0].createdAt : null;
  const completedAt =
    educationEvents.find((event) => event.action === "EDUCATION_COMPLETED")?.createdAt
    || (educationEvents.length > 0 ? educationEvents[educationEvents.length - 1].createdAt : null);
  const latestMetadata = educationEvents.length > 0 ? asRecord(educationEvents[educationEvents.length - 1].metadata) : {};

  const scoreValue = typeof latestMetadata.score === "number" && Number.isFinite(latestMetadata.score)
    ? latestMetadata.score
    : null;
  const attemptsValue = typeof latestMetadata.attempts === "number" && Number.isFinite(latestMetadata.attempts)
    ? latestMetadata.attempts
    : null;
  const faqViewedCountValue = typeof latestMetadata.faqViewedCount === "number" && Number.isFinite(latestMetadata.faqViewedCount)
    ? latestMetadata.faqViewedCount
    : 0;
  const patientAcknowledgedFromEvent =
    educationEvents.some((event) => {
      const metadata = asRecord(event.metadata);
      return metadata.patientAcknowledged === true || metadata.acknowledged === true || metadata.passed === true;
    })
    || educationEvents.some((event) => event.action === "UNDERSTANDING_PASSED")
    || educationEvents.some((event) => event.action === "EDUCATION_COMPLETED");

  return {
    viewed: educationEvents.length > 0,
    viewedAt,
    completedAt,
    language:
      typeof latestMetadata.language === "string" && latestMetadata.language.trim() !== ""
        ? latestMetadata.language
        : null,
    templateCode:
      typeof latestMetadata.templateCode === "string" && latestMetadata.templateCode.trim() !== ""
        ? latestMetadata.templateCode
        : null,
    score: scoreValue,
    attempts: attemptsValue,
    faqViewedCount: faqViewedCountValue,
    patientAcknowledged: patientAcknowledgedFromEvent || input.hasPatientSignature,
  };
}

function methodLabel(method: string, isAr: boolean): string {
  if (method === "combined-tablet-and-otp") return isAr ? "توقيع لوحي + OTP" : "Tablet + OTP";
  if (method === "tablet-drawn-signature") return isAr ? "توقيع يدوي على جهاز لوحي" : "Tablet Handwritten Signature";
  if (method === "combined-biometric-and-otp") return isAr ? "تحقق بصمة + OTP" : "Biometric + OTP";
  if (method === "biometric-fingerprint") return isAr ? "تحقق بصمة" : "Biometric Verification";
  if (method === "OTP") return "OTP";
  if (method === "WRITTEN") return isAr ? "توقيع كتابي" : "Written Signature";
  return isAr ? "توقيع إلكتروني" : "Electronic Signature";
}

function signatureRoleBlock(args: {
  evidenceLabel: string;
  isAr: boolean;
  label: string;
  signature: SignaturePresentation | null;
  signedAtLabel: string;
}): string {
  if (!args.signature) {
    return `<div class="box"><strong>${escapeHtml(args.label)}</strong><span>______________________</span></div>`;
  }

  const imageHtml = args.signature.signatureImageDataUrl
    ? `<img class="sig-image" src="${escapeHtml(args.signature.signatureImageDataUrl)}" alt="Signature image" />`
    : "<span>______________________</span>";
  const metaLines = [
    `<div>${escapeHtml(args.signature.signerName)}</div>`,
    `<div>${escapeHtml(methodLabel(args.signature.method, args.isAr))}</div>`,
    args.signature.signedAt ? `<div>${escapeHtml(args.signedAtLabel)}: ${escapeHtml(formatDate(args.signature.signedAt, args.isAr ? "ar" : "en"))}</div>` : "",
    args.signature.evidenceId ? `<div>${escapeHtml(args.evidenceLabel)}: ${escapeHtml(args.signature.evidenceId)}</div>` : "",
    args.signature.deviceReference ? `<div>${escapeHtml(args.isAr ? "مرجع الجهاز" : "Device Ref")}: ${escapeHtml(args.signature.deviceReference)}</div>` : "",
    args.signature.transactionId ? `<div>${escapeHtml(args.isAr ? "معرف العملية" : "Transaction ID")}: ${escapeHtml(args.signature.transactionId)}</div>` : "",
  ].filter(Boolean).join("");

  return `<div class="box"><strong>${escapeHtml(args.label)}</strong>${imageHtml}<div class="sig-meta">${metaLines}</div></div>`;
}

function html(args: {
  isAr: boolean;
  title: string;
  subtitle: string;
  reference: string;
  status: string;
  version: string;
  generatedAt: string;
  warning: string;
  copyLabel: string;
  watermarkLabel: string;
  auditChecksum: string | null;
  generatedByModel: string | null;
  finalizedAt: string | null;
  physicianIdentifier: string | null;
  patient: string;
  mrn: string | null;
  dob: string | null;
  gender: string | null;
  diagnosis: string | null;
  physician: string;
  physicianLicense: string | null;
  specialty: string;
  consentType: string;
  plannedProcedure: string | null;
  procedureDetails: string | null;
  risks: string | null;
  sideEffects: string | null;
  alternatives: string | null;
  refusalRisks: string | null;
  expectedOutcomes: string | null;
  physicianNotes: string | null;
  educationViewed: string;
  educationViewedAt: string | null;
  educationCompletedAt: string | null;
  educationLanguage: string | null;
  educationTemplateCode: string | null;
  educationScore: string | null;
  educationAttempts: string | null;
  educationFaqViewedCount: string | null;
  patientAcknowledged: string;
  legalText: string;
  pdplText: string;
  witnessDecl: string;
  physicianCert: string;
  patientSignatureLabel: string;
  physicianSignatureLabel: string;
  witnessSignatureLabel: string;
  qrLabel: string;
  qrDataUrl: string;
  logoSrc: string;
  patientSignature: SignaturePresentation | null;
  physicianSignature: SignaturePresentation | null;
  witnessSignature: SignaturePresentation | null;
}): string {
  return `<!doctype html>
<html lang="${args.isAr ? "ar" : "en"}" dir="${args.isAr ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <style>${css(args.isAr ? "rtl" : "ltr")}</style>
  </head>
  <body>
    <div class="doc">
      <div class="wm">${escapeHtml(args.watermarkLabel)}</div>
      <header class="header">
        <div>
          <h1>${escapeHtml(args.title)}</h1>
          <p>${escapeHtml(args.subtitle)}</p>
        </div>
        <div class="brand">
          <div class="brand-row">
            <img src="${escapeHtml(args.logoSrc)}" alt="International Medical Center" />
            <div>
              <div>International Medical Center</div>
              <strong>IMC</strong>
            </div>
          </div>
        </div>
      </header>

      <section class="meta">
        <div><span>${args.isAr ? "المرجع" : "Reference"}</span><strong>${escapeHtml(args.reference)}</strong></div>
        <div><span>${args.isAr ? "الحالة" : "Status"}</span><strong>${escapeHtml(args.status)}</strong></div>
        <div><span>${args.isAr ? "النسخة" : "Version"}</span><strong>${escapeHtml(args.version)}</strong></div>
        <div><span>${args.isAr ? "التاريخ" : "Timestamp"}</span><strong>${escapeHtml(args.generatedAt)}</strong></div>
      </section>

      <div class="warn">${escapeHtml(args.warning)}</div>

      <section class="evidence">
        <div><strong>${args.isAr ? "نوع النسخة" : "Copy Type"}:</strong> ${content(args.copyLabel)}</div>
        <div><strong>${args.isAr ? "ختم النزاهة" : "Integrity Checksum"}:</strong> ${content(args.auditChecksum)}</div>
        <div><strong>${args.isAr ? "المولد" : "Generated By Model"}:</strong> ${content(args.generatedByModel)}</div>
        <div><strong>${args.isAr ? "التثبيت النهائي" : "Finalized At"}:</strong> ${content(args.finalizedAt)}</div>
        <div><strong>${args.isAr ? "معرف الطبيب" : "Physician Identifier"}:</strong> ${content(args.physicianIdentifier)}</div>
        <div><strong>${args.isAr ? "النسخة" : "Document Version"}:</strong> ${content(args.version)}</div>
      </section>

      <section class="grid2">
        <article class="card">
          <h3>${args.isAr ? "بيانات المريض" : "Patient Profile"}</h3>
          <p><strong>${args.isAr ? "الاسم" : "Name"}:</strong> ${content(args.patient)}</p>
          <p><strong>MRN:</strong> ${content(args.mrn)}</p>
          <p><strong>${args.isAr ? "تاريخ الميلاد" : "DOB"}:</strong> ${content(args.dob)}</p>
          <p><strong>${args.isAr ? "الجنس" : "Gender"}:</strong> ${content(args.gender)}</p>
          <p><strong>${args.isAr ? "التشخيص" : "Diagnosis"}:</strong> ${content(args.diagnosis)}</p>
        </article>
        <article class="card">
          <h3>${args.isAr ? "بيانات الطبيب" : "Physician Profile"}</h3>
          <p><strong>${args.isAr ? "الاسم" : "Name"}:</strong> ${content(args.physician)}</p>
          <p><strong>${args.isAr ? "رقم الترخيص" : "License"}:</strong> ${content(args.physicianLicense)}</p>
          <p><strong>${args.isAr ? "التخصص" : "Specialty"}:</strong> ${content(args.specialty)}</p>
          <p><strong>${args.isAr ? "نوع الموافقة" : "Consent Type"}:</strong> ${content(args.consentType)}</p>
          <p><strong>${args.isAr ? "الإجراء المخطط" : "Planned Procedure"}:</strong> ${content(args.plannedProcedure)}</p>
        </article>
      </section>

      <article class="card full">
        <h3>${args.isAr ? "التفاصيل الطبية" : "Medical Content"}</h3>
        <p><strong>${args.isAr ? "تفاصيل الإجراء" : "Procedure Details"}:</strong> ${content(args.procedureDetails)}</p>
        <p><strong>${args.isAr ? "المخاطر" : "Risks"}:</strong></p><pre>${content(args.risks)}</pre>
        <p><strong>${args.isAr ? "الآثار الجانبية" : "Side Effects"}:</strong></p><pre>${content(args.sideEffects)}</pre>
        <p><strong>${args.isAr ? "البدائل" : "Alternatives"}:</strong></p><pre>${content(args.alternatives)}</pre>
        <p><strong>${args.isAr ? "مخاطر الرفض" : "Refusal Risks"}:</strong></p><pre>${content(args.refusalRisks)}</pre>
        <p><strong>${args.isAr ? "النتائج المتوقعة" : "Expected Outcomes"}:</strong></p><pre>${content(args.expectedOutcomes)}</pre>
        <p><strong>${args.isAr ? "ملاحظات الطبيب" : "Physician Notes"}:</strong></p><pre>${content(args.physicianNotes)}</pre>
      </article>

      <article class="card full">
        <h3>${args.isAr ? "أدلة تثقيف المريض" : "Patient Education Evidence"}</h3>
        <p><strong>${args.isAr ? "تم عرض التثقيف" : "Education Displayed"}:</strong> ${content(args.educationViewed)}</p>
        <p><strong>${args.isAr ? "وقت بدء التثقيف" : "Education Opened At"}:</strong> ${content(args.educationViewedAt)}</p>
        <p><strong>${args.isAr ? "وقت إكمال التثقيف" : "Education Completed At"}:</strong> ${content(args.educationCompletedAt)}</p>
        <p><strong>${args.isAr ? "لغة التثقيف" : "Education Language"}:</strong> ${content(args.educationLanguage)}</p>
        <p><strong>${args.isAr ? "مرجع القالب" : "Template Code"}:</strong> ${content(args.educationTemplateCode)}</p>
        <p><strong>${args.isAr ? "نتيجة الفهم" : "Understanding Score"}:</strong> ${content(args.educationScore)}</p>
        <p><strong>${args.isAr ? "عدد المحاولات" : "Attempts"}:</strong> ${content(args.educationAttempts)}</p>
        <p><strong>${args.isAr ? "الأسئلة الشائعة التي تمت مشاهدتها" : "FAQ Items Viewed"}:</strong> ${content(args.educationFaqViewedCount)}</p>
        <p><strong>${args.isAr ? "إقرار المريض" : "Patient Acknowledgement"}:</strong> ${content(args.patientAcknowledged)}</p>
      </article>

      <article class="card full legal">
        <h3>${args.isAr ? "الإقرار القانوني والخصوصية" : "Legal and Privacy Declarations"}</h3>
        <p>${content(args.legalText)}</p>
        <p>${content(args.pdplText)}</p>
        <p>${content(args.witnessDecl)}</p>
        <p>${content(args.physicianCert)}</p>
      </article>

      <footer class="sign">
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? "معرف الدليل" : "Evidence ID",
          isAr: args.isAr,
          label: args.patientSignatureLabel,
          signature: args.patientSignature,
          signedAtLabel: args.isAr ? "وقت التوقيع" : "Signed At",
        })}
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? "معرف الدليل" : "Evidence ID",
          isAr: args.isAr,
          label: args.physicianSignatureLabel,
          signature: args.physicianSignature,
          signedAtLabel: args.isAr ? "وقت التوقيع" : "Signed At",
        })}
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? "معرف الدليل" : "Evidence ID",
          isAr: args.isAr,
          label: args.witnessSignatureLabel,
          signature: args.witnessSignature,
          signedAtLabel: args.isAr ? "وقت التوقيع" : "Signed At",
        })}
        <div class="box qr"><img src="${args.qrDataUrl}" alt="QR" /><small>${escapeHtml(args.qrLabel)}</small></div>
      </footer>
      <div class="doc-footer">
        ${args.isAr
    ? "صادر من المركز الطبي الدولي مع حفظ الأدلة الرقمية عبر منصة واثق كير."
    : "Issued by International Medical Center with digital evidence preservation through WathiqCare platform."}
      </div>
    </div>
  </body>
</html>`;
}

function extractBody(markup: string): string {
  const match = markup.match(/<body>([\s\S]*)<\/body>/i);
  return match ? match[1] : markup;
}

function bilingualHtml(arArgs: Parameters<typeof html>[0], enArgs: Parameters<typeof html>[0]): string {
  const arBody = extractBody(html(arArgs));
  const enBody = extractBody(html(enArgs));

  return `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <style>
      ${css("ltr")}
      .page-break { page-break-before: always; }
      .lang-block[dir="rtl"] {
        direction: rtl;
        font-family: 'Noto Naskh Arabic','Tahoma',serif;
      }
      .lang-block[dir="ltr"] {
        direction: ltr;
        font-family: 'Segoe UI',Arial,sans-serif;
      }
    </style>
  </head>
  <body>
    <section class="lang-block" dir="rtl" lang="ar">${arBody}</section>
    <div class="page-break"></div>
    <section class="lang-block" dir="ltr" lang="en">${enBody}</section>
  </body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: Browser | null = null;

  try {
    const prisma = getPrisma();
    const { id } = await params;

    const publicToken = request.nextUrl.searchParams.get("publicToken")?.trim() || "";
    let tenantId: string | null = null;

    if (publicToken) {
      const publicContext = await validatePublicSigningSession({
        token: publicToken,
        request,
      });

      if (publicContext.documentId !== id) {
        return NextResponse.json({ error: "Public token does not match requested document" }, { status: 403 });
      }

      tenantId = publicContext.tenantId;
    } else {
      const auth = await requireModuleOperationalAccess(request, "informed-consents");
      tenantId = auth.tenant_id ?? null;
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId },
      include: {
        template: {
          select: {
            titleAr: true,
            titleEn: true,
            consentType: true,
            specialty: true,
          },
        },
        case: {
          select: {
            caseNumber: true,
          },
        },
        emrMappings: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { physicianIdentifier: true },
        },
        signatures: {
          orderBy: { signedAt: "asc" },
        },
        auditEvents: {
          orderBy: { createdAt: "asc" },
          select: {
            action: true,
            source: true,
            createdAt: true,
            metadata: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Consent document not found" }, { status: 404 });
    }

    const fixedClauseChecksum = computeFixedClauseChecksum({
      legalTextAr: doc.legalTextAr,
      legalTextEn: doc.legalTextEn,
      pdplTextAr: doc.pdplTextAr,
      pdplTextEn: doc.pdplTextEn,
      witnessDeclAr: doc.witnessDeclAr,
      witnessDeclEn: doc.witnessDeclEn,
      physicianCertAr: doc.physicianCertAr,
      physicianCertEn: doc.physicianCertEn,
    });

    const metadata = asRecord(doc.metadata);
    const workflow = asRecord(metadata.secureSigningWorkflow);
    const workflowStatus = asRecord(workflow.status);
    const workflowSigned = workflowStatus.signed === true;
    const metadataFinalizedAt = asDate(asRecord(asRecord(metadata.governance).lifecycle).finalizedAt) || asDate(metadata.finalizedAt);
    const workflowUpdatedAt = asDate(workflow.updatedAt);
    const effectiveFinalizedAt = doc.finalizedAt || metadataFinalizedAt || (workflowSigned ? workflowUpdatedAt : null);
    const effectiveStatus =
      doc.status === "FINALIZED" || Boolean(effectiveFinalizedAt)
        ? "FINALIZED"
        : (doc.status === "SIGNED" || workflowSigned ? "SIGNED" : doc.status);

    const snapshot =
      metadata.finalizedWordingSnapshot && typeof metadata.finalizedWordingSnapshot === "object"
        ? (metadata.finalizedWordingSnapshot as Record<string, unknown>)
        : null;
    const snapshotChecksum = snapshot && typeof snapshot.checksum === "string" ? snapshot.checksum : null;
    const snapshotVersion =
      snapshot && snapshot.version && typeof snapshot.version === "object" && typeof (snapshot.version as Record<string, unknown>).documentVersion === "string"
        ? ((snapshot.version as Record<string, unknown>).documentVersion as string)
        : null;

    if (!isBilingualSynchronized(doc)) {
      return NextResponse.json({ error: "Bilingual synchronization validation failed" }, { status: 409 });
    }

    if (doc.status === "FINALIZED") {
      if (!snapshotChecksum || snapshotChecksum !== fixedClauseChecksum) {
        return NextResponse.json({ error: "Fixed clause checksum mismatch for finalized consent" }, { status: 409 });
      }
      if (snapshotVersion && doc.documentVersion && snapshotVersion !== doc.documentVersion) {
        return NextResponse.json({ error: "Wording version mismatch for finalized consent" }, { status: 409 });
      }
    }

    const requestedLang = (request.nextUrl.searchParams.get("lang") || doc.language || "bilingual").toLowerCase();
    const lang = requestedLang === "ar" || requestedLang === "en" || requestedLang === "bilingual" ? requestedLang : "bilingual";
    const isAr = lang === "ar";
    const copyType = parseCopyType(request.nextUrl.searchParams.get("copy"));
    const copyLabel = copyTypeLabel(copyType, isAr);

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/verify/consent/${doc.id}`;
    const qrPayload = doc.qrPayload || [
      `CONSENT:${doc.consentReference}`,
      `DOC:${doc.id}`,
      `STATUS:${effectiveStatus}`,
      `VERIFY:${verifyUrl}`,
    ].join("|");

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      width: 180,
      margin: 1,
    });

    const patientRaw = doc.signatures.find((item) => item.role === "PATIENT" || item.role === "GUARDIAN") || null;
    const physicianRaw = doc.signatures.find((item) => item.role === "PHYSICIAN") || null;
    const witnessRaw = doc.signatures.find((item) => item.role === "WITNESS") || null;

    const patientSignature = patientRaw
      ? resolveConsentSignaturePresentation({
          metadata: patientRaw.metadata || null,
          signatureMethod: patientRaw.signatureMethod || null,
          signedAt: patientRaw.signedAt || null,
          signerName: patientRaw.signerName || "",
        })
      : null;
    const physicianSignature = physicianRaw
      ? resolveConsentSignaturePresentation({
          metadata: physicianRaw.metadata || null,
          signatureMethod: physicianRaw.signatureMethod || null,
          signedAt: physicianRaw.signedAt || null,
          signerName: physicianRaw.signerName || "",
        })
      : null;
    const witnessSignature = witnessRaw
      ? resolveConsentSignaturePresentation({
          metadata: witnessRaw.metadata || null,
          signatureMethod: witnessRaw.signatureMethod || null,
          signedAt: witnessRaw.signedAt || null,
          signerName: witnessRaw.signerName || "",
        })
      : null;

    const logoSrc = await resolveImcLogoSource();
    const educationEvidence = extractEducationEvidenceSummary({
      auditEvents: doc.auditEvents,
      hasPatientSignature: Boolean(patientRaw),
    });
    const buildArgs = (renderAr: boolean): Parameters<typeof html>[0] => {
      const localizedCopyLabel = copyTypeLabel(copyType, renderAr);

      return {
        patientSignature,
        physicianSignature,
        witnessSignature,
        isAr: renderAr,
        title: renderAr ? "نموذج الموافقة المستنيرة" : "Informed Consent Document",
        subtitle: renderAr ? cleanupText(doc.template.titleAr) : cleanupText(doc.template.titleEn),
        reference: `${cleanupText(doc.consentReference)}${doc.case?.caseNumber ? ` | ${cleanupText(doc.case.caseNumber)}` : ""}`,
        status: statusLabel(effectiveStatus, renderAr),
        version: cleanupText(doc.documentVersion || "v1.0"),
        generatedAt: formatDate(doc.createdAt, renderAr ? "ar" : "en"),
        warning: renderAr ? cleanupText(doc.aiWarningAr) : cleanupText(doc.aiWarningEn),
        copyLabel: localizedCopyLabel,
        watermarkLabel: `${localizedCopyLabel} | ${cleanupText(doc.consentReference)}`,
        auditChecksum: cleanupText(doc.auditChecksum || doc.immutablePdfHash || ""),
        generatedByModel: cleanupText(doc.generatedByModel || ""),
        finalizedAt: effectiveFinalizedAt ? formatDate(effectiveFinalizedAt, renderAr ? "ar" : "en") : null,
        physicianIdentifier: cleanupText(doc.emrMappings[0]?.physicianIdentifier || doc.physicianLicense || ""),
        patient: cleanupText(doc.patientName),
        mrn: cleanupText(doc.mrn || ""),
        dob: cleanupText(doc.dob || ""),
        gender: cleanupText(doc.gender || ""),
        diagnosis: cleanupText(doc.diagnosis || ""),
        physician: cleanupText(doc.physicianName),
        physicianLicense: cleanupText(doc.physicianLicense || ""),
        specialty: cleanupText(doc.physicianSpecialty),
        consentType: cleanupText(doc.template.consentType),
        plannedProcedure: cleanupText(doc.plannedProcedure || ""),
        procedureDetails: cleanupText(doc.procedureDetails || ""),
        risks: cleanupText(renderAr ? doc.risksAr || "" : doc.risksEn || ""),
        sideEffects: cleanupText(renderAr ? doc.sideEffectsAr || "" : doc.sideEffectsEn || ""),
        alternatives: cleanupText(renderAr ? doc.alternativesAr || "" : doc.alternativesEn || ""),
        refusalRisks: cleanupText(renderAr ? doc.refusalRisksAr || "" : doc.refusalRisksEn || ""),
        expectedOutcomes: cleanupText(renderAr ? doc.expectedOutcomesAr || "" : doc.expectedOutcomesEn || ""),
        physicianNotes: cleanupText(renderAr ? doc.physicianNotesAr || "" : doc.physicianNotesEn || ""),
        educationViewed: educationEvidence.viewed ? (renderAr ? "نعم" : "Yes") : (renderAr ? "لا" : "No"),
        educationViewedAt: educationEvidence.viewedAt ? formatDate(educationEvidence.viewedAt, renderAr ? "ar" : "en") : null,
        educationCompletedAt: educationEvidence.completedAt ? formatDate(educationEvidence.completedAt, renderAr ? "ar" : "en") : null,
        educationLanguage: cleanupText(educationEvidence.language || (doc.language || "")),
        educationTemplateCode: cleanupText(educationEvidence.templateCode || ""),
        educationScore: educationEvidence.score == null ? null : `${Math.round(educationEvidence.score)}%`,
        educationAttempts: educationEvidence.attempts == null ? null : String(educationEvidence.attempts),
        educationFaqViewedCount: String(educationEvidence.faqViewedCount),
        patientAcknowledged: educationEvidence.patientAcknowledged
          ? (renderAr ? "تم الإقرار" : "Acknowledged")
          : (renderAr ? "غير مسجل" : "Not recorded"),
        legalText: cleanupText(renderAr ? doc.legalTextAr : doc.legalTextEn),
        pdplText: cleanupText(renderAr ? doc.pdplTextAr : doc.pdplTextEn),
        witnessDecl: cleanupText(renderAr ? doc.witnessDeclAr : doc.witnessDeclEn),
        physicianCert: cleanupText(renderAr ? doc.physicianCertAr : doc.physicianCertEn),
        patientSignatureLabel: renderAr ? "توقيع المريض / الولي" : "Patient / Guardian Signature",
        physicianSignatureLabel: renderAr ? "توقيع الطبيب" : "Physician Signature",
        witnessSignatureLabel: renderAr ? "توقيع الشاهد" : "Witness Signature",
        qrLabel: verifyUrl,
        qrDataUrl,
        logoSrc,
      };
    };

    const output =
      lang === "bilingual"
        ? bilingualHtml(buildArgs(true), buildArgs(false))
        : html(buildArgs(isAr));

    if (isInformedConsentPdfEnginePreviewEnabled()) {
      await buildInformedConsentEvidenceHtmlPreview({
        document: {
          id: doc.id,
          tenantId: doc.tenantId,
          consentReference: doc.consentReference,
          documentVersion: doc.documentVersion,
          patientName: doc.patientName,
          mrn: doc.mrn,
          physicianName: doc.physicianName,
          physicianLicense: doc.physicianLicense,
          physicianSpecialty: doc.physicianSpecialty,
          plannedProcedure: doc.plannedProcedure,
          procedureDetails: doc.procedureDetails,
          diagnosis: doc.diagnosis,
          createdAt: doc.createdAt,
          template: {
            titleAr: doc.template.titleAr,
            titleEn: doc.template.titleEn,
            consentType: doc.template.consentType,
            specialty: doc.template.specialty,
          },
          case: doc.case,
          auditChecksum: doc.auditChecksum,
          immutablePdfHash: doc.immutablePdfHash,
          generatedByModel: doc.generatedByModel,
        },
        origin: process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin,
        language: isAr ? "ar" : "en",
      });
    }

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(output, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "14mm", right: "8mm", bottom: "14mm", left: "8mm" },
      headerTemplate: `
        <div style="font-size:8px;width:100%;padding:0 8mm;color:#334155;display:flex;justify-content:space-between;">
          <span>International Medical Center</span>
          <span>${escapeHtml(doc.consentReference)}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size:8px;width:100%;padding:0 8mm;color:#334155;display:flex;justify-content:space-between;">
          <span>Confidential medico-legal consent record</span>
          <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
    });

    await page.close();

    const safeReference = doc.consentReference.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CONSENT-${safeReference}-${copyType}-${lang}.pdf"`,
        "Cache-Control": "no-store",
        "X-Wathiq-Evidence-Copy": copyType,
        "X-Wathiq-Audit-Checksum": doc.auditChecksum || doc.immutablePdfHash || "",
        "X-Wathiq-Document-Version": doc.documentVersion || "v1.0",
        "X-Wathiq-Wording-Version": doc.documentVersion || "v1.0",
        "X-Wathiq-Wording-Approval-Reference": doc.templateVersionId,
        "X-Wathiq-Wording-Checksum": fixedClauseChecksum,
        "X-Wathiq-Bilingual-Sync": "verified",
        "X-Wathiq-Generated-By": doc.generatedByModel || "",
        "X-Wathiq-Finalized-At": effectiveFinalizedAt ? effectiveFinalizedAt.toISOString() : "",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("GET /api/modules/informed-consents/documents/[id]/pdf", err);
    return NextResponse.json({ error: "Failed to generate consent PDF" }, { status: 500 });
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
