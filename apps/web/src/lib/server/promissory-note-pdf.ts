import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatAmountNumeric, toArabicWords, toEnglishWords } from "@/lib/amount-to-words";
import type { PromissoryNoteData } from "@/components/modules/PromissoryNoteDocument";

type BuildPromissoryPdfHtmlArgs = {
  logoSrc: string;
  noteData: PromissoryNoteData;
  embeddedArabicFontCss: string;
};

let embeddedArabicFontCssPromise: Promise<string> | null = null;

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

function statusLabelAr(statusCode?: string): string {
  const normalized = (statusCode || "").toUpperCase();
  if (normalized === "SETTLED") return "مغلق";
  if (normalized === "ACTIVE") return "نشط";
  if (normalized === "VOID") return "ملغى";
  if (normalized === "OVERDUE") return "متأخر";
  return "مسودة";
}

function statusLabelEn(statusCode?: string): string {
  const normalized = (statusCode || "").toUpperCase();
  if (normalized === "SETTLED") return "Closed";
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "VOID") return "Voided";
  if (normalized === "OVERDUE") return "Overdue";
  return "Draft";
}

function documentCss(isAr: boolean): string {
  return `
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { direction: ${isAr ? "rtl" : "ltr"}; }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-size: 10.5pt;
      line-height: 1.45;
      text-align: ${isAr ? "right" : "left"};
      font-family: ${isAr
    ? "'WathiqArabicPdfPrimary','WathiqArabicPdfFallback','IBM Plex Sans Arabic','Noto Sans Arabic','Noto Naskh Arabic','Tahoma',serif"
    : "'Times New Roman',Times,serif"};
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
    .pn-qr-ref {
      margin-top: 1.5mm;
      font-size: 7.5pt;
      color: #0f172a;
      text-decoration: underline;
      word-break: break-word;
    }
  `;
}

