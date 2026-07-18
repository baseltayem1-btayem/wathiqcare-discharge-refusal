import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import puppeteer from "puppeteer";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { getConsentFieldMappingByFormId } from "@/lib/server/consent-field-mappings";
import type { ConsentFieldMapping } from "@/lib/consents/field-mapping/types";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";
import {
  IMC_APPROVED_CONSENT_FORMS_MANIFEST,
  type ImcApprovedConsentManifestItem as TypeScriptManifestItem,
} from "@/lib/server/imc-approved-consent-forms.manifest";

type CopyType = "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY";

type OverlayDocumentContext = {
  approvedConsentFormId: string | null;
  approvedTemplateTitle: string;
  caseId: string;
  caseNumber: string | null;
  clinicalConsentFormId: string | null;
  consentReference: string;
  documentId: string;
  encounterId: string | null;
  facilityName: string;
  gender: string | null;
  location: string | null;
  patientAge: string | null;
  patientDob: string | null;
  patientMrn: string | null;
  patientName: string;
  pdfTemplateUrl: string | null;
  physicianName: string | null;
  procedure: string;
  qrDataUrl: string;
  signedAtAr: string | null;
  signedAtEn: string | null;
  signatureId: string | null;
  signedStatus: string;
  sourcePath: string | null;
  verificationUrl: string;
  visitId: string | null;
  wardBed: string | null;
  wathiqLogoDataUrl: string | null;
};

const A4_PAGE = {
  width: 595.28,
  height: 841.89,
};

