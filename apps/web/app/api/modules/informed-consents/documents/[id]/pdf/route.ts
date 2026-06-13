import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { deepSanitizeArabicText, sanitizePdfDisplayText as sanitizeSharedPdfDisplayText } from "@/lib/server/arabic-text-sanitizer";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";
import { WATHIQ_ARABIC_FONT_400, WATHIQ_ARABIC_FONT_700 } from "@/lib/pdf-engine/core/pdf-arabic-font-data";
import {
  buildInformedConsentEvidenceHtmlPreview,
  isInformedConsentPdfEnginePreviewEnabled,
} from "@/lib/server/informed-consent-pdf-preview-adapter";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";
const PRODUCTION_VERIFY_BASE_URL = "https://wathiqcare.online";
const FORBIDDEN_PDF_TOKENS = ["￾", "الطيب الدويل", "مستنرية", "الزنيف", "الجنيب", "تشخييص", "رفّمع"] as const;

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

type PdfTextContext = "general" | "medical-header" | "reference" | "url";

type PdfTextSanitizeOptions = {
  context?: PdfTextContext;
  preserveNewlines?: boolean;
};

type PdfCopyType = "medical-record" | "legal-archive" | "patient-copy";

function parseCopyType(value: string | null): PdfCopyType {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "legal" ||
    normalized === "legal-archive" ||
    normalized === "legal_archive" ||
    normalized === "archive"
  ) {
    return "legal-archive";
  }

  if (
    normalized === "patient" ||
    normalized === "patient-copy" ||
    normalized === "patient_copy"
  ) {
    return "patient-copy";
  }

  return "medical-record";
}

function copyTypeLabel(copyType: PdfCopyType, isAr: boolean): string {
  if (copyType === "legal-archive") {
    return isAr ? "نسخة الأرشيف القانوني" : "Legal Archive Copy";
  }

  if (copyType === "patient-copy") {
    return isAr ? "نسخة المريض" : "Patient Copy";
  }

  return isAr ? "نسخة السجل الطبي" : "Medical Record Copy";
}

function arPdfLabel(label: string): string {
  const labels: Record<string, string> = {
    "Patient Information": "بيانات المريض",
    "Patient": "المريض",
    "MRN": "رقم الملف الطبي",
    "Date of Birth": "تاريخ الميلاد",
    "Gender": "الجنس",
    "Diagnosis": "التشخيص",
    "Physician": "الطبيب",
    "Physician License": "ترخيص الطبيب",
    "Specialty": "التخصص",
    "Patient Profile": "بيانات المريض",
    "Physician Profile": "بيانات الطبيب",
    "Medical Content": "المحتوى الطبي",
    "Legal and Privacy Declarations": "الإقرارات القانونية والخصوصية",
    "Name": "الاسم",
    "MRN": "رقم الملف الطبي",
    "DOB": "تاريخ الميلاد",
    "Gender": "الجنس",
    "Diagnosis": "التشخيص",
    "License": "الترخيص",
    "Specialty": "التخصص",
    "Physician Identifier": "معرّف الطبيب",
    "Consent Details": "تفاصيل الموافقة",
    "Consent Type": "نوع الموافقة",
    "Planned Procedure": "الإجراء المخطط",
    "Procedure Details": "تفاصيل الإجراء",
    "Risks": "المخاطر",
    "Side Effects": "الآثار الجانبية",
    "Alternatives": "البدائل",
    "Refusal Risks": "مخاطر الرفض",
    "Expected Outcomes": "النتائج المتوقعة",
    "Physician Notes": "ملاحظات الطبيب",
    "Education Evidence": "إثبات التثقيف",
    "Education Viewed": "تم الاطلاع على التثقيف",
    "Education Viewed At": "وقت الاطلاع على التثقيف",
    "Education Completed At": "وقت إكمال التثقيف",
    "Education Language": "لغة التثقيف",
    "Patient Education & Visual Understanding": "التثقيف وفهم الإجراء بصرياً",
    "Education Step": "خطوة التثقيف",
    "Template Code": "رمز النموذج",
    "Score": "النتيجة",
    "Attempts": "المحاولات",
    "FAQ Viewed Count": "عدد مرات الاطلاع على الأسئلة الشائعة",
    "Visual Aid Displayed": "تم عرض الوسيلة البصرية",
    "Visual Aid Type": "نوع الوسيلة البصرية",
    "Clinical Topic": "الموضوع السريري",
    "Disclaimer": "التنبيه",
    "Visual Aid Source": "مصدر الوسيلة البصرية",
    "Purpose / Disclaimer": "الغرض / التنبيه",
    "Viewed At": "تمت المشاهدة في",
    "Visual Aid Asset ID": "معرّف أصل الوسيلة البصرية",
    "Visual Aid Link": "رابط الوسيلة البصرية",
    "Generated At": "تاريخ التوليد",
    "Patient Acknowledgment": "إقرار المريض",
    "Patient Acknowledgement": "إقرار المريض",
    "Legal Declaration": "الإقرار القانوني",
    "PDPL Notice": "إشعار حماية البيانات الشخصية",
    "Witness Declaration": "إقرار الشاهد",
    "Physician Certification": "إفادة الطبيب",
    "Signatures": "التوقيعات",
    "Patient / Guardian Signature": "توقيع المريض / الولي",
    "Physician Signature": "توقيع الطبيب",
    "Witness Signature": "توقيع الشاهد",
    "Verification QR": "رمز التحقق",
    "Audit Checksum": "رمز التحقق التدقيقي",
    "Generated By Model": "النموذج المستخدم في التوليد",
    "Finalized At": "وقت الاعتماد النهائي",
    "Version": "الإصدار",
    "Status": "الحالة",
    "Reference": "المرجع",
    "Generated At": "وقت الإصدار"
  };

  return labels[label] || label;
}

function cleanupText(value: unknown, options: PdfTextSanitizeOptions = {}): string {
  return sanitizePdfDisplayText(value, {
    preserveNewlines: false,
    ...options,
  });
}

function sanitizePdfDisplayText(value: unknown, options: PdfTextSanitizeOptions = {}): string {
  if (value == null) return "";

  const { context = "general", preserveNewlines = true } = options;
  const normalized = String(value);
  const lang = /[\u0600-\u06FF]/.test(normalized) ? "ar" : "en";

  return sanitizeSharedPdfDisplayText(normalized, {
    lang,
    preserveNewlines,
    medicalContext: context === "medical-header" || lang === "ar",
  });
}

function renderText(
  value: unknown,
  options: PdfTextSanitizeOptions & { fallback?: string } = {},
): string {
  const { fallback = "-", ...sanitizeOptions } = options;
  const normalized = sanitizePdfDisplayText(value, sanitizeOptions);
  return escapeHtml(normalized || fallback);
}