export function buildPromissoryPdfHtml({
  logoSrc,
  noteData,
  embeddedArabicFontCss,
}: BuildPromissoryPdfHtmlArgs): string {
  const isAr = noteData.language === "ar";
  const amountFormatted = formatAmountNumeric(noteData.amount);
  const amountWords = isAr
    ? toArabicWords(noteData.amount, noteData.currency)
    : toEnglishWords(noteData.amount, noteData.currency);
  const issueDate = formatDate(noteData.issueDate, noteData.language);
  const dueDate = formatDate(noteData.dueDate, noteData.language);
  const statusLabel = isAr ? statusLabelAr(noteData.statusCode) : statusLabelEn(noteData.statusCode);
  const creditorName = noteData.creditorName || (isAr ? "شركة المركز الطبي الدولي مساهمة مقفلة" : "International Medical Center (IMC)");
  const issueCity = noteData.issueCity || (isAr ? "الرياض" : "Riyadh");
  const paymentCity = noteData.paymentCity || issueCity;
  const reason = noteData.reason || "—";
  const verificationValue = noteData.verificationUrl || noteData.referenceNumber || noteData.noteNumber;

  const bodyAr = `
    <div class="pn-doc" dir="rtl" lang="ar">
      <header class="pn-header">
        <div class="pn-logo-box"><img src="${logoSrc}" alt="International Medical Center" class="pn-logo" /></div>
        <div class="pn-title-wrap">
          <h1 class="pn-title">سند لأمر</h1>
          <div class="pn-note-number">رقم السند: <strong>${escapeHtml(noteData.noteNumber)}</strong></div>
        </div>
      </header>
      <div class="pn-status-row">
        <span class="pn-status-label">حالة السند</span>
        <span class="pn-status-badge">${statusLabel}</span>
      </div>
      <section class="pn-main-panel">
        <div class="pn-main-right">
          <div class="pn-band-title">تفاصيل السند</div>
          <table class="pn-details-table">
            <tbody>
              <tr><td>تاريخ الإنشاء</td><td>${escapeHtml(issueDate)}</td></tr>
              <tr><td>تاريخ الاستحقاق</td><td>${escapeHtml(dueDate)}</td></tr>
              <tr><td>مدينة الإصدار</td><td>${escapeHtml(issueCity)}</td></tr>
              <tr><td>مدينة الوفاء</td><td>${escapeHtml(paymentCity)}</td></tr>
              <tr><td>سبب إنشاء السند</td><td>${escapeHtml(reason)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pn-main-left">
          <div class="pn-amount-card">
            <div class="pn-amount-label">قيمة السند رقماً</div>
            <div class="pn-amount-number">${escapeHtml(amountFormatted)} ${escapeHtml(noteData.currency)}</div>
            <div class="pn-amount-label pn-amount-label-words">قيمة السند كتابة</div>
            <div class="pn-amount-words">${escapeHtml(amountWords)}</div>
          </div>
        </div>
      </section>
      <section class="pn-party-section">
        <div class="pn-band-title">تفاصيل الدائن</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>${escapeHtml(creditorName)}</td></tr>
            <tr><td>الرقم الوطني الموحد / السجل التجاري</td><td>${escapeHtml(noteData.creditorCR || "—")}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="pn-party-section">
        <div class="pn-band-title">تفاصيل المدين</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>${escapeHtml(noteData.debtorName)}</td></tr>
            <tr><td>رقم الهوية</td><td>${escapeHtml(noteData.debtorId || "—")}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="pn-bottom-grid">
        <div class="pn-legal-box">
          <p>أتعهد بأن أدفع لأمر ${escapeHtml(creditorName)} مبلغاً وقدره (${escapeHtml(amountFormatted)}) ${escapeHtml(noteData.currency)}، ${escapeHtml(amountWords)}، وفق البيانات المذكورة أعلاه، ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.</p>
          <p class="pn-legal-line">اسم المدين: ${escapeHtml(noteData.debtorName)}</p>
          <p class="pn-legal-line">رقم الهوية: ${escapeHtml(noteData.debtorId || "—")}</p>
          <p class="pn-legal-line">تاريخ الإصدار: ${escapeHtml(issueDate)}</p>
          <p class="pn-legal-line">ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.</p>
        </div>
        <div class="pn-qr-box">
          <img src="${escapeHtml(noteData.qrDataUrl || "")}" alt="QR" class="pn-qr-img" />
          <div class="pn-qr-text">هذا السند لأمر صادر من خلال منصة واثق كير الإلكترونية، وقد تم إنشاؤه والمصادقة عليه إلكترونياً وفق البيانات المسجلة في المنصة، ويمكن التحقق منه من خلال رمز التحقق أو الرقم المرجعي.</div>
          <a class="pn-qr-ref" href="${escapeHtml(verificationValue)}" target="_blank" rel="noopener noreferrer" aria-label="التحقق من السند (يفتح في نافذة جديدة)">${escapeHtml(verificationValue)}</a>
        </div>
      </section>
    </div>
  `;

  const bodyEn = `
    <div class="pn-doc" dir="ltr" lang="en">
      <header class="pn-header">
        <div class="pn-logo-box"><img src="${logoSrc}" alt="International Medical Center" class="pn-logo" /></div>
        <div class="pn-title-wrap">
          <h1 class="pn-title">Promissory Note</h1>
          <div class="pn-note-number">Note No.: <strong>${escapeHtml(noteData.noteNumber)}</strong></div>
        </div>
      </header>
      <div class="pn-status-row">
        <span class="pn-status-label">Note Status</span>
        <span class="pn-status-badge">${statusLabel}</span>
      </div>
      <section class="pn-main-panel">
        <div class="pn-main-right">
          <div class="pn-band-title">Note Details</div>
          <table class="pn-details-table">
            <tbody>
              <tr><td>Issue Date</td><td>${escapeHtml(issueDate)}</td></tr>
              <tr><td>Due Date</td><td>${escapeHtml(dueDate)}</td></tr>
              <tr><td>Issue City</td><td>${escapeHtml(issueCity)}</td></tr>
              <tr><td>Payment City</td><td>${escapeHtml(paymentCity)}</td></tr>
              <tr><td>Reason</td><td>${escapeHtml(reason)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pn-main-left">
          <div class="pn-amount-card">
            <div class="pn-amount-label">Amount (Numeric)</div>
            <div class="pn-amount-number">${escapeHtml(amountFormatted)} ${escapeHtml(noteData.currency)}</div>
            <div class="pn-amount-label pn-amount-label-words">Amount (In Words)</div>
            <div class="pn-amount-words">${escapeHtml(amountWords)}</div>
          </div>
        </div>
      </section>
      <section class="pn-party-section">
        <div class="pn-band-title">Creditor Details</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>${escapeHtml(creditorName)}</td></tr>
            <tr><td>Unified ID / Commercial Registration</td><td>${escapeHtml(noteData.creditorCR || "—")}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="pn-party-section">
        <div class="pn-band-title">Debtor Details</div>
        <table class="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>${escapeHtml(noteData.debtorName)}</td></tr>
            <tr><td>ID Number</td><td>${escapeHtml(noteData.debtorId || "—")}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="pn-bottom-grid">
        <div class="pn-legal-box">
          <p>I undertake to pay to the order of ${escapeHtml(creditorName)} an amount of (${escapeHtml(amountFormatted)}) ${escapeHtml(noteData.currency)}, ${escapeHtml(amountWords)}, according to the details above.</p>
          <p class="pn-legal-line">Debtor Name: ${escapeHtml(noteData.debtorName)}</p>
          <p class="pn-legal-line">Debtor ID: ${escapeHtml(noteData.debtorId || "—")}</p>
          <p class="pn-legal-line">Issue Date: ${escapeHtml(issueDate)}</p>
        </div>
        <div class="pn-qr-box">
          <img src="${escapeHtml(noteData.qrDataUrl || "")}" alt="QR" class="pn-qr-img" />
          <div class="pn-qr-text">Issued through WathiqCare electronic platform. Verification is available using the QR code or reference number.</div>
          <a class="pn-qr-ref" href="${escapeHtml(verificationValue)}" target="_blank" rel="noopener noreferrer" aria-label="Verify promissory note (opens in new window)">${escapeHtml(verificationValue)}</a>
        </div>
      </section>
    </div>
  `;

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <style>${embeddedArabicFontCss}${documentCss(isAr)}</style>
  </head>
  <body>
    ${isAr ? bodyAr : bodyEn}
  </body>
</html>`;
}

async function readFontAsDataUri(fontPath: string, mimeType: string): Promise<string> {
  const fontBytes = await readFile(fontPath);
  return `data:${mimeType};base64,${fontBytes.toString("base64")}`;
}

async function buildEmbeddedFontFaceCss(config: {
  family: string;
  arabicPath: string;
  latinPath?: string;
}): Promise<string> {
  const arabicDataUri = await readFontAsDataUri(config.arabicPath, "font/woff2");
  const latinDataUri = config.latinPath
    ? await readFontAsDataUri(config.latinPath, "font/woff2").catch((error: unknown) => {
      console.warn("Failed to load embedded Latin font for promissory PDF", error);
      return "";
    })
    : "";

  const arabicFace = `
    @font-face {
      font-family: '${config.family}';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url(${arabicDataUri}) format('woff2');
      unicode-range: U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC;
    }
  `;

  if (!latinDataUri) {
    return arabicFace;
  }

  const latinFace = `
    @font-face {
      font-family: '${config.family}';
      font-style: normal;
      font-weight: 400;
      font-display: block;
      src: url(${latinDataUri}) format('woff2');
      unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD;
    }
  `;

  return `${arabicFace}${latinFace}`;
}

async function loadEmbeddedArabicFontCss(): Promise<string> {
  const root = process.cwd();
  const candidates = [
    {
      family: "WathiqArabicPdfPrimary",
      arabicPath: join(
        root,
        "node_modules",
        "@fontsource",
        "ibm-plex-sans-arabic",
        "files",
        "ibm-plex-sans-arabic-arabic-400-normal.woff2",
      ),
      latinPath: join(
        root,
        "node_modules",
        "@fontsource",
        "ibm-plex-sans-arabic",
        "files",
        "ibm-plex-sans-arabic-latin-400-normal.woff2",
      ),
    },
    {
      family: "WathiqArabicPdfFallback",
      arabicPath: join(
        root,
        "node_modules",
        "@fontsource",
        "tajawal",
        "files",
        "tajawal-arabic-400-normal.woff2",
      ),
      latinPath: join(
        root,
        "node_modules",
        "@fontsource",
        "tajawal",
        "files",
        "tajawal-latin-400-normal.woff2",
      ),
    },
  ] as const;

  const loadedCss = await Promise.all(
    candidates.map((candidate) => buildEmbeddedFontFaceCss(candidate).catch((error: unknown) => {
      console.warn("Failed to load embedded Arabic font for promissory PDF", {
        family: candidate.family,
        error,
      });
      return "";
    })),
  );

  return loadedCss.join("");
}

export async function getEmbeddedArabicFontCss(): Promise<string> {
  if (!embeddedArabicFontCssPromise) {
    embeddedArabicFontCssPromise = loadEmbeddedArabicFontCss();
  }
  return embeddedArabicFontCssPromise;
}