const OVERLAY_VIEWPORT = {
  width: 1190,
  height: 1684,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string | null | undefined): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compactWhitespace(value: string | null | undefined): string | null {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function truncateForHeader(value: string | null | undefined, maxLength = 22): string | null {
  const normalized = compactWhitespace(value);
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 8) return `${normalized.slice(0, maxLength)}...`;
  const head = Math.ceil((maxLength - 3) / 2);
  const tail = Math.floor((maxLength - 3) / 2);
  return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`;
}

function formatDateTime(value: Date | string | null | undefined, locale: "ar" | "en"): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return compactWhitespace(String(value));

  return parsed.toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAge(
  dob: string | null | undefined,
  referenceDate: Date | string | null | undefined,
): string | null {
  const parsed =
    dob
      ? new Date(dob)
      : null;

  const reference =
    referenceDate instanceof Date
      ? referenceDate
      : referenceDate
        ? new Date(referenceDate)
        : null;

  if (
    !parsed
    || Number.isNaN(parsed.getTime())
    || !reference
    || Number.isNaN(reference.getTime())
  ) {
    return null;
  }

  let years =
    reference.getFullYear()
    - parsed.getFullYear();

  const monthDelta =
    reference.getMonth()
    - parsed.getMonth();

  if (
    monthDelta < 0
    || (
      monthDelta === 0
      && reference.getDate()
        < parsed.getDate()
    )
  ) {
    years -= 1;
  }

  return years >= 0
    ? String(years)
    : null;
}

function pickFirstString(source: Record<string, unknown>, paths: string[][]): string | null {
  for (const pathSegments of paths) {
    let current: unknown = source;
    for (const segment of pathSegments) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = null;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    const value = compactWhitespace(asString(current));
    if (value) return value;
  }

  return null;
}

function renderDataRows(rows: Array<{ label: string; value: string | null }>, appendNotAvailable: boolean): string {
  return rows
    .filter((row) => appendNotAvailable || Boolean(compactWhitespace(row.value)))
    .map((row) => `
      <div class="wc-data-row">
        <div class="wc-data-label">${escapeHtml(row.label)}</div>
        <div class="wc-data-value">${escapeHtml(compactWhitespace(row.value) || "Not available")}</div>
      </div>
    `)
    .join("");
}

function renderWatermarkMarkup(): string {
  return [18, 44, 70].map((top) => `
    <div class="wc-watermark" style="top:${top}%">
      <span>تم التوقيع إلكترونياً</span>
      <span>Electronically Signed</span>
    </div>
  `).join("");
}

function buildAppendixRows(context: OverlayDocumentContext): Array<{ label: string; value: string | null }> {
  return [
    { label: "Patient Name / اسم المريض", value: context.patientName },
    { label: "MRN / رقم الملف الطبي", value: context.patientMrn },
    { label: "DOB / تاريخ الميلاد", value: context.patientDob },
    { label: "Age / العمر", value: context.patientAge },
    { label: "Gender / الجنس", value: context.gender },
    { label: "Encounter ID / رقم الزيارة", value: context.encounterId },
    { label: "Case ID / رقم الحالة", value: context.caseId },
    { label: "Case Number / رقم الملف السريري", value: context.caseNumber },
    { label: "Visit ID / رقم الزيارة البديل", value: context.visitId },
    { label: "Facility / المنشأة", value: context.facilityName },
    { label: "Location / الموقع", value: context.location || context.wardBed },
    { label: "Procedure / الإجراء", value: context.procedure },
    { label: "Physician / الطبيب", value: context.physicianName },
    { label: "Approved IMC Template / النموذج المعتمد", value: context.approvedTemplateTitle },
    { label: "Approved Consent Form ID / معرف النموذج المعتمد", value: context.approvedConsentFormId },
    { label: "Clinical Consent Form ID / معرف النموذج السريري", value: context.clinicalConsentFormId },
    { label: "Document ID / رقم المستند", value: context.documentId },
    { label: "Signature ID / رقم التوقيع", value: context.signatureId },
    { label: "Consent Reference / مرجع الموافقة", value: context.consentReference },
    { label: "Signed At / تاريخ ووقت التوقيع", value: context.signedAtEn },
    { label: "Verification URL / رابط التحقق", value: context.verificationUrl },
    { label: "PDF Template URL / رابط القالب", value: context.pdfTemplateUrl },
    { label: "Source Path / مسار المصدر", value: context.sourcePath },
    { label: "Signing Method / طريقة التوقيع", value: "OTP + electronic signature" },
  ];
}

function buildInlinePdfFontFaceCss(): string {
  const candidates = [
    path.join("@fontsource", "ibm-plex-sans-arabic", "files", "ibm-plex-sans-arabic-arabic-400-normal.woff2"),
    path.join("@fontsource", "ibm-plex-sans-arabic", "files", "ibm-plex-sans-arabic-arabic-700-normal.woff2"),
    path.join("@fontsource", "tajawal", "files", "tajawal-arabic-400-normal.woff2"),
    path.join("@fontsource", "tajawal", "files", "tajawal-arabic-700-normal.woff2"),
  ];

  const resolveBase64 = (relativePath: string): string => {
    const absoluteCandidates = [
      path.join(process.cwd(), "node_modules", relativePath),
      path.join(process.cwd(), "..", "..", "node_modules", relativePath),
    ];

    for (const candidate of absoluteCandidates) {
      if (existsSync(candidate)) {
        return readFileSync(candidate).toString("base64");
      }
    }

    return "";
  };

  const [plex400, plex700, tajawal400, tajawal700] = candidates.map(resolveBase64);
  const faces: string[] = [];

  if (plex400) {
    faces.push(`@font-face{font-family:"WathiqOverlaySans";src:url("data:font/woff2;base64,${plex400}") format("woff2");font-weight:400;font-style:normal;}`);
  }
  if (plex700) {
    faces.push(`@font-face{font-family:"WathiqOverlaySans";src:url("data:font/woff2;base64,${plex700}") format("woff2");font-weight:700;font-style:normal;}`);
  }
  if (tajawal400) {
    faces.push(`@font-face{font-family:"WathiqOverlayArabic";src:url("data:font/woff2;base64,${tajawal400}") format("woff2");font-weight:400;font-style:normal;}`);
  }
  if (tajawal700) {
    faces.push(`@font-face{font-family:"WathiqOverlayArabic";src:url("data:font/woff2;base64,${tajawal700}") format("woff2");font-weight:700;font-style:normal;}`);
  }

  return faces.join("\n");
}

async function launchOverlayBrowser(): Promise<Browser> {
  const defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--font-render-hinting=none",
    "--disable-dev-shm-usage",
    "--lang=ar-SA",
  ];

  const defaultOptions: LaunchOptions = {
    headless: true,
    args: defaultArgs,
  };

  const executableCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || "",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);

  for (const executablePath of executableCandidates) {
    if (!existsSync(executablePath)) continue;

    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath });
    } catch {
      // fall through to the next available runtime candidate
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

async function readPublicImageDataUrl(relativePath: string, mimeType: string): Promise<string | null> {
  const normalizedPath = decodeURIComponent(relativePath.replace(/^\/+/, ""));
  const candidates = [
    path.join(process.cwd(), "public", normalizedPath),
    path.join(process.cwd(), "apps", "web", "public", normalizedPath),
  ];

  for (const candidate of candidates) {
    try {
      const bytes = await readFile(candidate);
      return `data:${mimeType};base64,${bytes.toString("base64")}`;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function buildOverlayShell(args: { body: string; transparent?: boolean }): string {
  return `
    <!doctype html>
    <html lang="ar">
      <head>
<meta charset="utf-8">
        <meta charset="utf-8" />
        <style>
          ${buildInlinePdfFontFaceCss()}
          :root {
            --wc-navy: #0d2c57;
            --wc-navy-2: #143f73;
            --wc-gold: #c89f41;
            --wc-ink: #10253f;
            --wc-muted: #5e6b7f;
            --wc-line: rgba(13, 44, 87, 0.14);
            --wc-surface: rgba(255, 255, 255, 0.92);
            --wc-surface-strong: rgba(255, 255, 255, 0.97);
          }

          * { box-sizing: border-box; }
          html, body {
            width: ${OVERLAY_VIEWPORT.width}px;
            height: ${OVERLAY_VIEWPORT.height}px;
            margin: 0;
            padding: 0;
            background: ${args.transparent === false ? "#ffffff" : "transparent"};
            font-family: "WathiqOverlaySans", "WathiqOverlayArabic", "Arial", sans-serif;
            color: var(--wc-ink);
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }

          .page {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: ${args.transparent === false ? "#ffffff" : "transparent"};
          }

          .wc-watermark {
            position: absolute;
            left: 50%;
            width: 84%;
            display: flex;
            justify-content: center;
            gap: 20px;
            transform: translate(-50%, -50%) rotate(-24deg);
            color: rgba(13, 44, 87, 0.045);
            font-size: 38px;
            font-weight: 700;
            letter-spacing: 0.04em;
            white-space: nowrap;
            pointer-events: none;
          }

          .wc-watermark span:first-child {
            font-family: "WathiqOverlayArabic", "WathiqOverlaySans", sans-serif;
          }

          .wc-strip {
            position: absolute;
            left: 28px;
            right: 28px;
            top: 18px;
            min-height: 54px;
            border: 1px solid rgba(13, 44, 87, 0.18);
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(255,255,255,0.97), rgba(247,250,255,0.94));
            box-shadow: 0 10px 24px rgba(13,44,87,0.08);
            padding: 8px 12px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 88px;
            gap: 10px;
            align-items: center;
          }

          .wc-strip-compact {
            min-height: 48px;
            grid-template-columns: minmax(0, 1fr) 80px;
            padding: 7px 10px;
          }

          .wc-strip-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(200, 159, 65, 0.14);
            color: var(--wc-navy);
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 6px;
            white-space: nowrap;
          }

          .wc-strip-kicker .ar {
            font-family: "WathiqOverlayArabic", "WathiqOverlaySans", sans-serif;
          }

          .wc-meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 4px 8px;
          }

          .wc-meta-grid.compact {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .wc-meta-item {
            min-width: 0;
          }

          .wc-meta-label {
            font-size: 8px;
            font-weight: 700;
            color: #33557d;
            margin-bottom: 1px;
            white-space: nowrap;
          }

          .wc-meta-value {
            font-size: 9px;
            line-height: 1.25;
            font-weight: 600;
            color: #0d223a;
            word-break: break-word;
          }

          .wc-qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }

          .wc-qr img {
            display: block;
            width: 70px;
            height: 70px;
            border-radius: 9px;
            background: #fff;
            padding: 4px;
            box-shadow: inset 0 0 0 1px rgba(13,44,87,0.08);
          }

          .wc-qr.small img {
            width: 66px;
            height: 66px;
            border-radius: 8px;
            padding: 4px;
          }

          .wc-qr span {
            text-align: center;
            color: #27476d;
            font-size: 8px;
            line-height: 1.2;
            font-weight: 700;
          }

          .wc-data-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 12px;
          }

          .wc-data-row {
            min-width: 0;
          }

          .wc-data-label {
            font-size: 10px;
            color: #46678f;
            font-weight: 700;
            margin-bottom: 2px;
          }

          .wc-data-value {
            font-size: 12px;
            line-height: 1.45;
            color: #122843;
            font-weight: 600;
            word-break: break-word;
          }

          .wc-logo {
            height: 20px;
            width: auto;
            object-fit: contain;
          }

          .wc-appendix {
            padding: 42px 44px 34px;
            background: #fff;
          }

          .wc-appendix-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 2px solid rgba(13,44,87,0.09);
            padding-bottom: 18px;
            margin-bottom: 18px;
          }

          .wc-appendix-title {
            margin: 0;
            color: var(--wc-navy);
            font-size: 28px;
            line-height: 1.15;
          }

          .wc-appendix-subtitle {
            margin-top: 8px;
            font-size: 14px;
            color: var(--wc-muted);
            line-height: 1.5;
          }

          .wc-appendix-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 999px;
            background: rgba(200,159,65,0.16);
            color: var(--wc-navy);
            font-weight: 700;
            font-size: 13px;
            padding: 7px 12px;
            margin-top: 12px;
          }

          .wc-appendix-layout {
            display: grid;
            grid-template-columns: 1.55fr 0.85fr;
            gap: 20px;
            align-items: start;
          }

          .wc-appendix-card,
          .wc-appendix-side {
            border: 1px solid rgba(13,44,87,0.14);
            border-radius: 22px;
            background: linear-gradient(180deg, #fff, #f7fbff);
            box-shadow: 0 14px 34px rgba(13,44,87,0.07);
          }

          .wc-appendix-card {
            padding: 18px;
          }

          .wc-appendix-side {
            padding: 18px 16px;
          }

          .wc-section-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--wc-navy);
            margin: 0 0 12px;
          }

          .wc-notes {
            margin-top: 18px;
            display: grid;
            gap: 10px;
          }

          .wc-note {
            border-radius: 16px;
            background: rgba(13,44,87,0.05);
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.55;
            color: #213b58;
          }

          .wc-note .ar {
            display: block;
            margin-top: 6px;
            font-family: "WathiqOverlayArabic", "WathiqOverlaySans", sans-serif;
          }
        </style>
      </head>
      <body>
        ${args.body}
      </body>
    </html>
  `;
}

function buildSharedMetaItems(context: OverlayDocumentContext): string {
  const rows = [
    { label: "Patient / المريض", value: truncateForHeader(context.patientName, 28) },
    { label: "MRN / الملف", value: truncateForHeader(context.patientMrn, 16) },
    { label: "Document ID / رقم المستند", value: truncateForHeader(context.documentId, 18) },
    { label: "Signature ID / رقم التوقيع", value: truncateForHeader(context.signatureId, 18) },
    { label: "Consent Reference / مرجع الموافقة", value: context.consentReference },
    { label: "Signed At / تاريخ ووقت التوقيع", value: context.signedAtEn },
  ];

  return rows
    .filter((row) => Boolean(compactWhitespace(row.value)))
    .map((row) => `
      <div class="wc-meta-item">
        <div class="wc-meta-label">${escapeHtml(row.label)}</div>
        <div class="wc-meta-value">${escapeHtml(compactWhitespace(row.value) || "")}</div>
      </div>
    `)
    .join("");
}

function buildOverlayPageHtml(args: {
  context: OverlayDocumentContext;
  compact: boolean;
  pageIndex: number;
  totalPages: number;
}): string {
  const { context, compact } = args;

  return buildOverlayShell({
    body: `
      <div class="page">
        ${renderWatermarkMarkup()}
        <section class="wc-strip ${compact ? "wc-strip-compact" : ""}">
          <div>
            <div class="wc-strip-kicker">
              <span class="ar">تم التوقيع إلكترونياً</span>
              <span>Electronically Signed</span>
            </div>
            <div class="wc-meta-grid ${compact ? "compact" : ""}">
              ${buildSharedMetaItems(context)}
            </div>
          </div>
          <div class="wc-qr small">
            <img src="${context.qrDataUrl}" alt="Verify Signed Consent" />
            <span>Verify Signed Consent<br/>تحقق من الموافقة الموقعة</span>
          </div>
        </section>
      </div>
    `,
  });
}

function buildAppendixHtml(context: OverlayDocumentContext): string {
  const logo = context.wathiqLogoDataUrl
    ? `<img class="wc-logo" src="${context.wathiqLogoDataUrl}" alt="WathiqCare" />`
    : `<strong>WathiqCare</strong>`;

  return buildOverlayShell({
    transparent: false,
    body: `
      <div class="page wc-appendix">
        <header class="wc-appendix-header">
          <div>
            <h1 class="wc-appendix-title">WathiqCare Evidence Appendix</h1>
            <div class="wc-appendix-subtitle">Appendix to IMC Approved Consent Form</div>
            <div class="wc-appendix-subtitle">تم التوقيع إلكترونياً · Electronically Signed</div>
            <div class="wc-appendix-badge">Patient Information Label / ملصق بيانات المريض</div>
          </div>
          <div>${logo}</div>
        </header>

        <div class="wc-appendix-layout">
          <section class="wc-appendix-card">
            <h2 class="wc-section-title">Patient and Signature Evidence / بيانات المريض وأدلة التوقيع</h2>
            <div class="wc-data-grid">
              ${renderDataRows(buildAppendixRows(context), true)}
            </div>

            <div class="wc-notes">
              <div class="wc-note">
                This appendix does not replace the IMC approved consent form. It records the digital signing evidence, source template, and verification reference.
                <span class="ar">لا يحل هذا الملحق محل نموذج الموافقة المعتمد من IMC، وإنما يوثق أدلة التوقيع الإلكتروني ومرجع التحقق ومصدر النموذج المعتمد.</span>
              </div>
            </div>
          </section>

          <aside class="wc-appendix-side">
            <h2 class="wc-section-title">Verification / التحقق</h2>
            <div class="wc-qr" style="margin-bottom:14px;">
              <img src="${context.qrDataUrl}" alt="Verify Signed Consent" style="width:160px;height:160px;border-radius:16px;padding:8px;" />
              <span>Verify Signed Consent<br/>تحقق من الموافقة الموقعة</span>
            </div>
            <div class="wc-note">
              <strong>Verification URL / رابط التحقق</strong><br/>
              ${escapeHtml(context.verificationUrl)}
            </div>
            <div class="wc-note">
              <strong>Signing Method / طريقة التوقيع</strong><br/>
              OTP + electronic signature
            </div>
            <div class="wc-note">
              <strong>Official Evidence Status / حالة الإثبات</strong><br/>
              Electronically Signed / تم التوقيع إلكترونياً
            </div>
          </aside>
        </div>
      </div>
    `,
  });
}

async function renderOverlayPng(args: { browser: Browser; html: string }): Promise<Buffer> {
  const page = await args.browser.newPage();

  try {
    await page.setViewport({
      width: OVERLAY_VIEWPORT.width,
      height: OVERLAY_VIEWPORT.height,
      deviceScaleFactor: 1,
    });
    await page.setContent(args.html, { waitUntil: "load" });
    await page.emulateMediaType("screen");

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    return Buffer.from(
      await page.screenshot({
        type: "png",
        omitBackground: true,
      }),
    );
  } finally {
    await page.close();
  }
}

function slugify(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/["']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

async function readPublicPdf(publicPath: string): Promise<Buffer> {
  const relative = decodeURIComponent(publicPath.replace(/^\/+/, ""));
  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new ApiError(500, `IMC approved PDF file not found: ${publicPath}`);
}

async function readPublicPdfWithFallback(publicPath: string, origin: string): Promise<Buffer> {
  try {
    return await readPublicPdf(publicPath);
  } catch {
    const response = await fetch(new URL(publicPath, origin));

    if (!response.ok) {
      throw new ApiError(500, `IMC approved PDF file not fetchable: ${publicPath}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