function extractLocalizedApprovedSourceTitle(
  value: string | null | undefined,
  locale: "ar" | "en",
): string {
  const normalized = sanitizePdfDisplayText(value, {
    context: "medical-header",
    preserveNewlines: false,
  });

  if (!normalized) {
    return "";
  }

  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return locale === "ar" ? parts[parts.length - 1] : parts[0];
  }

  return normalized;
}

function buildEnglishConsentTitle(input: {
  approvedSourceTitle: string | null;
  templateTitle: string | null;
  formCode: string | null;
}): string {
  const baseTitle = sanitizePdfDisplayText(
    extractLocalizedApprovedSourceTitle(input.approvedSourceTitle, "en")
      || input.templateTitle
      || "Critical Care Consent",
    {
      context: "medical-header",
      preserveNewlines: false,
    }
  ).replace(/\s*\/\s*$/, "");
  const formCode = sanitizePdfDisplayText(input.formCode, {
    context: "reference",
    preserveNewlines: false,
  });

  return formCode ? `${baseTitle} / ${formCode}` : baseTitle;
}

function sanitizeDeepArabicValue(value: unknown, preserveNewlines = false): string {
  return deepSanitizeArabicText(value, {
    preserveNewlines,
    medicalContext: true,
  });
}

function applyFinalPdfBoundarySanitizer(value: unknown): string {
  const normalized = sanitizeDeepArabicValue(value, true)
    .replace(/[\uFFFE\uFFFF\uFFFD￾]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2060\uFEFF]/g, "")
    .replace(/المركز الطيب الدويل/g, "المركز الطبي الدولي")
    .replace(/المركز الطيب الدولي/g, "المركز الطبي الدولي")
    .replace(/موافقة مستنرية/g, "موافقة مستنيرة")
    .replace(/نموذج الموافقة المستنرية/g, "نموذج الموافقة المستنيرة")
    .replace(/رقم الملف الطيب/g, "رقم الملف الطبي")
    .replace(/المحتوى الطيب/g, "المحتوى الطبي")
    .replace(/السجل الطيب/g, "السجل الطبي")
    .replace(/الفيديو الطيب/g, "الفيديو الطبي")
    .replace(/رفّمع/g, "معرّف")
    .replace(/الزنيف/g, "النزيف")
    .replace(/الجنيب/g, "الجنبي")
    .replace(/تشخييص/g, "تشخيصي")
    .replace(/وقد الطبيب/g, "وقد شرح الطبيب")
    .replace(/لقد تم جميع البنود/g, "لقد تم شرح جميع البنود")
    .replace(/لط جميع أسئلتي/g, "لطرح جميع أسئلتي");

  return normalized;
}

function assertNoForbiddenPdfTokens(value: string, label: string): void {
  const hit = FORBIDDEN_PDF_TOKENS.find((token) => value.includes(token));
  if (hit) {
    throw new ApiError(500, `${label} contains forbidden token: ${hit}`);
  }
}

