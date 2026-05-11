import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";
import { toArabicWords, toEnglishWords, formatAmountNumeric } from "@/lib/amount-to-words";

const prisma = getPrisma();
const IMC_LOGO_URL = "https://www.imc.med.sa/images/logo.jpg";

async function launchBrowser(): Promise<Browser> {
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"];
  const defaultOptions: LaunchOptions = { headless: true, args: defaultArgs };

  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    try {
      return await puppeteer.launch({ ...defaultOptions, executablePath: configuredPath });
    } catch {
      // Fall back to bundled/runtime executable.
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

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readMetaStr(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const raw = meta[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return "";
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateStr: string, locale: "ar" | "en"): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusLabelAr(statusCode: string): string {
  const normalized = statusCode.toUpperCase();
  if (normalized === "SETTLED") return "مغلق";
  if (normalized === "ACTIVE") return "نشط";
  if (normalized === "VOID") return "ملغى";
  if (normalized === "OVERDUE") return "متأخر";
  return "مسودة";
}

function statusLabelEn(statusCode: string): string {
  const normalized = statusCode.toUpperCase();
  if (normalized === "SETTLED") return "Closed";
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "VOID") return "Voided";
  if (normalized === "OVERDUE") return "Overdue";
  return "Draft";
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

function documentCss(isAr: boolean): string {
  return `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-size: 10.5pt;
      line-height: 1.45;
      direction: ${isAr ? "rtl" : "ltr"};
      text-align: ${isAr ? "right" : "left"};
      font-family: ${isAr ? "'Noto Naskh Arabic','Tahoma',serif" : "'Times New Roman',Times,serif"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pn-doc { width: 100%; }
    .pn-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border: 1px solid #cfd8dc;
      padding: 3mm 4mm;
      margin-bottom: 3mm;
    }
    .pn-logo-box {
      width: 44mm;
      min-height: 18mm;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .pn-logo { max-width: 40mm; max-height: 16mm; object-fit: contain; }
    .pn-title-wrap { display: flex; flex-direction: column; align-items: ${isAr ? "flex-end" : "flex-start"}; }
    .pn-title { margin: 0; font-size: 18pt; font-weight: 700; line-height: 1.1; }
    .pn-note-number { margin-top: 1.5mm; font-size: 10pt; }
    .pn-status-row {
      border: 1px solid #cfd8dc;
      background: #f7f9f8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2.2mm 3mm;
      margin-bottom: 3mm;
    }
    .pn-status-label { font-weight: 700; }
    .pn-status-badge {
      border: 1px solid #93a1a1;
      background: #edf3ee;
      border-radius: 2px;
      padding: 0.8mm 2.4mm;
      font-size: 9pt;
      font-weight: 700;
    }
    .pn-main-panel {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 3mm;
      margin-bottom: 3mm;
      direction: ${isAr ? "rtl" : "ltr"};
    }
    .pn-main-right,
    .pn-main-left { border: 1px solid #cfd8dc; background: #f3f6f5; }
    .pn-band-title {
      background: #dde8df;
      border-bottom: 1px solid #c4d1c7;
      padding: 1.8mm 3mm;
      font-size: 10pt;
      font-weight: 700;
    }
    .pn-details-table,
    .pn-party-table { width: 100%; border-collapse: collapse; }
    .pn-details-table td,
    .pn-party-table td { border-top: 1px solid #d7e0dc; padding: 1.8mm 3mm; vertical-align: top; }
    .pn-details-table tr:first-child td,
    .pn-party-table tr:first-child td { border-top: 0; }
    .pn-details-table td:first-child,
    .pn-party-table td:first-child { width: 40%; color: #334155; font-weight: 600; }
    .pn-amount-card { padding: 3mm; }
    .pn-amount-label { font-size: 9pt; color: #334155; font-weight: 700; }
    .pn-amount-number { margin-top: 1.4mm; margin-bottom: 2.4mm; font-size: 16pt; line-height: 1.2; font-weight: 700; }
    .pn-amount-label-words { margin-top: 1.2mm; }
    .pn-amount-words { margin-top: 1mm; font-size: 9.2pt; line-height: 1.45; }
    .pn-party-section { border: 1px solid #cfd8dc; background: #f7f9f8; margin-bottom: 3mm; }
    .pn-bottom-grid {
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: 3mm;
      margin-top: 1.5mm;
      direction: ${isAr ? "rtl" : "ltr"};
      page-break-inside: avoid;
    }
    .pn-legal-box,
    .pn-qr-box { border: 1px solid #cfd8dc; background: #fff; padding: 3mm; min-height: 54mm; }
    .pn-legal-box p { margin: 0; }
    .pn-legal-line { margin-top: 1.8mm !important; }
    .pn-qr-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .pn-qr-img { width: 27mm; height: 27mm; object-fit: contain; }
    .pn-qr-text { margin-top: 2mm; font-size: 8.2pt; line-height: 1.4; }
    .pn-qr-ref { margin-top: 1.5mm; font-size: 7.5pt; color: #334155; word-break: break-word; }
  `;
}

function buildPromissoryNoteHtml(args: {
  language: "ar" | "en";
  logoSrc: string;
  noteNumber: string;
  statusCode: string;
  amount: number;
  currency: string;
  amountWordsAr: string;
  amountWordsEn: string;
  issueDateAr: string;
  issueDateEn: string;
  dueDateAr: string;
  dueDateEn: string;
  issueCity: string;
  paymentCity: string;
  reason: string;
  creditorNameAr: string;
  creditorNameEn: string;
  creditorCR: string;
  debtorName: string;
  debtorId: string;
  qrDataUrl: string;
  verificationUrl: string;
}): string {
  const isAr = args.language === "ar";
  const amountNumeric = formatAmountNumeric(args.amount);

  const bodyAr = `
    <div class="pn-doc" dir="rtl" lang="ar">
      <header class="pn-header">
        <div class="pn-logo-box"><img src="${args.logoSrc}" alt="International Medical Center" class="pn-logo" /></div>
        <div class="pn-title-wrap">
          <h1 class="pn-title">سند لأمر</h1>
          <div class="pn-note-number">رقم السند: <strong>${escapeHtml(args.noteNumber)}</strong></div>
        </div>
      </header>

      <div class="pn-status-row">
        <span class="pn-status-label">حالة السند</span>
        <span class="pn-status-badge">${statusLabelAr(args.statusCode)}</span>
      </div>

      <section class="pn-main-panel">
        <div class="pn-main-right">
          <div class="pn-band-title">تفاصيل السند</div>
          <table class="pn-details-table">
            <tbody>
              <tr><td>تاريخ الإنشاء</td><td>${escapeHtml(args.issueDateAr)}</td></tr>
              <tr><td>تاريخ الاستحقاق</td><td>${escapeHtml(args.dueDateAr)}</td></tr>
              <tr><td>مدينة الإصدار</td><td>${escapeHtml(args.issueCity)}</td></tr>
              <tr><td>مدينة الوفاء</td><td>${escapeHtml(args.paymentCity)}</td></tr>
              <tr><td>سبب إنشاء السند</td><td>${escapeHtml(args.reason || "—")}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pn-main-left">
          <div class="pn-amount-card">
            <div class="pn-amount-label">قيمة السند رقماً</div>
            <div class="pn-amount-number">${escapeHtml(amountNumeric)} ${escapeHtml(args.currency)}</div>
            <div class="pn-amount-label pn-amount-label-words">قيمة السند كتابة</div>
            <div class="pn-amount-words">${escapeHtml(args.amountWordsAr)}</div>
          </div>
        </div>
      </section>

      <section class="pn-party-section">
        <div class="pn-band-title">تفاصيل الدائن</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>${escapeHtml(args.creditorNameAr)}</td></tr>
            <tr><td>الرقم الوطني الموحد / السجل التجاري</td><td>${escapeHtml(args.creditorCR || "—")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="pn-party-section">
        <div class="pn-band-title">تفاصيل المدين</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>${escapeHtml(args.debtorName)}</td></tr>
            <tr><td>رقم الهوية</td><td>${escapeHtml(args.debtorId || "—")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="pn-bottom-grid">
        <div class="pn-legal-box">
          <p>أتعهد بأن أدفع لأمر ${escapeHtml(args.creditorNameAr)} مبلغاً وقدره (${escapeHtml(amountNumeric)}) ${escapeHtml(args.currency)}، ${escapeHtml(args.amountWordsAr)}، وفق البيانات المذكورة أعلاه، ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.</p>
          <p class="pn-legal-line">اسم المدين: ${escapeHtml(args.debtorName)}</p>
          <p class="pn-legal-line">رقم الهوية: ${escapeHtml(args.debtorId || "—")}</p>
          <p class="pn-legal-line">تاريخ الإصدار: ${escapeHtml(args.issueDateAr)}</p>
          <p class="pn-legal-line">ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.</p>
        </div>
        <div class="pn-qr-box">
          <img src="${args.qrDataUrl}" alt="QR" class="pn-qr-img" />
          <div class="pn-qr-text">هذا السند لأمر صادر من خلال منصة واثق كير الإلكترونية، وقد تم إنشاؤه والمصادقة عليه إلكترونياً وفق البيانات المسجلة في المنصة، ويمكن التحقق منه من خلال رمز التحقق أو الرقم المرجعي.</div>
          <div class="pn-qr-ref">${escapeHtml(args.verificationUrl || args.noteNumber)}</div>
        </div>
      </section>
    </div>
  `;

  const bodyEn = `
    <div class="pn-doc" dir="ltr" lang="en">
      <header class="pn-header">
        <div class="pn-logo-box"><img src="${args.logoSrc}" alt="International Medical Center" class="pn-logo" /></div>
        <div class="pn-title-wrap">
          <h1 class="pn-title">Promissory Note</h1>
          <div class="pn-note-number">Note No.: <strong>${escapeHtml(args.noteNumber)}</strong></div>
        </div>
      </header>

      <div class="pn-status-row">
        <span class="pn-status-label">Note Status</span>
        <span class="pn-status-badge">${statusLabelEn(args.statusCode)}</span>
      </div>

      <section class="pn-main-panel">
        <div class="pn-main-right">
          <div class="pn-band-title">Note Details</div>
          <table class="pn-details-table">
            <tbody>
              <tr><td>Issue Date</td><td>${escapeHtml(args.issueDateEn)}</td></tr>
              <tr><td>Due Date</td><td>${escapeHtml(args.dueDateEn)}</td></tr>
              <tr><td>Issue City</td><td>${escapeHtml(args.issueCity)}</td></tr>
              <tr><td>Payment City</td><td>${escapeHtml(args.paymentCity)}</td></tr>
              <tr><td>Reason</td><td>${escapeHtml(args.reason || "—")}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pn-main-left">
          <div class="pn-amount-card">
            <div class="pn-amount-label">Amount (Numeric)</div>
            <div class="pn-amount-number">${escapeHtml(amountNumeric)} ${escapeHtml(args.currency)}</div>
            <div class="pn-amount-label pn-amount-label-words">Amount (In Words)</div>
            <div class="pn-amount-words">${escapeHtml(args.amountWordsEn)}</div>
          </div>
        </div>
      </section>

      <section class="pn-party-section">
        <div class="pn-band-title">Creditor Details</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>${escapeHtml(args.creditorNameEn)}</td></tr>
            <tr><td>Unified ID / Commercial Registration</td><td>${escapeHtml(args.creditorCR || "—")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="pn-party-section">
        <div class="pn-band-title">Debtor Details</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>${escapeHtml(args.debtorName)}</td></tr>
            <tr><td>ID Number</td><td>${escapeHtml(args.debtorId || "—")}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="pn-bottom-grid">
        <div class="pn-legal-box">
          <p>I undertake to pay to the order of ${escapeHtml(args.creditorNameEn)} an amount of (${escapeHtml(amountNumeric)}) ${escapeHtml(args.currency)}, ${escapeHtml(args.amountWordsEn)}, according to the details above.</p>
          <p class="pn-legal-line">Debtor Name: ${escapeHtml(args.debtorName)}</p>
          <p class="pn-legal-line">Debtor ID: ${escapeHtml(args.debtorId || "—")}</p>
          <p class="pn-legal-line">Issue Date: ${escapeHtml(args.issueDateEn)}</p>
        </div>
        <div class="pn-qr-box">
          <img src="${args.qrDataUrl}" alt="QR" class="pn-qr-img" />
          <div class="pn-qr-text">Issued through WathiqCare electronic platform. Verification is available using the QR code or reference number.</div>
          <div class="pn-qr-ref">${escapeHtml(args.verificationUrl || args.noteNumber)}</div>
        </div>
      </section>
    </div>
  `;

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <style>${documentCss(isAr)}</style>
  </head>
  <body>
    ${isAr ? bodyAr : bodyEn}
  </body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: Browser | null = null;

  try {
    const auth = await requireModuleOperationalAccess(request, "promissory-notes");
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
    const issueCity = readMetaStr(meta, "issue_city", "issueCity") || (lang === "ar" ? "الرياض" : "Riyadh");
    const paymentCity = readMetaStr(meta, "payment_city", "paymentCity") || issueCity;
    const reason = readMetaStr(meta, "reason");
    const creditorCR = readMetaStr(meta, "creditor_cr", "creditorCR");
    const creditorNameAr = "شركة المركز الطبي الدولي مساهمة مقفلة";
    const creditorNameEn = "International Medical Center (IMC)";

    const verificationUrl =
      `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/verify/pn/${note.id}`;

    const qrPayload = [
      `NOTE:${note.noteNumber}`,
      `CREDITOR:${lang === "ar" ? creditorNameAr : creditorNameEn}`,
      `DEBTOR:${note.debtorName}`,
      `AMOUNT:${Number(note.amount)} ${note.currency}`,
      `DUE:${note.dueDate.toISOString().slice(0, 10)}`,
      `VERIFY:${verificationUrl}`,
    ].join("|");

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    });

    const logoSrc = await resolveImcLogoSource();
    const html = buildPromissoryNoteHtml({
      language: lang,
      logoSrc,
      noteNumber: note.noteNumber,
      statusCode: note.status,
      amount: Number(note.amount),
      currency: note.currency,
      amountWordsAr: toArabicWords(Number(note.amount), note.currency),
      amountWordsEn: toEnglishWords(Number(note.amount), note.currency),
      issueDateAr: formatDate(note.createdAt.toISOString(), "ar"),
      issueDateEn: formatDate(note.createdAt.toISOString(), "en"),
      dueDateAr: formatDate(note.dueDate.toISOString(), "ar"),
      dueDateEn: formatDate(note.dueDate.toISOString(), "en"),
      issueCity,
      paymentCity,
      reason,
      creditorNameAr,
      creditorNameEn,
      creditorCR,
      debtorName: note.debtorName,
      debtorId: note.debtorIdNumber ?? "",
      qrDataUrl,
      verificationUrl,
    });

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();

    const safeNoteNumber = note.noteNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(Buffer.from(pdf), {
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
      try {
        await browser.close();
      } catch {
        // no-op
      }
    }
  }
}