function resolveTemplateMetadata(metadata: unknown) {
  const root = asRecord(metadata);
  const template = asRecord(root.imcApprovedTemplate);
  const publicPath = asString(template.publicPath) || asString(root.pdfTemplateUrl) || asString(root.sourcePath);
  const titleEn = asString(template.titleEn) || asString(root.approvedConsentFormTitleEn) || asString(root.clinicalConsentFormTitleEn);
  const templateType = asString(template.templateType)
    || asString(root.approvedConsentFormType)
    || asString(root.compatibilityTemplateCode)
    || "PROCEDURE_CONSENT";

  return {
    id: asString(template.id) || slugify(titleEn || publicPath.split("/").pop() || "approved-imc-consent"),
    titleEn,
    publicPath,
    source: asString(template.source) || "IMC_APPROVED_PDF_LIBRARY",
    status: asString(template.status) || "ACTIVE",
    templateType,
    checksum: asString(template.checksum) || asString(root.checksumHash),
    locked: template.locked === true,
  };
}

function toFiniteOverlayNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}


function normalizeProductionUnicodeText(
  value: unknown,
): string {
  if (
    value === null
    || value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/\r\n?/g, "\n")
    .normalize("NFC");
}

function assertProductionUnicodeIntegrity(args: {
  fieldKey: string;
  value: string;
}) {
  const compact =
    args.value.trim();

  if (!compact) {
    return;
  }

  const questionMarks =
    compact.match(/\?{4,}/g);

  const hasLettersOrNumbers =
    /[\p{L}\p{N}]/u.test(
      compact.replace(/\?/g, ""),
    );

  /*
   * Prevent silent generation of a legally defective consent when
   * upstream text has already been replaced with question marks.
   * Legitimate single punctuation marks remain allowed.
   */
  if (
    questionMarks
    && !hasLettersOrNumbers
  ) {
    throw new ApiError(
      422,
      `PDF generation blocked: Unicode text was corrupted before rendering for field "${args.fieldKey}".`,
    );
  }
}