function normalizeAndValidateVerifyUrl(value: string): string {
  const normalized = value.replace(/[\uFFFE\uFFFF\uFFFD￾\s]/g, "").trim();
  assertNoForbiddenPdfTokens(normalized, "Verification URL");

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new ApiError(500, "Verification URL is invalid after sanitization");
  }

  const rebuilt = `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  assertNoForbiddenPdfTokens(rebuilt, "Verification URL");
  return rebuilt;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isProductionVerifyHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "wathiqcare.online" || normalized === "www.wathiqcare.online";
}

function resolvePublicVerifyBaseUrl(request: NextRequest): string {
  const requestOrigin = request.nextUrl.origin.replace(/\/$/, "");
  const requestHost = request.nextUrl.hostname.trim().toLowerCase();
  const runtimeIsProduction =
    (process.env.VERCEL_ENV || "").trim().toLowerCase() === "production"
    || (process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  if (runtimeIsProduction && isProductionVerifyHost(requestHost)) {
    return PRODUCTION_VERIFY_BASE_URL;
  }

  const configuredPreviewOrigin = [
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
  ]
    .map(normalizeOrigin)
    .find((origin) => {
      if (!origin) return false;

      try {
        return !isProductionVerifyHost(new URL(origin).hostname);
      } catch {
        return false;
      }
    });

  return configuredPreviewOrigin || requestOrigin;
}

function buildQrPayload(input: {
  storedPayload: string | null;
  consentReference: string;
  documentId: string;
  status: string;
  verifyUrl: string;
}): string {
  const baseSegments = [
    `CONSENT:${input.consentReference}`,
    `DOC:${input.documentId}`,
    `STATUS:${input.status}`,
    `VERIFY:${input.verifyUrl}`,
  ];

  if (!input.storedPayload?.trim()) {
    return baseSegments.join("|");
  }

  const segments = input.storedPayload
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.toUpperCase().startsWith("VERIFY:"));

  segments.push(`VERIFY:${input.verifyUrl}`);
  return segments.join("|");
}

function content(value: string | null | undefined): string {
  return renderText(value, { preserveNewlines: false });
}

function blockContent(value: string | null | undefined, context: PdfTextContext = "general"): string {
  return renderText(value, { preserveNewlines: true, context });
}

function computeFixedClauseChecksum(values: Record<string, unknown>): string {
  const normalize = (value: unknown): string => {
    if (value == null) return "";
    return String(value)
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalized = Object.keys(values)
    .sort()
    .map((key) => `${key}:${normalize(values[key])}`)
    .join("\n")
    .trim();

  if (!normalized) return "-";

  return crypto
    .createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
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
    if (normalized === "FINALIZED") return "مؤرشف نهائياً";
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

  if (!/[ØÙÃÂâï]/.test(input)) {
    return input;
  }

  try {
    const decoded = Buffer.from(input, "latin1").toString("utf8");
    if (decoded && !decoded.includes("�")) {
      return decoded;
    }
  } catch {
    // Keep original value if decoding fails.
  }

  return input;
}

function localizedCopyLabel(copyType: PdfCopyType, isAr: boolean): string {
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
    @font-face {
      font-family: 'WathiqArabic';
      src: url('${WATHIQ_ARABIC_FONT_400}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'WathiqArabic';
      src: url('${WATHIQ_ARABIC_FONT_700}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {\n        -webkit-font-smoothing: antialiased;\n        text-rendering: optimizeLegibility;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      direction: ${direction};
      font-family: ${direction === "rtl" ? "'WathiqArabic','IBM Plex Sans Arabic','Arial',sans-serif" : "'Segoe UI',Arial,sans-serif"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .enterprise-header {
      border: 1px solid #cdd6df;
      border-top: 6px solid #002B5C;
      border-bottom: 3px solid #C9A13B;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
      overflow: hidden;
    }
    .enterprise-header .eh-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 8px 10px 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .enterprise-header .eh-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #002B5C;
    }
    .enterprise-header .eh-brand img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .enterprise-header .eh-brand strong {
      display: block;
      font-size: 13pt;
      color: #002B5C;
      letter-spacing: -0.01em;
    }
    .enterprise-header .eh-brand small {
      display: block;
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .enterprise-header .eh-verify {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #002B5C;
      text-align: ${direction === "rtl" ? "left" : "right"};
      font-size: 7.6pt;
    }
    .enterprise-header .eh-verify img {
      width: 44px;
      height: 44px;
      border: 1px solid #d7dee8;
      background: #fff;
      padding: 2px;
    }
    .enterprise-header .eh-title {
      text-align: center;
      padding: 8px 12px 6px;
    }
    .enterprise-header .eh-kicker {
      color: #C9A13B;
      font-weight: 700;
      font-size: 8pt;
      letter-spacing: .04em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .enterprise-header h1 {
      margin: 0;
      font-size: 17pt;
      color: #002B5C;
      line-height: 1.2;
    }
    .enterprise-header p {
      margin: 3px 0 0;
      color: #334155;
      font-size: 9pt;
      line-height: 1.35;
    }
    .enterprise-header .eh-chips {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      padding: 8px 10px 10px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .enterprise-header .eh-chip {
      border: 1px solid #d7dee8;
      border-radius: 6px;
      background: #fff;
      padding: 5px 6px;
      min-height: 34px;
    }
    .enterprise-header .eh-chip span {
      display: block;
      color: #64748b;
      font-size: 6.8pt;
      margin-bottom: 2px;
    }
    .enterprise-header .eh-chip strong {
      display: block;
      color: #002B5C;
      font-size: 8pt;
      line-height: 1.25;
      word-break: break-word;
    }
    .enterprise-header .eh-chip strong.ref-id {
      display: inline-block;
      max-width: 100%;
      font-size: 7.5pt;
      white-space: nowrap;
      overflow-wrap: normal;
      word-break: keep-all;
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
    .card pre {\n        white-space: pre-wrap;\n        overflow-wrap: anywhere;\n        unicode-bidi: plaintext;
      margin: 2px 0 6px;
      white-space: pre-wrap;
      font-family: inherit;
      background: #f6f9fc;
      border: 1px solid #cdd6df;
      padding: 5px;
    }
    .card p,
    .legal p {
      text-align: justify;
      text-justify: inter-word;
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
    .qr small.verify-url {
      direction: ltr;
      unicode-bidi: plaintext;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .edu-visual-thumb {
      margin-top: 8px;
      border: 1px solid #d7dee8;
      background: #f8fafc;
      padding: 6px;
      max-width: 220px;
    }
    .edu-visual-thumb img {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .edu-link {
      direction: ltr;
      unicode-bidi: plaintext;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
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
  educationStepNumber: number;
  educationStepNameEn: string;
  educationStepNameAr: string;
  visualAidDisplayed: boolean;
  visualAidTypeEn: string;
  visualAidTypeAr: string;
  visualAidClinicalTopic: string | null;
  visualAidGeneratedAt: Date | null;
  visualAidPurposeEn: string;
  visualAidPurposeAr: string;
  visualAidDisclaimerEn: string;
  visualAidDisclaimerAr: string;
  visualAidSourceEn: string | null;
  visualAidSourceAr: string | null;
  visualAidAssetId: string | null;
  visualAidUrl: string | null;
  visualAidViewedAt: Date | null;
  patientAcknowledgementStatus: string | null;
  visualAidThumbnailUrl: string | null;
  visualAidApproved: boolean;
};

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asSanitizedText(value: unknown, context: PdfTextContext = "medical-header"): string | null {
  if (typeof value !== "string") return null;
  const normalized = sanitizePdfDisplayText(value, {
    context,
    preserveNewlines: false,
  });
  return normalized || null;
}

function resolveApprovedVisualAidMetadata(latestMetadata: Record<string, unknown>) {
  const executionContext = asRecord(latestMetadata.executionContext);
  const executionEducation = asRecord(executionContext?.education);
  const visualAid =
    asRecord(latestMetadata.educationVisualAid)
    || asRecord(executionEducation?.educationVisualAid)
    || asRecord(latestMetadata.visualAid);
  const visualAidApproved =
    asBoolean(latestMetadata.visualAidApproved)
    ?? asBoolean(latestMetadata.isApproved)
    ?? asBoolean(visualAid.approvedForEducation)
    ?? asBoolean(visualAid.isApproved)
    ?? false;
  const approvedVisualAidUrl = visualAidApproved
    ? (asSanitizedText(latestMetadata.visualAidUrl, "url") || asSanitizedText(visualAid.imageUrl, "url") || asSanitizedText(visualAid.url, "url"))
    : null;
  const approvedThumbnailUrl = visualAidApproved
    ? (asSanitizedText(latestMetadata.visualAidThumbnailUrl, "url") || asSanitizedText(visualAid.thumbnailUrl, "url"))
    : null;

  return {
    visualAidDisplayed:
      asBoolean(latestMetadata.visualAidDisplayed)
      ?? asBoolean(visualAid.displayed)
      ?? Boolean(approvedVisualAidUrl || approvedThumbnailUrl),
    visualAidTypeEn:
      asSanitizedText(latestMetadata.visualAidTypeEn)
      || asSanitizedText(visualAid.visualType)
      || asSanitizedText(visualAid.typeEn)
      || "AI-assisted 3D Anatomy / Clinical Illustration",
    visualAidTypeAr:
      asSanitizedText(latestMetadata.visualAidTypeAr)
      || asSanitizedText(visualAid.typeAr)
      || "نموذج تشريحي ثلاثي الأبعاد / رسم سريري مدعوم بالذكاء الاصطناعي",
    visualAidClinicalTopic:
      asSanitizedText(latestMetadata.visualAidClinicalTopic)
      || asSanitizedText(visualAid.clinicalTopic),
    visualAidGeneratedAt:
      asDate(latestMetadata.visualAidGeneratedAt)
      || asDate(latestMetadata.generatedAt)
      || asDate(latestMetadata.displayedAt)
      || asDate(visualAid.generatedAt),
    visualAidPurposeEn:
      asSanitizedText(latestMetadata.visualAidPurposeEn)
      || asSanitizedText(visualAid.purposeEn)
      || "Patient education only; not diagnostic interpretation",
    visualAidPurposeAr:
      asSanitizedText(latestMetadata.visualAidPurposeAr)
      || asSanitizedText(visualAid.purposeAr)
      || "للتثقيف فقط؛ وليس للتشخيص أو تفسير الصور الطبية",
    visualAidDisclaimerEn:
      asSanitizedText(latestMetadata.visualAidDisclaimerEn)
      || asSanitizedText(visualAid.disclaimerEn)
      || "This visual is for patient education only and does not replace physician explanation.",
    visualAidDisclaimerAr:
      asSanitizedText(latestMetadata.visualAidDisclaimerAr)
      || asSanitizedText(visualAid.disclaimerAr)
      || "هذه الصورة للتثقيف فقط ولا تغني عن شرح الطبيب.",
    visualAidSourceEn: asSanitizedText(latestMetadata.visualAidSourceEn) || asSanitizedText(visualAid.sourceEn) || asSanitizedText(visualAid.source),
    visualAidSourceAr: asSanitizedText(latestMetadata.visualAidSourceAr) || asSanitizedText(visualAid.sourceAr) || "مولد بالذكاء الاصطناعي",
    visualAidAssetId: asSanitizedText(latestMetadata.visualAidAssetId, "reference") || asSanitizedText(visualAid.visualAssetId, "reference") || asSanitizedText(visualAid.assetId, "reference"),
    visualAidUrl: approvedVisualAidUrl,
    visualAidViewedAt:
      asDate(latestMetadata.visualAidViewedAt)
      || asDate(latestMetadata.viewedAt)
      || asDate(latestMetadata.displayedAt)
      || asDate(latestMetadata.generatedAt)
      || asDate(visualAid.generatedAt)
      || asDate(visualAid.viewedAt),
    patientAcknowledgementStatus:
      asSanitizedText(latestMetadata.patientAcknowledgementStatus)
      || asSanitizedText(visualAid.patientAcknowledgementStatus),
    visualAidThumbnailUrl: approvedThumbnailUrl,
    visualAidApproved,
  };
}

function extractEducationEvidenceSummary(input: {
  auditEvents: Array<{ action: string; source: string | null; createdAt: Date; metadata: unknown }>;
  hasPatientSignature: boolean;
  documentMetadata?: unknown;
}): EducationEvidenceSummary {
  const educationEvents = input.auditEvents.filter((event) => {
    const source = (event.source || "").toLowerCase();
    return source === "patient-education" || event.action.startsWith("EDUCATION_") || event.action.startsWith("UNDERSTANDING_");
  });

  const documentMetadata = asRecord(input.documentMetadata);
  const documentExecutionContext = asRecord(documentMetadata.executionContext);
  const documentEducation = asRecord(documentExecutionContext.education);
  const viewedAtFromMetadata =
    asDate(documentEducation.viewedAt)
    || asDate(documentMetadata.viewedAt)
    || asDate(documentEducation.displayedAt)
    || asDate(documentMetadata.displayedAt);
  const completedAtFromMetadata =
    asDate(documentEducation.completedAt)
    || asDate(documentMetadata.completedAt)
    || viewedAtFromMetadata;
  const latestMetadata = educationEvents.length > 0 ? asRecord(educationEvents[educationEvents.length - 1].metadata) : {};
  const effectiveMetadata = {
    ...documentMetadata,
    ...documentEducation,
    ...latestMetadata,
    executionContext: {
      ...documentExecutionContext,
      education: {
        ...documentEducation,
        ...latestMetadata,
      },
    },
  };

  const viewedAt = educationEvents.length > 0 ? educationEvents[0].createdAt : viewedAtFromMetadata;
  const completedAt =
    educationEvents.find((event) => event.action === "EDUCATION_COMPLETED")?.createdAt
    || (educationEvents.length > 0 ? educationEvents[educationEvents.length - 1].createdAt : completedAtFromMetadata);

  const scoreValue = typeof effectiveMetadata.score === "number" && Number.isFinite(effectiveMetadata.score)
    ? effectiveMetadata.score
    : null;
  const attemptsValue = typeof effectiveMetadata.attempts === "number" && Number.isFinite(effectiveMetadata.attempts)
    ? effectiveMetadata.attempts
    : null;
  const faqViewedCountValue = typeof effectiveMetadata.faqViewedCount === "number" && Number.isFinite(effectiveMetadata.faqViewedCount)
    ? effectiveMetadata.faqViewedCount
    : 0;
  const patientAcknowledgedFromEvent =
    educationEvents.some((event) => {
      const metadata = asRecord(event.metadata);
      return metadata.patientAcknowledged === true || metadata.acknowledged === true || metadata.passed === true;
    })
    || educationEvents.some((event) => event.action === "UNDERSTANDING_PASSED")
    || educationEvents.some((event) => event.action === "EDUCATION_COMPLETED");
  const visualAidMetadata = resolveApprovedVisualAidMetadata(effectiveMetadata);
  const educationDisplayedFromMetadata =
    asBoolean(effectiveMetadata.educationDisplayed)
    ?? asBoolean(documentEducation.educationDisplayed)
    ?? asBoolean(documentMetadata.educationDisplayed)
    ?? false;
  const patientAcknowledgedFromMetadata =
    asBoolean(effectiveMetadata.patientAcknowledged)
    ?? asBoolean(effectiveMetadata.acknowledgement)
    ?? asBoolean(documentEducation.patientAcknowledged)
    ?? false;

  return {
    viewed:
      educationEvents.length > 0
      || educationDisplayedFromMetadata
      || Boolean(viewedAt)
      || visualAidMetadata.visualAidDisplayed,
    viewedAt,
    completedAt,
    language:
      typeof effectiveMetadata.educationLanguage === "string" && effectiveMetadata.educationLanguage.trim() !== ""
        ? effectiveMetadata.educationLanguage
        : typeof effectiveMetadata.language === "string" && effectiveMetadata.language.trim() !== ""
          ? effectiveMetadata.language
        : null,
    templateCode:
      typeof effectiveMetadata.templateCode === "string" && effectiveMetadata.templateCode.trim() !== ""
        ? effectiveMetadata.templateCode
        : null,
    score: scoreValue,
    attempts: attemptsValue,
    faqViewedCount: faqViewedCountValue,
    patientAcknowledged: patientAcknowledgedFromEvent || patientAcknowledgedFromMetadata || input.hasPatientSignature,
    educationStepNumber: asNumber(effectiveMetadata.educationStepNumber) ?? 5,
    educationStepNameEn:
      asSanitizedText(effectiveMetadata.educationStepNameEn)
      || "Patient Education & Visual Understanding",
    educationStepNameAr:
      asSanitizedText(effectiveMetadata.educationStepNameAr)
      || "التثقيف وفهم الإجراء بصرياً",
    ...visualAidMetadata,
  };
}

function educationVisualAidHtml(args: {
  isAr: boolean;
  visualAidDisplayed: string;
  visualAidType: string;
  visualAidClinicalTopic: string | null;
  visualAidGeneratedAt: string | null;
  visualAidSource: string | null;
  visualAidAssetId: string | null;
  visualAidUrl: string | null;
  visualAidViewedAt: string | null;
  disclaimer: string;
  visualAidThumbnailUrl: string | null;
  patientAcknowledgementStatus: string | null;
}): string {
  const thumbnailHtml = args.visualAidThumbnailUrl
    ? `<div class="edu-visual-thumb"><img src="${escapeHtml(args.visualAidThumbnailUrl)}" alt="Approved visual aid thumbnail" /></div>`
    : "";
  const linkHtml = args.visualAidUrl
    ? `<p><strong>${args.isAr ? arPdfLabel("Visual Aid Link") : "Visual Aid Link"}:</strong> <span class="edu-link">${renderText(args.visualAidUrl, { context: "url", fallback: "" })}</span></p>`
    : "";

  return `
        <p><strong>${args.isAr ? arPdfLabel("Visual Aid Displayed") : "Visual Aid Displayed"}:</strong> ${content(args.visualAidDisplayed)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Visual Aid Type") : "Visual Aid Type"}:</strong> ${content(args.visualAidType)}</p>
      <p><strong>${args.isAr ? arPdfLabel("Clinical Topic") : "Clinical Topic"}:</strong> ${content(args.visualAidClinicalTopic)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Visual Aid Source") : "Visual Aid Source"}:</strong> ${content(args.visualAidSource)}</p>
      <p><strong>${args.isAr ? arPdfLabel("Generated At") : "Generated At"}:</strong> ${content(args.visualAidGeneratedAt)}</p>
      <p><strong>${args.isAr ? arPdfLabel("Disclaimer") : "Disclaimer"}:</strong> ${content(args.disclaimer)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Viewed At") : "Viewed At"}:</strong> ${content(args.visualAidViewedAt)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Visual Aid Asset ID") : "Visual Aid Asset ID"}:</strong> ${content(args.visualAidAssetId)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Patient Acknowledgement") : "Patient Acknowledgement"}:</strong> ${content(args.patientAcknowledgementStatus)}</p>
        ${thumbnailHtml}
        ${linkHtml}`;
}

function methodLabel(method: string, isAr: boolean): string {
  if (method === "combined-tablet-and-otp") return isAr ? "توقيع لوحي + OTP" : "Tablet + OTP";
  if (method === "tablet-drawn-signature") return isAr ? "توقيع يدوي على جهاز لوحي" : "Tablet Handwritten Signature";
  if (method === "combined-biometric-and-otp") return isAr ? "تحقق ببصمة + OTP" : "Biometric + OTP";
  if (method === "biometric-fingerprint") return isAr ? "تحقق ببصمة" : "Biometric Verification";
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
    args.signature.deviceReference ? `<div>${escapeHtml(args.isAr ? arPdfLabel("Device Ref") : "Device Ref")}: ${escapeHtml(args.signature.deviceReference)}</div>` : "",
    args.signature.transactionId ? `<div>${escapeHtml(args.isAr ? arPdfLabel("Transaction ID") : "Transaction ID")}: ${escapeHtml(args.signature.transactionId)}</div>` : "",
  ].filter(Boolean).join("");

  return `<div class="box"><strong>${escapeHtml(args.label)}</strong>${imageHtml}<div class="sig-meta">${metaLines}</div></div>`;
}



function criticalCareArabicProcedureDetails(): string {
  return [
    "موافقة الرعاية الحرجة (IMC MR 1363).",
    "تؤكد هذه الموافقة أن طبيب وحدة العناية المركزة قد ناقش مع المريض أو ممثله النظامي الحالة الصحية التي تستدعي الدخول إلى وحدة العناية المركزة، وطبيعة الإجراءات التداخلية اللازمة، وفوائدها، وبدائلها، والمخاطر والمضاعفات المحتملة المرتبطة بها.",
    "تشمل إجراءات الرعاية الحرجة الواردة في هذا النموذج، بحسب الحاجة الطبية: إدخال قسطرة وريدية مركزية، إدخال قسطرة شريانية، إدخال قسطرة غسيل كلوي، إدخال أنبوب تنفس، إدخال قسطرة في الشريان الرئوي، إدخال أنبوب صدري أو بزل السائل الجنبي أو الاستسقاء، تنظير القصبات التشخيصي والعلاجي، استخدام المهدئات أو التخدير، والتقاط واستخدام الصور والفيديو الطبي لأغراض التوثيق والمتابعة مع المحافظة على خصوصية المريض.",
    "تظل هذه الموافقة سارية حتى الخروج من المستشفى ما لم يتم إلغاؤها من قبل المريض أو القريب المسؤول، مع إمكانية طلب موافقة إضافية عند الحاجة إلى إجراءات أخرى غير مشمولة أو أقل شيوعاً، ما لم تكن الحالة طارئة ولا يوجد وقت كافٍ للحصول على الإذن."
  ].join("\n\n");
}

function optionalMedicalBlock(label: string, value: string | null | undefined, isAr: boolean): string {
  const normalized = sanitizePdfDisplayText(value, { preserveNewlines: true });
  if (!normalized) {
    return "";
  }

  const displayLabel = isAr ? arPdfLabel(label) : label;
  return `<p><strong>${displayLabel}:</strong></p><pre>${blockContent(normalized)}</pre>`;
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
  educationStepLabel: string;
  educationViewedAt: string | null;
  educationCompletedAt: string | null;
  educationLanguage: string | null;
  educationTemplateCode: string | null;
  educationScore: string | null;
  educationAttempts: string | null;
  educationFaqViewedCount: string | null;
  patientAcknowledged: string;
  patientAcknowledgementStatus: string | null;
  visualAidDisplayed: string;
  visualAidType: string;
  visualAidClinicalTopic: string | null;
  visualAidSource: string | null;
  visualAidPurposeDisclaimer: string;
  visualAidAssetId: string | null;
  visualAidUrl: string | null;
  visualAidGeneratedAt: string | null;
  visualAidViewedAt: string | null;
  visualAidThumbnailUrl: string | null;
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
      <header class="enterprise-header">
        <div class="eh-top">
          <div class="eh-brand">
            <img src="${escapeHtml(args.logoSrc)}" alt="International Medical Center" />
            <div>
              <strong>${args.isAr ? "المركز الطبي الدولي" : "International Medical Center"}</strong>
              <small>${args.isAr ? "سجل موافقة طبية قانونية رقمية" : "Medico-Legal Digital Consent Record"}</small>
            </div>
          </div>
          <div class="eh-verify">
            <div>
              <strong>${args.isAr ? "تحقق من المستند" : "Verify Document"}</strong><br />
              ${args.isAr ? "مؤمّن بواسطة WathiqCare" : "Secured by WathiqCare"}
            </div>
            <img src="${args.qrDataUrl}" alt="QR" />
          </div>
        </div>

        <div class="eh-title">
          <div class="eh-kicker">${args.isAr ? "موافقة مستنيرة رقمية" : "Digital Informed Consent"}</div>
          <h1>${renderText(args.title, { context: "medical-header", fallback: "" })}</h1>
          <p>${renderText(args.subtitle, { context: "medical-header", fallback: "" })}</p>
        </div>

        <div class="eh-chips">
          <div class="eh-chip"><span>${args.isAr ? arPdfLabel("Reference") : "Reference"}</span><strong class="ref-id">${renderText(args.reference, { context: "reference", fallback: "" })}</strong></div>
          <div class="eh-chip"><span>${args.isAr ? arPdfLabel("Status") : "Status"}</span><strong>${renderText(args.status, { fallback: "" })}</strong></div>
          <div class="eh-chip"><span>${args.isAr ? arPdfLabel("Version") : "Version"}</span><strong>${renderText(args.version, { fallback: "" })}</strong></div>
          <div class="eh-chip"><span>${args.isAr ? arPdfLabel("Timestamp") : "Timestamp"}</span><strong>${renderText(args.generatedAt, { fallback: "" })}</strong></div>
        </div>
      </header>

      <div class="warn">${renderText(args.warning, { fallback: "" })}</div>

      <section class="evidence">
        <div><strong>${args.isAr ? arPdfLabel("Copy Type") : "Copy Type"}:</strong> ${content(args.copyLabel)}</div>
        <div><strong>${args.isAr ? arPdfLabel("Integrity Checksum") : "Integrity Checksum"}:</strong> ${content(args.auditChecksum)}</div>
        <div><strong>${args.isAr ? arPdfLabel("Generated By Model") : "Generated By Model"}:</strong> ${content(args.generatedByModel)}</div>
        <div><strong>${args.isAr ? arPdfLabel("Finalized At") : "Finalized At"}:</strong> ${content(args.finalizedAt)}</div>
        <div><strong>${args.isAr ? arPdfLabel("Physician Identifier") : "Physician Identifier"}:</strong> ${content(args.physicianIdentifier)}</div>
        <div><strong>${args.isAr ? arPdfLabel("Document Version") : "Document Version"}:</strong> ${content(args.version)}</div>
      </section>

      <section class="grid2">
        <article class="card">
          <h3>${args.isAr ? arPdfLabel("Patient Profile") : "Patient Profile"}</h3>
          <p><strong>${args.isAr ? arPdfLabel("Name") : "Name"}:</strong> ${content(args.patient)}</p>
          <p><strong>${args.isAr ? arPdfLabel("MRN") : "MRN"}:</strong> ${content(args.mrn)}</p>
          <p><strong>${args.isAr ? arPdfLabel("DOB") : "DOB"}:</strong> ${content(args.dob)}</p>
          <p><strong>${args.isAr ? arPdfLabel("Gender") : "Gender"}:</strong> ${content(args.gender)}</p>
          <p><strong>${args.isAr ? arPdfLabel("Diagnosis") : "Diagnosis"}:</strong> ${content(args.diagnosis)}</p>
        </article>
        <article class="card">
          <h3>${args.isAr ? arPdfLabel("Physician Profile") : "Physician Profile"}</h3>
          <p><strong>${args.isAr ? arPdfLabel("Name") : "Name"}:</strong> ${content(args.physician)}</p>
          <p><strong>${args.isAr ? arPdfLabel("License") : "License"}:</strong> ${content(args.physicianLicense)}</p>
          <p><strong>${args.isAr ? arPdfLabel("Specialty") : "Specialty"}:</strong> ${content(args.specialty)}</p>
          <p><strong>${args.isAr ? arPdfLabel("Consent Type") : "Consent Type"}:</strong> ${content(args.consentType)}</p>
          <p><strong>${args.isAr ? arPdfLabel("Planned Procedure") : "Planned Procedure"}:</strong> ${content(args.plannedProcedure)}</p>
        </article>
      </section>

      <article class="card full">
        <h3>${args.isAr ? arPdfLabel("Medical Content") : "Medical Content"}</h3>
        <p><strong>${args.isAr ? arPdfLabel("Procedure Details") : "Procedure Details"}:</strong></p><pre>${blockContent(args.procedureDetails, "medical-header")}</pre>
        <p><strong>${args.isAr ? arPdfLabel("Risks") : "Risks"}:</strong></p><pre>${blockContent(args.risks)}</pre>
        ${optionalMedicalBlock("Side Effects", args.sideEffects, args.isAr)}
        <p><strong>${args.isAr ? arPdfLabel("Alternatives") : "Alternatives"}:</strong></p><pre>${blockContent(args.alternatives)}</pre>
        <p><strong>${args.isAr ? arPdfLabel("Refusal Risks") : "Refusal Risks"}:</strong></p><pre>${blockContent(args.refusalRisks)}</pre>
        <p><strong>${args.isAr ? arPdfLabel("Expected Outcomes") : "Expected Outcomes"}:</strong></p><pre>${blockContent(args.expectedOutcomes)}</pre>
        <p><strong>${args.isAr ? arPdfLabel("Physician Notes") : "Physician Notes"}:</strong></p><pre>${blockContent(args.physicianNotes)}</pre>
      </article>

      <article class="card full">
        <h3>${args.isAr ? arPdfLabel("Patient Education & Visual Understanding") : "Step 5 – Patient Education & Visual Understanding"}</h3>
        <p><strong>${args.isAr ? arPdfLabel("Education Step") : "Education Step"}:</strong> ${content(args.educationStepLabel)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Education Displayed") : "Education Displayed"}:</strong> ${content(args.educationViewed)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Education Opened At") : "Education Opened At"}:</strong> ${content(args.educationViewedAt)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Education Completed At") : "Education Completed At"}:</strong> ${content(args.educationCompletedAt)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Education Language") : "Education Language"}:</strong> ${content(args.educationLanguage)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Template Code") : "Template Code"}:</strong> ${content(args.educationTemplateCode)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Understanding Score") : "Understanding Score"}:</strong> ${content(args.educationScore)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Attempts") : "Attempts"}:</strong> ${content(args.educationAttempts)}</p>
        <p><strong>${args.isAr ? arPdfLabel("FAQ Items Viewed") : "FAQ Items Viewed"}:</strong> ${content(args.educationFaqViewedCount)}</p>
        <p><strong>${args.isAr ? arPdfLabel("Patient Acknowledgement") : "Patient Acknowledgement"}:</strong> ${content(args.patientAcknowledged)}</p>
${educationVisualAidHtml({
  isAr: args.isAr,
  visualAidDisplayed: args.visualAidDisplayed,
  visualAidType: args.visualAidType,
  visualAidClinicalTopic: args.visualAidClinicalTopic,
  visualAidGeneratedAt: args.visualAidGeneratedAt,
  visualAidSource: args.visualAidSource,
  visualAidAssetId: args.visualAidAssetId,
  visualAidUrl: args.visualAidUrl,
  visualAidViewedAt: args.visualAidViewedAt,
  disclaimer: args.visualAidPurposeDisclaimer,
  visualAidThumbnailUrl: args.visualAidThumbnailUrl,
  patientAcknowledgementStatus: args.patientAcknowledgementStatus,
})}
      </article>

      <article class="card full legal">
        <h3>${args.isAr ? arPdfLabel("Legal and Privacy Declarations") : "Legal and Privacy Declarations"}</h3>
        <p>${content(args.legalText)}</p>
        <p>${content(args.pdplText)}</p>
        <p>${content(args.witnessDecl)}</p>
        <p>${content(args.physicianCert)}</p>
      </article>

      <footer class="sign">
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? arPdfLabel("Evidence ID") : "Evidence ID",
          isAr: args.isAr,
          label: args.patientSignatureLabel,
          signature: args.patientSignature,
          signedAtLabel: args.isAr ? arPdfLabel("Signed At") : "Signed At",
        })}
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? arPdfLabel("Evidence ID") : "Evidence ID",
          isAr: args.isAr,
          label: args.physicianSignatureLabel,
          signature: args.physicianSignature,
          signedAtLabel: args.isAr ? arPdfLabel("Signed At") : "Signed At",
        })}
        ${signatureRoleBlock({
          evidenceLabel: args.isAr ? arPdfLabel("Evidence ID") : "Evidence ID",
          isAr: args.isAr,
          label: args.witnessSignatureLabel,
          signature: args.witnessSignature,
          signedAtLabel: args.isAr ? arPdfLabel("Signed At") : "Signed At",
        })}
        <div class="box qr"><img src="${args.qrDataUrl}" alt="QR" /><small class="verify-url">${renderText(args.qrLabel, { context: "url", fallback: "" })}</small></div>
      </footer>
      <div class="doc-footer">
        ${args.isAr ? "صادر من المركز الطبي الدولي مع حفظ الأدلة الرقمية عبر منصة واثق كير." : "Issued by International Medical Center with digital evidence preservation through WathiqCare platform."}
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
        text-align: right;
        font-family: 'WathiqArabic','IBM Plex Sans Arabic','Arial',sans-serif;
      }
      .lang-block[dir="rtl"] * {
        font-family: 'WathiqArabic','IBM Plex Sans Arabic','Arial',sans-serif !important;
      }
      .lang-block[dir="rtl"] p,
      .lang-block[dir="rtl"] div,
      .lang-block[dir="rtl"] span,
      .lang-block[dir="rtl"] strong,
      .lang-block[dir="rtl"] h1,
      .lang-block[dir="rtl"] h2,
      .lang-block[dir="rtl"] h3,
      .lang-block[dir="rtl"] pre {
        direction: rtl;
        text-align: right;
        unicode-bidi: isolate;
      }
      .lang-block[dir="ltr"] {
        direction: ltr;
        text-align: left;
        font-family: 'Segoe UI',Arial,sans-serif;
      }
      .lang-block[dir="ltr"] * {
        direction: ltr;
        unicode-bidi: isolate;
      }
      .lang-block[dir="ltr"] p,
      .lang-block[dir="ltr"] pre,
      .lang-block[dir="ltr"] .card {
        text-align: justify;
        text-justify: inter-word;
      }
      .lang-block[dir="rtl"] p,
      .lang-block[dir="rtl"] pre,
      .lang-block[dir="rtl"] .card {
        text-align: justify;
        text-justify: inter-word;
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
      const publicContext = await getSigningTokenContext(publicToken);

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

    const isBilingualSynchronized = Boolean(
      String(doc.legalTextAr || "").trim() &&
      String(doc.legalTextEn || "").trim() &&
      String(doc.pdplTextAr || "").trim() &&
      String(doc.pdplTextEn || "").trim()
    );


    const metadata = asRecord(doc.metadata);
    const approvedSource = asRecord(metadata.approvedSource);
    const approvedTemplateCode =
      typeof approvedSource.formCode === "string" && approvedSource.formCode.trim() !== ""
        ? approvedSource.formCode.trim()
        : null;
    const approvedTemplateVersion =
      typeof approvedSource.version === "string" && approvedSource.version.trim() !== ""
        ? approvedSource.version.trim()
        : null;
    const approvedLibraryName =
      typeof approvedSource.library === "string" && approvedSource.library.trim() !== ""
        ? approvedSource.library.trim()
        : null;
    const approvedSourceTitle =
      typeof approvedSource.sourceTitle === "string" && approvedSource.sourceTitle.trim() !== ""
        ? approvedSource.sourceTitle.trim()
        : null;
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

    if (!isBilingualSynchronized) {
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

    const verifyBaseUrl = resolvePublicVerifyBaseUrl(request);
    const verifyUrl = normalizeAndValidateVerifyUrl(`${verifyBaseUrl}/verify/consent/${doc.id}`);
    const qrPayload = buildQrPayload({
      storedPayload: doc.qrPayload,
      consentReference: doc.consentReference,
      documentId: doc.id,
      status: effectiveStatus,
      verifyUrl,
    });
    assertNoForbiddenPdfTokens(qrPayload, "QR payload");

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
      documentMetadata: doc.metadata,
    });
    const englishTitle = buildEnglishConsentTitle({
      approvedSourceTitle,
      templateTitle: doc.template.titleEn,
      formCode: approvedTemplateCode,
    });
    const arabicSubtitle = sanitizeDeepArabicValue(extractLocalizedApprovedSourceTitle(approvedSourceTitle, "ar") || doc.template.titleAr);
    const englishSubtitle = sanitizePdfDisplayText(doc.template.specialty || extractLocalizedApprovedSourceTitle(approvedSourceTitle, "en"), {
      context: "medical-header",
      preserveNewlines: false,
    });
    const buildArgs = (renderAr: boolean): Parameters<typeof html>[0] => {
      const localizedCopyLabel = copyTypeLabel(copyType, renderAr);

      return {
        patientSignature,
        physicianSignature,
        witnessSignature,
        isAr: renderAr,
        title: renderAr ? sanitizeDeepArabicValue("نموذج الموافقة المستنيرة") : englishTitle,
        subtitle: renderAr ? arabicSubtitle : englishSubtitle,
        reference: `${cleanupText(doc.consentReference, { context: "reference" })}${doc.case?.caseNumber ? ` | ${cleanupText(doc.case.caseNumber, { context: "reference" })}` : ""}`,
        status: statusLabel(effectiveStatus, renderAr),
        version: cleanupText(approvedTemplateVersion || doc.documentVersion || "v1.0", { context: "reference" }),
        generatedAt: formatDate(doc.createdAt, renderAr ? "ar" : "en"),
        warning: renderAr ? cleanupText(doc.aiWarningAr, { context: "medical-header" }) : cleanupText(doc.aiWarningEn, { context: "medical-header" }),
        copyLabel: localizedCopyLabel,
        watermarkLabel: `${sanitizePdfDisplayText(localizedCopyLabel, { context: "reference", preserveNewlines: false })} | ${cleanupText(doc.consentReference, { context: "reference" })}`,
        auditChecksum: cleanupText(doc.auditChecksum || doc.immutablePdfHash || "", { context: "reference" }),
        generatedByModel: cleanupText(doc.generatedByModel || "", { context: "reference" }),
        finalizedAt: effectiveFinalizedAt ? formatDate(effectiveFinalizedAt, renderAr ? "ar" : "en") : null,
        physicianIdentifier: cleanupText(doc.emrMappings[0]?.physicianIdentifier || doc.physicianLicense || "", { context: "reference" }),
        patient: cleanupText(doc.patientName),
        mrn: cleanupText(doc.mrn || "", { context: "reference" }),
        dob: cleanupText(doc.dob || ""),
        gender: cleanupText(doc.gender || ""),
        diagnosis: cleanupText(doc.diagnosis || "", { context: "medical-header" }),
        physician: cleanupText(doc.physicianName),
        physicianLicense: cleanupText(doc.physicianLicense || "", { context: "reference" }),
        specialty: cleanupText(doc.physicianSpecialty, { context: "medical-header" }),
        consentType: cleanupText(approvedLibraryName || doc.template.consentType, { context: "medical-header" }),
        plannedProcedure: cleanupText(doc.plannedProcedure || "", { context: "medical-header" }),
        procedureDetails: sanitizePdfDisplayText(renderAr ? criticalCareArabicProcedureDetails() : (doc.procedureDetails || ""), { context: "medical-header", preserveNewlines: true }),
        risks: sanitizePdfDisplayText(renderAr ? doc.risksAr || "" : doc.risksEn || "", { context: "medical-header", preserveNewlines: true }),
        sideEffects: sanitizePdfDisplayText(renderAr ? doc.sideEffectsAr || "" : doc.sideEffectsEn || "", { context: "medical-header", preserveNewlines: true }),
        alternatives: sanitizePdfDisplayText(renderAr ? doc.alternativesAr || "" : doc.alternativesEn || "", { context: "medical-header", preserveNewlines: true }),
        refusalRisks: sanitizePdfDisplayText(renderAr ? doc.refusalRisksAr || "" : doc.refusalRisksEn || "", { context: "medical-header", preserveNewlines: true }),
        expectedOutcomes: sanitizePdfDisplayText(renderAr ? doc.expectedOutcomesAr || "" : doc.expectedOutcomesEn || "", { context: "medical-header", preserveNewlines: true }),
        physicianNotes: sanitizePdfDisplayText(renderAr ? doc.physicianNotesAr || "" : doc.physicianNotesEn || "", { context: "medical-header", preserveNewlines: true }),
        educationViewed: educationEvidence.viewed ? (renderAr ? "نعم" : "Yes") : (renderAr ? "لا" : "No"),
        educationStepLabel: renderAr
          ? `الخطوة ${educationEvidence.educationStepNumber} – ${sanitizeDeepArabicValue(educationEvidence.educationStepNameAr)}`
          : `Step ${educationEvidence.educationStepNumber} – ${sanitizePdfDisplayText(educationEvidence.educationStepNameEn, { context: "medical-header", preserveNewlines: false })}`,
        educationViewedAt: educationEvidence.viewedAt ? formatDate(educationEvidence.viewedAt, renderAr ? "ar" : "en") : null,
        educationCompletedAt: educationEvidence.completedAt ? formatDate(educationEvidence.completedAt, renderAr ? "ar" : "en") : null,
        educationLanguage: cleanupText(educationEvidence.language || (doc.language || "")),
        educationTemplateCode: cleanupText(approvedTemplateCode || educationEvidence.templateCode || doc.template.templateCode || "", { context: "reference" }),
        educationScore: educationEvidence.score == null ? null : `${Math.round(educationEvidence.score)}%`,
        educationAttempts: educationEvidence.attempts == null ? null : String(educationEvidence.attempts),
        educationFaqViewedCount: String(educationEvidence.faqViewedCount),
        patientAcknowledged: educationEvidence.patientAcknowledged ? (renderAr ? "تم الإقرار" : "Acknowledged") : (renderAr ? "غير مسجل" : "Not recorded"),
        patientAcknowledgementStatus: educationEvidence.patientAcknowledgementStatus
          ? cleanupText(renderAr ? sanitizeDeepArabicValue(educationEvidence.patientAcknowledgementStatus) : educationEvidence.patientAcknowledgementStatus, { context: "medical-header" })
          : null,
        visualAidDisplayed: educationEvidence.visualAidDisplayed ? (renderAr ? "نعم" : "Yes") : (renderAr ? "لا" : "No"),
        visualAidType: cleanupText(renderAr ? educationEvidence.visualAidTypeAr : educationEvidence.visualAidTypeEn, { context: "medical-header" }),
        visualAidClinicalTopic: cleanupText(educationEvidence.visualAidClinicalTopic || "", { context: "medical-header" }) || null,
        visualAidSource: cleanupText(renderAr ? educationEvidence.visualAidSourceAr : educationEvidence.visualAidSourceEn, { context: "medical-header" }) || null,
        visualAidPurposeDisclaimer: cleanupText(
          renderAr
            ? educationEvidence.visualAidDisclaimerAr
            : educationEvidence.visualAidDisclaimerEn,
          { context: "medical-header" }
        ),
        visualAidAssetId: cleanupText(educationEvidence.visualAidAssetId || "", { context: "reference" }) || null,
        visualAidUrl: cleanupText(educationEvidence.visualAidUrl || "", { context: "url" }) || null,
        visualAidGeneratedAt: educationEvidence.visualAidGeneratedAt ? formatDate(educationEvidence.visualAidGeneratedAt, renderAr ? "ar" : "en") : null,
        visualAidViewedAt: educationEvidence.visualAidViewedAt ? formatDate(educationEvidence.visualAidViewedAt, renderAr ? "ar" : "en") : null,
        visualAidThumbnailUrl: educationEvidence.visualAidApproved ? educationEvidence.visualAidThumbnailUrl : null,
        legalText: cleanupText(renderAr ? doc.legalTextAr : doc.legalTextEn, { context: "medical-header" }),
        pdplText: cleanupText(renderAr ? doc.pdplTextAr : doc.pdplTextEn, { context: "medical-header" }),
        witnessDecl: cleanupText(renderAr ? doc.witnessDeclAr : doc.witnessDeclEn, { context: "medical-header" }),
        physicianCert: cleanupText(renderAr ? doc.physicianCertAr : doc.physicianCertEn, { context: "medical-header" }),
        patientSignatureLabel: renderAr ? "توقيع المريض / الولي" : "Patient / Guardian Signature",
        physicianSignatureLabel: renderAr ? "توقيع الطبيب" : "Physician Signature",
        witnessSignatureLabel: renderAr ? "توقيع الشاهد" : "Witness Signature",
        qrLabel: verifyUrl,
        qrDataUrl,
        logoSrc,
      };
    };

    const output = applyFinalPdfBoundarySanitizer(
      lang === "bilingual"
        ? bilingualHtml(buildArgs(true), buildArgs(false))
        : html(buildArgs(isAr))
    );
    assertNoForbiddenPdfTokens(output, "Final PDF HTML");

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
        origin: verifyBaseUrl,
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
          <span>${renderText(doc.consentReference, { context: "reference", preserveNewlines: false, fallback: "" })}</span>
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
        "X-Wathiq-Document-Version": approvedTemplateVersion || doc.documentVersion || "v1.0",
        "X-Wathiq-Wording-Version": approvedTemplateVersion || doc.documentVersion || "v1.0",
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

    const debugPdf = request.nextUrl.searchParams.get("debug") === "1";
    if (debugPdf) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : null;
      return NextResponse.json(
        {
          error: "Failed to generate consent PDF",
          message,
          stack,
        },
        { status: 500 }
      );
    }

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

