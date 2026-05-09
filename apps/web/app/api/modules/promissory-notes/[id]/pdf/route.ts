import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { toArabicWords, toEnglishWords, formatAmountNumeric } from "@/lib/amount-to-words";

const prisma = getPrisma();

// ── Browser launch (mirrors legal-case-pdf-service.ts pattern) ───────────────

function detectRuntimeTarget() {
  if (typeof window !== "undefined") return "browser";
  if (process.platform === "win32") return "local_windows";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  if (process.env.NODE_ENV === "production") return "production";
  return "local_other";
}

async function launchBrowser(): Promise<Browser> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"];
  const defaultOptions: LaunchOptions = { headless: true, args: defaultArgs };

  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // fall through
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function readMetaStr(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = meta[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function formatDate(dateStr: string, locale: "ar" | "en" = "en"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildPromissoryNoteHtml(args: {
  noteNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  issueDate: string;
  issueCity: string;
  paymentCity: string;
  debtorName: string;
  debtorId: string;
  debtorAddress: string;
  debtorMobile: string;
  debtorEmail: string;
  creditorName: string;
  creditorCR: string;
  reason: string;
  referenceNumber: string;
  generatedAt: string;
  signatureStatus: string;
  qrDataUrl: string;
  verificationUrl: string;
  language: "ar" | "en";
}) {
  const isAr = args.language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const textAlign = isAr ? "right" : "left";
  const amountNumeric = formatAmountNumeric(args.amount);
  const amountWords = isAr
    ? toArabicWords(args.amount, args.currency)
    : toEnglishWords(args.amount, args.currency);
  const dueDate = formatDate(args.dueDate, args.language);
  const issueDate = formatDate(args.issueDate, args.language);
  const generatedAt = formatDate(args.generatedAt, args.language);

  const title = isAr ? "سند لأمر" : "PROMISSORY NOTE";
  const orgNameAr = "شركة المركز الطبي الدولي";
  const orgNameEn = "International Medical Center (IMC)";

  const qrBlock = args.qrDataUrl
    ? `<div style="float:${isAr ? "right" : "left"};margin:0 0 8mm ${isAr ? "8mm" : "0"};text-align:center">
        <img src="${args.qrDataUrl}" alt="QR" style="width:28mm;height:28mm;display:block" />
        ${args.verificationUrl ? `<div style="font-size:7pt;color:#5a6a7a;max-width:32mm;word-break:break-all;margin-top:2px">${escapeHtml(args.verificationUrl)}</div>` : ""}
      </div>`
    : "";

  const partiesTable = isAr
    ? `<table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:50%;vertical-align:top;padding:3mm;background:#f8fafc;border:1px solid #e2e8f0">
            <strong style="color:#1e3a5f">بيانات المدين</strong><br/>
            <table style="width:100%;font-size:10pt;margin-top:2mm">
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">الاسم:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorName)}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">الهوية / الإقامة:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorId || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">الجوال:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorMobile || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">البريد:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorEmail || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">العنوان:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorAddress || "—")}</td></tr>
            </table>
          </td>
          <td style="width:50%;vertical-align:top;padding:3mm;background:#f8fafc;border:1px solid #e2e8f0">
            <strong style="color:#1e3a5f">بيانات الدائن</strong><br/>
            <table style="width:100%;font-size:10pt;margin-top:2mm">
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">الجهة:</td><td style="padding:1mm 2mm">${escapeHtml(orgNameAr)}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">السجل التجاري:</td><td style="padding:1mm 2mm">${escapeHtml(args.creditorCR || "—")}</td></tr>
            </table>
          </td>
        </tr>
      </table>`
    : `<table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:50%;vertical-align:top;padding:3mm;background:#f8fafc;border:1px solid #e2e8f0">
            <strong style="color:#1e3a5f">Debtor Information</strong><br/>
            <table style="width:100%;font-size:10pt;margin-top:2mm">
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Name:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorName)}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">National ID / Iqama:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorId || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Mobile:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorMobile || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Email:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorEmail || "—")}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Address:</td><td style="padding:1mm 2mm">${escapeHtml(args.debtorAddress || "—")}</td></tr>
            </table>
          </td>
          <td style="width:50%;vertical-align:top;padding:3mm;background:#f8fafc;border:1px solid #e2e8f0">
            <strong style="color:#1e3a5f">Creditor Information</strong><br/>
            <table style="width:100%;font-size:10pt;margin-top:2mm">
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Organization:</td><td style="padding:1mm 2mm">${escapeHtml(orgNameEn)}</td></tr>
              <tr><td style="color:#5a6a7a;padding:1mm 2mm">Commercial Reg. No.:</td><td style="padding:1mm 2mm">${escapeHtml(args.creditorCR || "—")}</td></tr>
            </table>
          </td>
        </tr>
      </table>`;

  const bodyText = isAr
    ? `
      <p>${qrBlock}أتعهد أنا الموقع أدناه / <strong>${escapeHtml(args.debtorName)}</strong></p>
      <p>هوية / إقامة رقم: <strong>${escapeHtml(args.debtorId || "—")}</strong></p>
      <p style="margin-top:4mm">بأن أدفع لأمر <strong>${escapeHtml(orgNameAr)}</strong> أو لأمرها مبلغاً وقدره:</p>
      <div style="border:2px solid #1e3a5f;border-radius:4px;padding:3mm 5mm;background:#f0f6ff;margin:3mm 0">
        <div style="font-size:16pt;font-weight:700;color:#1e3a5f">${escapeHtml(amountNumeric)} ${escapeHtml(args.currency)}</div>
        <div style="font-size:10pt;color:#374151;margin-top:2px">فقط: ${escapeHtml(amountWords)}</div>
      </div>
      <p>وذلك بتاريخ الاستحقاق: <strong>${escapeHtml(dueDate)}</strong></p>
      <p>مدينة الإصدار: <strong>${escapeHtml(args.issueCity || "الرياض")}</strong> — مدينة الوفاء: <strong>${escapeHtml(args.paymentCity || args.issueCity || "الرياض")}</strong></p>
      ${args.reason ? `<p>وذلك مقابل: <strong>${escapeHtml(args.reason)}</strong></p>` : ""}
      <div style="border-right:3px solid #1e3a5f;padding-right:4mm;margin:4mm 0;font-size:10.5pt;color:#374151">
        <p>ويعد هذا السند التزاماً نهائياً وغير مشروط وقابلاً للتنفيذ وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية، ولا يحق لي الاعتراض أو الامتناع عن السداد عند حلول تاريخ الاستحقاق.</p>
        <p>كما أقر بصحة جميع البيانات الواردة في هذا السند، وأتحمل كامل المسؤولية القانونية والمالية المترتبة عليه.</p>
      </div>`
    : `
      <p>${qrBlock}I, the undersigned: <strong>${escapeHtml(args.debtorName)}</strong></p>
      <p>National ID / Iqama No.: <strong>${escapeHtml(args.debtorId || "—")}</strong></p>
      <p style="margin-top:4mm">Hereby unconditionally undertake and promise to pay to the order of <strong>${escapeHtml(orgNameEn)}</strong> the amount of:</p>
      <div style="border:2px solid #1e3a5f;border-radius:4px;padding:3mm 5mm;background:#f0f6ff;margin:3mm 0">
        <div style="font-size:16pt;font-weight:700;color:#1e3a5f">${escapeHtml(amountNumeric)} ${escapeHtml(args.currency)}</div>
        <div style="font-size:10pt;color:#374151;margin-top:2px">Amount in words: ${escapeHtml(amountWords)}</div>
      </div>
      <p>On due date: <strong>${escapeHtml(dueDate)}</strong></p>
      <p>Issue city: <strong>${escapeHtml(args.issueCity || "Riyadh")}</strong> — Payment city: <strong>${escapeHtml(args.paymentCity || args.issueCity || "Riyadh")}</strong></p>
      ${args.reason ? `<p>Reason: <strong>${escapeHtml(args.reason)}</strong></p>` : ""}
      <div style="border-left:3px solid #1e3a5f;padding-left:4mm;margin:4mm 0;font-size:10.5pt;color:#374151">
        <p>This promissory note constitutes a final, binding, and unconditional financial obligation enforceable in accordance with the laws and regulations applicable in the Kingdom of Saudi Arabia.</p>
        <p>I acknowledge the correctness of all information contained herein and accept full legal and financial responsibility arising from this document.</p>
      </div>`;

  const signaturesHtml = isAr
    ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:8mm;page-break-inside:avoid">
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">توقيع المدين</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
          <div style="font-size:9pt;color:#5a6a7a">${escapeHtml(args.debtorName)}</div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">توقيع ممثل المركز الطبي الدولي</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
          <div style="font-size:9pt;color:#5a6a7a">المفوّض بالتوقيع</div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">تاريخ التوقيع</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">حالة التوقيع الإلكتروني</div>
          <div style="font-size:10pt;font-weight:600;color:#c05621;margin-top:4mm">${escapeHtml(args.signatureStatus || "في انتظار التوقيع")}</div>
        </div>
      </div>`
    : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:8mm;page-break-inside:avoid">
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">Debtor Signature</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
          <div style="font-size:9pt;color:#5a6a7a">${escapeHtml(args.debtorName)}</div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">IMC Authorized Representative Signature</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
          <div style="font-size:9pt;color:#5a6a7a">Authorized Signatory</div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">Signature Date</div>
          <div style="border-bottom:1px solid #374151;margin:6mm 0 2mm"></div>
        </div>
        <div style="border:1px solid #cbd5e0;border-radius:4px;padding:4mm;min-height:28mm;background:#fafbfc">
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;margin-bottom:3mm">Electronic Signature Status</div>
          <div style="font-size:10pt;font-weight:600;color:#c05621;margin-top:4mm">${escapeHtml(args.signatureStatus || "Pending Signature")}</div>
        </div>
      </div>`;

  const footerText = isAr
    ? `هذا المستند تم إنشاؤه إلكترونياً بواسطة منصة وثيق كير — WathiqCare`
    : `This document was electronically generated by WathiqCare Platform — منصة وثيق كير`;

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');
    @page { size: A4 portrait; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Noto Naskh Arabic', 'Amiri', serif" : "'Times New Roman', Times, serif"};
      direction: ${dir};
      text-align: ${textAlign};
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.75;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    h1 { margin: 0 0 4px; }
    p { margin: 0 0 2mm; }
    .separator { border: none; border-top: 1.5px solid #c7d2dc; margin: 5mm 0; }
    .clearfix::after { content: ""; display: table; clear: both; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8mm;gap:12mm;${isAr ? "flex-direction:row-reverse" : ""}">
    <div>
      <div style="font-size:14pt;font-weight:700;color:#1e3a5f">${isAr ? orgNameAr : orgNameEn}</div>
      <div style="font-size:9pt;color:#5a6a7a">${isAr ? orgNameEn : orgNameAr}</div>
    </div>
    <div style="text-align:center">
      <h1 style="font-size:${isAr ? "22" : "18"}pt;font-weight:700;color:#1e3a5f;letter-spacing:${isAr ? "0" : "2"}px">${title}</h1>
      <div style="font-size:9.5pt;color:#4a5568">${isAr ? "رقم السند:" : "Note No.:"} <strong>${escapeHtml(args.noteNumber)}</strong></div>
    </div>
  </div>

  <hr class="separator" />

  <!-- Body with QR -->
  <div class="clearfix" style="margin:4mm 0">
    ${bodyText}
  </div>

  <hr class="separator" />

  <!-- Parties -->
  <div style="margin:4mm 0">
    ${partiesTable}
  </div>

  <hr class="separator" />

  <!-- Metadata -->
  <div style="display:flex;flex-wrap:wrap;gap:4mm;margin:3mm 0;font-size:10pt">
    <div><span style="color:#5a6a7a;font-weight:600">${isAr ? "رقم السند:" : "Note Number:"}</span> <strong>${escapeHtml(args.noteNumber)}</strong></div>
    ${args.referenceNumber ? `<div><span style="color:#5a6a7a;font-weight:600">${isAr ? "الرقم المرجعي:" : "Reference Number:"}</span> <strong>${escapeHtml(args.referenceNumber)}</strong></div>` : ""}
    <div><span style="color:#5a6a7a;font-weight:600">${isAr ? "تاريخ الإصدار:" : "Issue Date:"}</span> <strong>${escapeHtml(issueDate)}</strong></div>
    <div><span style="color:#5a6a7a;font-weight:600">${isAr ? "تاريخ التوليد:" : "Generated At:"}</span> <strong>${escapeHtml(generatedAt)}</strong></div>
  </div>

  <hr class="separator" />

  <!-- Signatures -->
  ${signaturesHtml}

  <!-- Footer -->
  <div style="margin-top:8mm;padding-top:3mm;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8pt;color:#94a3b8;${isAr ? "flex-direction:row-reverse" : ""}">
    <span>${footerText}</span>
    <span>${escapeHtml(generatedAt)}</span>
  </div>
</body>
</html>`;
}

// ── GET /api/modules/promissory-notes/[id]/pdf ────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: Browser | null = null;

  try {
    const auth = await requireAuth(request);
    const { id } = await params;
    const lang = (request.nextUrl.searchParams.get("lang") ?? "ar") as "ar" | "en";

    if (!auth.tenant_id) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const note = await prisma.promissoryNote.findFirst({
      where: { id, tenantId: auth.tenant_id },
    });

    if (!note) {
      return NextResponse.json({ error: "Promissory note not found" }, { status: 404 });
    }

    const meta = asRecord(note.metadata);
    const generatedAt = new Date().toISOString();

    // Build QR code content
    const qrPayload = [
      `NOTE:${note.noteNumber}`,
      `DEBTOR:${note.debtorName}`,
      `AMOUNT:${note.amount.toString()} ${note.currency}`,
      `DUE:${note.dueDate.toISOString().slice(0, 10)}`,
      note.id,
    ].join("|");

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 120,
    });

    const html = buildPromissoryNoteHtml({
      noteNumber: note.noteNumber,
      amount: Number(note.amount),
      currency: note.currency,
      dueDate: note.dueDate.toISOString(),
      issueDate: note.createdAt.toISOString(),
      issueCity: readMetaStr(meta, "issue_city", "issueCity") || (lang === "ar" ? "الرياض" : "Riyadh"),
      paymentCity: readMetaStr(meta, "payment_city", "paymentCity"),
      debtorName: note.debtorName,
      debtorId: note.debtorIdNumber ?? "",
      debtorAddress: readMetaStr(meta, "debtor_address", "debtorAddress"),
      debtorMobile: readMetaStr(meta, "debtor_mobile", "debtorMobile"),
      debtorEmail: readMetaStr(meta, "debtor_email", "debtorEmail"),
      creditorName: note.issuerName ?? (lang === "ar" ? "شركة المركز الطبي الدولي" : "International Medical Center"),
      creditorCR: readMetaStr(meta, "creditor_cr", "creditorCR"),
      reason: readMetaStr(meta, "reason"),
      referenceNumber: readMetaStr(meta, "reference_number", "referenceNumber"),
      generatedAt,
      signatureStatus: note.status === "SETTLED"
        ? (lang === "ar" ? "موقع إلكترونياً" : "Electronically Signed")
        : note.status === "VOID"
          ? (lang === "ar" ? "ملغى" : "Voided")
          : (lang === "ar" ? "في انتظار التوقيع" : "Pending Signature"),
      qrDataUrl,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/pn/${note.id}`,
      language: lang,
    });

    // Render PDF
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.close();

    const safeNoteNumber = note.noteNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
      const responseBody = Buffer.from(pdfBuffer);
      return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PN-${safeNoteNumber}-${lang}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/modules/promissory-notes/[id]/pdf", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