function normalizeProductionOverlayValues(
  values: Record<string, unknown>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      const text = value.trim();

      if (text) {
        normalized[key] = text;
      }

      continue;
    }

    if (typeof value === "boolean") {
      normalized[key] = value ? "Yes" : "No";
      continue;
    }

    if (typeof value === "number") {
      normalized[key] = normalizeProductionUnicodeText(value);
      continue;
    }

    if (Array.isArray(value)) {
      const text = value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .join(", ");

      if (text) {
        normalized[key] = text;
      }

      continue;
    }

    const text = normalizeProductionUnicodeText(value).trim();

    if (text && text !== "[object Object]") {
      normalized[key] = text;
    }
  }

  return normalized;
}

function collectProductionMappingFields(
  value: unknown,
): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      collectProductionMappingFields(item),
    );
  }

  const record = asRecord(value);

  if (Object.keys(record).length === 0) {
    return [];
  }

  const nested = Object.values(record).flatMap((item) =>
    collectProductionMappingFields(item),
  );

  const key = asString(record.key);
  const placement =
    getProductionMappingPlacement(record);

  return key && placement
    ? [record, ...nested]
    : nested;
}

function getProductionMappingPlacement(
  field: Record<string, unknown>,
  languageVariant: "DEFAULT" | "ARABIC" = "DEFAULT",
): Record<string, unknown> | null {
  const languageCandidates =
    languageVariant === "ARABIC"
      ? [
          asRecord(field.arabicCoordinates),
          asRecord(field.coordinates),
        ]
      : [
          asRecord(field.coordinates),
        ];

  const candidates = [
    ...languageCandidates,
    asRecord(field.placement),
    asRecord(field.position),
  ];

  for (const candidate of candidates) {
    if (Object.keys(candidate).length > 0) {
      return candidate;
    }
  }

  return null;
}

function resolveProductionPageIndex(
  rawPage: unknown,
  totalPages: number,
): number {
  const page = toFiniteOverlayNumber(rawPage) ?? 1;
  const index = page > 0 ? page - 1 : page;

  return Math.max(0, Math.min(totalPages - 1, index));
}

function buildProductionMappedTextOverlayHtml(args: {
  mapping: unknown;
  values: Record<string, string>;
  pageIndex: number;
  excludedKeys?: Set<string>;
}): {
  html: string;
  drawn: number;
} | null {
  const excludedKeys =
    args.excludedKeys || new Set<string>();

  const mappingRecord =
    asRecord(args.mapping);

  const nestedMapping =
    asRecord(mappingRecord.mapping);

  const effectiveMapping =
    Object.keys(nestedMapping).length > 0
      ? nestedMapping
      : mappingRecord;

  const coordinateMode =
    asString(
      effectiveMapping.coordinateMode,
    ).toUpperCase();

  const fields =
    collectProductionMappingFields(
      effectiveMapping,
    );

  const fieldMarkup: string[] = [];

  for (const field of fields) {
    const key =
      asString(field.key);

    if (
      !key ||
      excludedKeys.has(key) ||
      asString(field.type).toUpperCase() ===
        "SIGNATURE"
    ) {
      continue;
    }

    const rawValue =
      normalizeProductionUnicodeText(
      String(args.values[key] || "").trim(),
    );

    assertProductionUnicodeIntegrity({
      fieldKey: key,
      value: rawValue,
    });

    if (!rawValue) {
      continue;
    }

    const placement =
      getProductionMappingPlacement(
        field,
        /[؀-ۿݐ-ݿࢠ-ࣿ]/.test(
          rawValue,
        )
          ? "ARABIC"
          : "DEFAULT",
      );

    if (!placement) {
      continue;
    }

    const mappedPageIndex =
      resolveProductionPageIndex(
        placement.page ??
          placement.pageNumber,
        Math.max(
          args.pageIndex + 1,
          1,
        ),
      );

    if (
      mappedPageIndex !==
      args.pageIndex
    ) {
      continue;
    }

    const xRaw =
      toFiniteOverlayNumber(
        placement.x,
      );

    const yRaw =
      toFiniteOverlayNumber(
        placement.y,
      );

    if (
      xRaw === null ||
      yRaw === null
    ) {
      continue;
    }

    const placementCoordinateMode =
      asString(
        placement.coordinateMode,
      ).toUpperCase();

    const normalized =
      coordinateMode === "NORMALIZED" ||
      placementCoordinateMode ===
        "NORMALIZED" ||
      (
        xRaw >= 0 &&
        xRaw <= 1 &&
        yRaw >= 0 &&
        yRaw <= 1
      );

    const widthRaw =
      toFiniteOverlayNumber(
        placement.width,
      ) ??
      toFiniteOverlayNumber(
        placement.maxWidth,
      ) ??
      0.35;

    const heightRaw =
      toFiniteOverlayNumber(
        placement.height,
      ) ??
      toFiniteOverlayNumber(
        placement.maxHeight,
      ) ??
      0.06;

    const leftPercent =
      normalized
        ? xRaw * 100
        : (
            xRaw /
            A4_PAGE.width
          ) * 100;

    const topPercent =
      normalized
        ? yRaw * 100
        : (
            1 -
            yRaw /
              A4_PAGE.height
          ) * 100;

    const widthPercent =
      normalized &&
      widthRaw > 0 &&
      widthRaw <= 1
        ? widthRaw * 100
        : (
            widthRaw /
            A4_PAGE.width
          ) * 100;

    const heightPercent =
      normalized &&
      heightRaw > 0 &&
      heightRaw <= 1
        ? heightRaw * 100
        : (
            heightRaw /
            A4_PAGE.height
          ) * 100;

    const fontSize =
      toFiniteOverlayNumber(
        placement.fontSize,
      ) ??
      toFiniteOverlayNumber(
        placement.size,
      ) ??
      8;

    const fontSizePx =
      Math.max(
        10,
        fontSize *
          (
            OVERLAY_VIEWPORT.width /
            A4_PAGE.width
          ),
      );

    const isArabic =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(
        rawValue,
      );

    fieldMarkup.push(
      `<div
        class="production-mapped-text"
        dir="${isArabic ? "rtl" : "ltr"}"
        data-field-key="${escapeHtml(key)}"
        style="
          left:${leftPercent.toFixed(4)}%;
          top:${topPercent.toFixed(4)}%;
          width:${widthPercent.toFixed(4)}%;
          height:${heightPercent.toFixed(4)}%;
          font-size:${fontSizePx.toFixed(2)}px;
          text-align:${isArabic ? "right" : "left"};
        "
      >${escapeHtml(rawValue)}</div>`,
    );
  }

  if (fieldMarkup.length === 0) {
    return null;
  }

  return {
    drawn:
      fieldMarkup.length,

    html:
      buildOverlayShell({
        transparent: true,
        body: `
          <style>
            html,
            body {
              width: ${OVERLAY_VIEWPORT.width}px !important;
              height: ${OVERLAY_VIEWPORT.height}px !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: transparent !important;
            }

            .page.production-mapped-text-page {
              position: relative !important;
              width: ${OVERLAY_VIEWPORT.width}px !important;
              height: ${OVERLAY_VIEWPORT.height}px !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: transparent !important;
              box-sizing: border-box !important;
            }

            .production-mapped-text {
              position: absolute;
              box-sizing: border-box;
              overflow: hidden;
              padding: 0 2px;
              color: #0057B8;
              font-family:
                "WathiqOverlayArabic",
                "WathiqOverlaySans",
                Tahoma,
                Arial,
                sans-serif;
              font-weight: 400;
              line-height: 1.22;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              word-break: normal;
              unicode-bidi: plaintext;
              background: transparent;
            }
          </style>

          <div
            class="page production-mapped-text-page"
          >
            ${fieldMarkup.join("")}
          </div>
        `,
      }),
  };
}

async function drawProductionMappedText(args: {
  browser?: Browser;
  pdfDoc: PDFDocument;
  mapping: unknown;
  values: Record<string, string>;
  excludedKeys?: Set<string>;
}): Promise<number> {
  const pages = args.pdfDoc.getPages();
  let drawn = 0;

  const externalBrowser = args.browser;
  let browser = externalBrowser ?? null;
  let shouldCloseBrowser = false;

  if (!browser) {
    browser = await launchOverlayBrowser();
    shouldCloseBrowser = true;
  }

  try {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const overlay = buildProductionMappedTextOverlayHtml({
        mapping: args.mapping,
        values: args.values,
        pageIndex,
        excludedKeys: args.excludedKeys,
      });

      if (!overlay) {
        continue;
      }

      const overlayBytes = await renderOverlayPng({
        browser,
        html: overlay.html,
      });

      const overlayImage = await args.pdfDoc.embedPng(overlayBytes);
      const page = pages[pageIndex];

      page.drawImage(overlayImage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });

      drawn += overlay.drawn;
    }
  } finally {
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
  }

  return drawn;
}

function decodeSignatureImageDataUrl(
  value: string | null | undefined,
): {
  mimeType: "image/png" | "image/jpeg";
  bytes: Buffer;
} | null {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i,
  );

  if (!match) {
    return null;
  }

  const subtype = match[1].toLowerCase();
  const encoded = match[2].replace(/\s+/g, "");

  if (!encoded) {
    return null;
  }

  return {
    mimeType:
      subtype === "png"
        ? "image/png"
        : "image/jpeg",
    bytes: Buffer.from(encoded, "base64"),
  };
}

type SignatureFallbackPlacement = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateMode?: "NORMALIZED";
};

async function drawProductionMappedSignature(args: {
  pdfDoc: PDFDocument;
  mapping: unknown;
  fieldKey: string;
  signatureImageDataUrl: string | null | undefined;
  fallbackPlacement?: SignatureFallbackPlacement;
}) {
  const decoded = decodeSignatureImageDataUrl(args.signatureImageDataUrl);

  if (!decoded) {
    return false;
  }

  const mappingRecord = asRecord(args.mapping);
  const nestedMapping = asRecord(mappingRecord.mapping);

  const effectiveMapping =
    nestedMapping && Object.keys(nestedMapping).length > 0
      ? nestedMapping
      : mappingRecord;

  const mappingCoordinateMode = asString(effectiveMapping.coordinateMode).toUpperCase();

  const field = collectProductionMappingFields(effectiveMapping).find(
    (candidate) => asString(candidate.key) === args.fieldKey,
  );

  let placement = field ? getProductionMappingPlacement(field) : null;

  if (!placement && args.fallbackPlacement) {
    placement = args.fallbackPlacement;
  }

  if (!placement) {
    return false;
  }

  const xRaw = toFiniteOverlayNumber(placement.x);
  const yRaw = toFiniteOverlayNumber(placement.y);

  if (xRaw === null || yRaw === null) {
    return false;
  }

  const pages = args.pdfDoc.getPages();
  const pageIndex = resolveProductionPageIndex(
    placement.page ?? placement.pageNumber,
    pages.length,
  );

  const page = pages[pageIndex];

  if (!page) {
    return false;
  }

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const placementCoordinateMode = asString(
    placement.coordinateMode,
  ).toUpperCase();

  const normalized =
    mappingCoordinateMode === "NORMALIZED" ||
    placementCoordinateMode === "NORMALIZED" ||
    (
      xRaw >= 0 &&
      xRaw <= 1 &&
      yRaw >= 0 &&
      yRaw <= 1
    );

  const widthRaw =
    toFiniteOverlayNumber(placement.width) ??
    toFiniteOverlayNumber(placement.maxWidth) ??
    0.28;

  const heightRaw =
    toFiniteOverlayNumber(placement.height) ??
    toFiniteOverlayNumber(placement.maxHeight) ??
    0.075;

  const boxWidth =
    normalized && widthRaw > 0 && widthRaw <= 1
      ? widthRaw * pageWidth
      : widthRaw;

  const boxHeight =
    normalized && heightRaw > 0 && heightRaw <= 1
      ? heightRaw * pageHeight
      : heightRaw;

  const x = normalized ? xRaw * pageWidth : xRaw;
  const y = normalized
    ? pageHeight * (1 - yRaw) - boxHeight
    : yRaw;

  const image =
    decoded.mimeType === "image/png"
      ? await args.pdfDoc.embedPng(decoded.bytes)
      : await args.pdfDoc.embedJpg(decoded.bytes);

  const dimensions = image.scale(1);

  const scale = Math.min(
    boxWidth / dimensions.width,
    boxHeight / dimensions.height,
  );

  if (!Number.isFinite(scale) || scale <= 0) {
    return false;
  }

  const width = dimensions.width * scale;
  const height = dimensions.height * scale;

  page.drawImage(image, {
    x,
    y: y + Math.max(0, (boxHeight - height) / 2),
    width,
    height,
  });

  return true;
}


export async function renderImcApprovedDoctorDraftPdf(args: {
  pdfBytes: Uint8Array;
  formId: string;
  doctorCompletionValues: Record<string, unknown>;
  physicianSignatureDataUrl?: string | null;
}) {
  const mapping =
    getConsentFieldMappingByFormId(
      args.formId,
    );

  if (!mapping) {
    throw new ApiError(
      404,
      "Consent field mapping not found for draft overlay",
    );
  }

  const pdfDoc =
    await PDFDocument.load(
      args.pdfBytes,
      {
        updateMetadata: false,
      },
    );

  const normalizedValues =
    normalizeProductionOverlayValues(
      args.doctorCompletionValues,
    );

  const browser = await launchOverlayBrowser();
  let textFieldsDrawn = 0;

  try {
    textFieldsDrawn = await drawProductionMappedText({
      browser,
      pdfDoc,
      mapping,
      values: normalizedValues,
      excludedKeys: new Set([
        "patient_signature",
        "guardian_signature",
        "treating_physician_signature",
      ]),
    });
  } finally {
    await browser.close();
  }

  let physicianSignatureDrawn = false;

  if (args.physicianSignatureDataUrl?.trim()) {
    physicianSignatureDrawn = await drawProductionMappedSignature({
      pdfDoc,
      mapping,
      fieldKey: "treating_physician_signature",
      signatureImageDataUrl: args.physicianSignatureDataUrl,
    });

    if (!physicianSignatureDrawn) {
      throw new ApiError(
        409,
        "Treating physician signature coordinates are missing from the approved form mapping.",
      );
    }
  }

  const bytes = await pdfDoc.save();

  return {
    bytes: Buffer.from(bytes),
    physicianSignatureDrawn,
    textFieldsDrawn,
    renderingEngine: "approved-imc-overlay",
  };
}

function resolveTypeScriptManifestItem(args: {
  approvedConsentFormId: string;
  publicPath?: string | null;
}): TypeScriptManifestItem | null {
  return (
    IMC_APPROVED_CONSENT_FORMS_MANIFEST.find(
      (item) =>
        item.id === args.approvedConsentFormId ||
        item.slug === args.approvedConsentFormId ||
        (args.publicPath &&
          (item.pdfUrl === args.publicPath || item.patientCopyPdfUrl === args.publicPath)),
    ) || null
  );
}

function resolveBasePublicPath(args: {
  manifestItem: TypeScriptManifestItem;
  copyType: CopyType;
}): string {
  if (args.copyType === "PATIENT_COPY" && args.manifestItem.patientCopyPdfUrl) {
    return args.manifestItem.patientCopyPdfUrl;
  }
  return args.manifestItem.pdfUrl;
}

function resolveApprovedConsentFormIdFromMetadata(metadata: unknown): string {
  const root = asRecord(metadata);
  const template = asRecord(root.imcApprovedTemplate);

  if (typeof root.approvedConsentFormId === "string" && root.approvedConsentFormId.trim()) {
    return root.approvedConsentFormId.trim();
  }

  if (typeof template.id === "string" && template.id.trim()) {
    return template.id.trim();
  }

  return "";
}

async function renderImcApprovedConsentPdfCore(args: {
  pdfBytes: Uint8Array;
  copyType: CopyType;
  manifestItem: TypeScriptManifestItem;
  mapping: ConsentFieldMapping | null;
  doctorCompletionValues: Record<string, unknown>;
  physicianSignatureDataUrl: string | null | undefined;
  patientOrGuardianSignatureDataUrl: string | null | undefined;
  patientOrGuardianRole: "PATIENT" | "GUARDIAN" | null;
  signedAt: Date | string | null;
  patientName: string;
  mrn: string | null;
  dob?: string | null;
  procedure: string;
  physicianName: string | null;
  documentId: string;
  consentReference: string;
  encounterId?: string | null;
  caseId?: string | null;
  caseNumber?: string | null;
  tenantName?: string | null;
  origin?: string;
  approvedConsentFormId?: string | null;
  createdAt?: Date | string | null;
}): Promise<{
  bytes: Buffer;
  checksum: string;
  textFieldsDrawn: number;
  physicianSignatureDrawn: boolean;
  patientSignatureDrawn: boolean;
  pageCount: number;
}> {
  const pdfDoc = await PDFDocument.load(args.pdfBytes, { updateMetadata: false });
  const stableDate = args.createdAt ? new Date(args.createdAt) : new Date();
  pdfDoc.setCreationDate(stableDate);
  pdfDoc.setModificationDate(stableDate);

  const normalizedDoctorValues = normalizeProductionOverlayValues(args.doctorCompletionValues);
  const values: Record<string, string> = { ...normalizedDoctorValues };

  if (args.signedAt) {
    const formatted = formatDateTime(args.signedAt, "en");
    if (formatted) {
      values.signed_at = formatted;
    }
  }

  values.patientName = args.patientName || values.patientName || "";
  values.mrn = args.mrn || values.mrn || "";
  values.procedure = args.procedure || values.procedure || "";
  values.physicianName = args.physicianName || values.physicianName || "";

  const signatureKeys = new Set([
    "treating_physician_signature",
    "patient_signature",
    "guardian_signature",
  ]);

  const origin = args.origin || "https://wathiqcare.online";
  const verificationUrl = `${origin}/verify/consent/${args.documentId}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    width: 280,
    margin: 1,
  });
  const wathiqLogoDataUrl = await readPublicImageDataUrl("/images/wathiqcare-logo.png", "image/png");

  const patientDob = compactWhitespace(args.dob);
  const patientAge = formatAge(patientDob, args.signedAt || stableDate);
  const signedAtAr = formatDateTime(args.signedAt || stableDate, "ar");
  const signedAtEn = formatDateTime(args.signedAt || stableDate, "en");

  const overlayContext: OverlayDocumentContext = {
    approvedConsentFormId: args.approvedConsentFormId || null,
    approvedTemplateTitle: compactWhitespace(args.manifestItem.titleEn) || "",
    caseId: args.caseId || args.documentId,
    caseNumber: compactWhitespace(args.caseNumber),
    clinicalConsentFormId: null,
    consentReference: compactWhitespace(args.consentReference) || args.documentId,
    documentId: args.documentId,
    encounterId: args.encounterId || null,
    facilityName: compactWhitespace(args.tenantName) || "International Medical Center",
    gender: null,
    location: null,
    patientAge,
    patientDob,
    patientMrn: compactWhitespace(args.mrn),
    patientName: compactWhitespace(args.patientName) || "Patient",
    pdfTemplateUrl: args.manifestItem.pdfUrl,
    physicianName: compactWhitespace(args.physicianName),
    procedure: compactWhitespace(args.procedure) || args.manifestItem.titleEn,
    qrDataUrl,
    signedAtAr,
    signedAtEn,
    signatureId: null,
    signedStatus: "Electronically Signed / تم التوقيع إلكترونياً",
    sourcePath: args.manifestItem.sourceFile || args.manifestItem.pdfUrl,
    verificationUrl,
    visitId: null,
    wardBed: null,
    wathiqLogoDataUrl,
  };

  const browser = await launchOverlayBrowser();
  let textFieldsDrawn = 0;
  let physicianSignatureDrawn = false;
  let patientSignatureDrawn = false;

  try {
    if (args.copyType !== "PATIENT_COPY") {
      const firstPageOverlayBytes = await renderOverlayPng({
        browser,
        html: buildOverlayPageHtml({
          context: overlayContext,
          compact: false,
          pageIndex: 0,
          totalPages: pdfDoc.getPageCount(),
        }),
      });
      const repeatedOverlayBytes = await renderOverlayPng({
        browser,
        html: buildOverlayPageHtml({
          context: overlayContext,
          compact: true,
          pageIndex: 1,
          totalPages: pdfDoc.getPageCount(),
        }),
      });
      const appendixOverlayBytes = await renderOverlayPng({
        browser,
        html: buildAppendixHtml(overlayContext),
      });

      const firstOverlayImage = await pdfDoc.embedPng(firstPageOverlayBytes);
      const repeatedOverlayImage = await pdfDoc.embedPng(repeatedOverlayBytes);
      const appendixOverlayImage = await pdfDoc.embedPng(appendixOverlayBytes);

      pdfDoc.getPages().forEach((page, index) => {
        const image = index === 0 ? firstOverlayImage : repeatedOverlayImage;
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      });

      const appendixPage = pdfDoc.addPage([A4_PAGE.width, A4_PAGE.height]);
      appendixPage.drawImage(appendixOverlayImage, {
        x: 0,
        y: 0,
        width: appendixPage.getWidth(),
        height: appendixPage.getHeight(),
      });
    }

    if (args.mapping) {
      textFieldsDrawn = await drawProductionMappedText({
        browser,
        pdfDoc,
        mapping: args.mapping,
        values,
        excludedKeys: signatureKeys,
      });

      const lastPageIndex = Math.max(0, pdfDoc.getPageCount() - 1);
      const fallbackSignaturePlacement: SignatureFallbackPlacement = {
        page: lastPageIndex + 1,
        x: 0.15,
        y: 0.88,
        width: 0.30,
        height: 0.075,
        coordinateMode: "NORMALIZED",
      };

      if (args.physicianSignatureDataUrl?.trim()) {
        physicianSignatureDrawn = await drawProductionMappedSignature({
          pdfDoc,
          mapping: args.mapping,
          fieldKey: "treating_physician_signature",
          signatureImageDataUrl: args.physicianSignatureDataUrl,
          fallbackPlacement: fallbackSignaturePlacement,
        });
      }

      if (args.patientOrGuardianSignatureDataUrl?.trim()) {
        const fieldKey =
          args.patientOrGuardianRole === "GUARDIAN" ? "guardian_signature" : "patient_signature";
        patientSignatureDrawn = await drawProductionMappedSignature({
          pdfDoc,
          mapping: args.mapping,
          fieldKey,
          signatureImageDataUrl: args.patientOrGuardianSignatureDataUrl,
          fallbackPlacement: fallbackSignaturePlacement,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const finalBytes = await pdfDoc.save();
  const checksum = crypto.createHash("sha256").update(finalBytes).digest("hex");

  return {
    bytes: Buffer.from(finalBytes),
    checksum,
    textFieldsDrawn,
    physicianSignatureDrawn,
    patientSignatureDrawn,
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function renderImcApprovedConsentPdf(args: {
  documentId: string;
  tenantId: string;
  origin: string;
  copyType?: CopyType;
}) {
  const prisma = getPrisma();

  const doc = await prisma.consentDocument.findFirst({
    where: {
      id: args.documentId,
      tenantId: args.tenantId,
    },
    include: {
      tenant: {
        select: {
          name: true,
        },
      },
      case: {
        select: {
          caseNumber: true,
        },
      },
      signatures: {
        orderBy: [{ signedAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const copyType: CopyType = args.copyType || "PATIENT_COPY";
  const linkedTemplate = resolveTemplateMetadata(doc.metadata);
  const approvedConsentFormId =
    resolveApprovedConsentFormIdFromMetadata(doc.metadata) || linkedTemplate.id;

  let manifestItem = resolveTypeScriptManifestItem({
    approvedConsentFormId,
    publicPath: linkedTemplate.publicPath,
  });

  if (!manifestItem) {
    if (!linkedTemplate.publicPath) {
      throw new ApiError(
        409,
        "PDF generation blocked: approved IMC template is not linked to a source PDF",
      );
    }

    const slug = approvedConsentFormId.replace(/^imc-approved-/, "");
    manifestItem = {
      id: approvedConsentFormId,
      slug,
      titleEn: linkedTemplate.titleEn || approvedConsentFormId,
      titleAr: "",
      category: "general-surgery",
      specialty: "",
      procedure: linkedTemplate.titleEn || "",
      language: "bilingual",
      version: "1.0",
      approvalStatus: "approved",
      legalApprovalDate: "",
      clinicalApprovalDate: "",
      governanceOwner: "IMC Consent Governance",
      riskLevel: "standard",
      tags: [],
      pdfUrl: linkedTemplate.publicPath,
      patientCopyPdfUrl: "",
      summary: "",
      sourceFile: linkedTemplate.publicPath.split("/").pop() || `${slug}.pdf`,
    };
  }

  if (manifestItem.approvalStatus !== "approved") {
    throw new ApiError(
      409,
      `PDF generation blocked: approved IMC template status is ${manifestItem.approvalStatus}`,
    );
  }

  const publicPath = resolveBasePublicPath({ manifestItem, copyType });
  const pdfBytes = await readPublicPdfWithFallback(publicPath, args.origin);

  const metadata = asRecord(doc.metadata);
  const encounter = asRecord(metadata.encounter);
  const procedureMetadata = asRecord(metadata.procedure);

  const patientOrGuardianSignature =
    doc.signatures.find((item) => item.role === "PATIENT") ||
    doc.signatures.find((item) => item.role === "GUARDIAN") ||
    null;

  const physicianSignature =
    doc.signatures.filter((item) => item.role === "PHYSICIAN").at(-1) || null;

  const physicianSignaturePresentation = physicianSignature
    ? resolveConsentSignaturePresentation({
        metadata: physicianSignature.metadata,
        signatureMethod: physicianSignature.signatureMethod,
        signedAt: physicianSignature.signedAt,
        signerName: physicianSignature.signerName || doc.physicianName || "Physician",
      })
    : null;

  const signaturePresentation = patientOrGuardianSignature
    ? resolveConsentSignaturePresentation({
        metadata: patientOrGuardianSignature.metadata,
        signatureMethod: patientOrGuardianSignature.signatureMethod,
        signedAt: patientOrGuardianSignature.signedAt,
        signerName: patientOrGuardianSignature.signerName || doc.patientName || "Patient",
      })
    : null;

  const signedAt = patientOrGuardianSignature?.signedAt || physicianSignature?.signedAt || null;

  const encounterId = pickFirstString(
    { metadata, encounter },
    [
      ["encounter", "encounterId"],
      ["encounter", "encounterIdentifier"],
      ["metadata", "encounterId"],
      ["metadata", "encounterIdentifier"],
    ],
  );

  const procedure =
    compactWhitespace(
      doc.plannedProcedure ||
        doc.procedureDetails ||
        pickFirstString({ procedureMetadata }, [["procedureMetadata", "nameEn"]]),
    ) || manifestItem.titleEn;

  const mapping = getConsentFieldMappingByFormId(approvedConsentFormId);

  const coreResult = await renderImcApprovedConsentPdfCore({
    pdfBytes,
    copyType,
    manifestItem,
    mapping,
    doctorCompletionValues: asRecord(metadata.doctorCompletionValues),
    physicianSignatureDataUrl: physicianSignaturePresentation?.signatureImageDataUrl,
    patientOrGuardianSignatureDataUrl: signaturePresentation?.signatureImageDataUrl,
    patientOrGuardianRole:
      patientOrGuardianSignature?.role === "GUARDIAN" ? "GUARDIAN" : "PATIENT",
    signedAt,
    patientName: doc.patientName,
    mrn: doc.mrn,
    dob: doc.dob,
    procedure,
    physicianName: doc.physicianName,
    documentId: doc.id,
    consentReference: doc.consentReference,
    encounterId,
    caseId: doc.caseId,
    caseNumber: doc.case?.caseNumber,
    tenantName: doc.tenant?.name,
    origin: args.origin,
    approvedConsentFormId,
    createdAt: doc.createdAt,
  });

  return {
    bytes: coreResult.bytes,
    checksum: coreResult.checksum,
    consentReference: doc.consentReference,
    imcTemplateId: manifestItem.id,
    imcTemplateTitle: manifestItem.titleEn,
  };
}

export async function renderImcApprovedConsentPdfFromSynthetic(args: {
  formId: string;
  copyType?: CopyType;
  origin?: string;
  doctorCompletionValues?: Record<string, unknown>;
  physicianSignatureDataUrl: string;
  patientOrGuardianSignatureDataUrl: string;
  patientOrGuardianRole?: "PATIENT" | "GUARDIAN";
  signedAt?: Date | string;
  patientName?: string;
  mrn?: string;
  dob?: string | null;
  procedure?: string;
  physicianName?: string;
  documentId?: string;
  consentReference?: string;
  encounterId?: string;
  caseId?: string;
  caseNumber?: string;
  tenantName?: string;
}) {
  const copyType: CopyType = args.copyType || "PATIENT_COPY";
  const manifestItem = resolveTypeScriptManifestItem({
    approvedConsentFormId: args.formId,
  });

  if (!manifestItem) {
    throw new ApiError(404, `IMC approved form manifest entry not found for ${args.formId}`);
  }

  const publicPath = resolveBasePublicPath({ manifestItem, copyType });
  const pdfBytes = await readPublicPdf(publicPath);
  const mapping = getConsentFieldMappingByFormId(args.formId);

  return renderImcApprovedConsentPdfCore({
    pdfBytes,
    copyType,
    manifestItem,
    mapping,
    doctorCompletionValues: args.doctorCompletionValues || {},
    physicianSignatureDataUrl: args.physicianSignatureDataUrl,
    patientOrGuardianSignatureDataUrl: args.patientOrGuardianSignatureDataUrl,
    patientOrGuardianRole: args.patientOrGuardianRole || "PATIENT",
    signedAt: args.signedAt || new Date(),
    patientName: args.patientName || "Test Patient",
    mrn: args.mrn || "TEST-MRN",
    dob: args.dob,
    procedure: args.procedure || manifestItem.titleEn,
    physicianName: args.physicianName || "Dr. Test Physician",
    documentId: args.documentId || `synthetic-${args.formId}`,
    consentReference: args.consentReference || `SYNTHETIC-${args.formId}`,
    encounterId: args.encounterId,
    caseId: args.caseId,
    caseNumber: args.caseNumber,
    tenantName: args.tenantName,
    origin: args.origin,
    approvedConsentFormId: args.formId,
  });
}
