import { type NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import type { Browser, LaunchOptions } from "puppeteer";
import QRCode from "qrcode";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";

const prisma = getPrisma();

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
  const normalized = (value || "").trim();
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
    .qr { align-items: center; text-align: center; }
    .qr img { width: 82px; height: 82px; border: 1px solid #cdd6df; background: #fff; }
    .qr small { margin-top: 6px; display: block; font-size: 7.5pt; word-break: break-all; }
  `;
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
  legalText: string;
  pdplText: string;
  witnessDecl: string;
  physicianCert: string;
  patientSignatureLabel: string;
  physicianSignatureLabel: string;
  witnessSignatureLabel: string;
  qrLabel: string;
  qrDataUrl: string;
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
          <div>International Medical Center</div>
          <strong>IMC</strong>
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

      <article class="card full legal">
        <h3>${args.isAr ? "الإقرار القانوني والخصوصية" : "Legal and Privacy Declarations"}</h3>
        <p>${content(args.legalText)}</p>
        <p>${content(args.pdplText)}</p>
        <p>${content(args.witnessDecl)}</p>
        <p>${content(args.physicianCert)}</p>
      </article>

      <footer class="sign">
        <div class="box"><strong>${escapeHtml(args.patientSignatureLabel)}</strong><span>______________________</span></div>
        <div class="box"><strong>${escapeHtml(args.physicianSignatureLabel)}</strong><span>______________________</span></div>
        <div class="box"><strong>${escapeHtml(args.witnessSignatureLabel)}</strong><span>______________________</span></div>
        <div class="box qr"><img src="${args.qrDataUrl}" alt="QR" /><small>${escapeHtml(args.qrLabel)}</small></div>
      </footer>
    </div>
  </body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: Browser | null = null;

  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { id } = await params;

    if (!auth.tenant_id) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 403 });
    }

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      include: {
        template: {
          select: {
            titleAr: true,
            titleEn: true,
            consentType: true,
            specialty: true,
          },
        },
        emrMappings: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { physicianIdentifier: true },
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

    const metadata = (doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}) as Record<string, unknown>;
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

    const lang = (request.nextUrl.searchParams.get("lang") || doc.language || "bilingual").toLowerCase();
    const isAr = lang === "ar";
    const copyType = parseCopyType(request.nextUrl.searchParams.get("copy"));
    const copyLabel = copyTypeLabel(copyType, isAr);

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/verify/consent/${doc.id}`;
    const qrPayload = doc.qrPayload || [
      `CONSENT:${doc.consentReference}`,
      `DOC:${doc.id}`,
      `STATUS:${doc.status}`,
      `VERIFY:${verifyUrl}`,
    ].join("|");

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      width: 180,
      margin: 1,
    });

    const output = html({
      isAr,
      title: isAr ? "نظام مكتبة الموافقات الطبية" : "Medical Consent Library Engine",
      subtitle: isAr ? doc.template.titleAr : doc.template.titleEn,
      reference: doc.consentReference,
      status: statusLabel(doc.status, isAr),
      version: doc.documentVersion || "v1.0",
      generatedAt: formatDate(doc.createdAt, isAr ? "ar" : "en"),
      warning: isAr ? doc.aiWarningAr : doc.aiWarningEn,
      copyLabel,
      watermarkLabel: `${copyLabel} | ${doc.consentReference}`,
      auditChecksum: doc.auditChecksum || doc.immutablePdfHash,
      generatedByModel: doc.generatedByModel,
      finalizedAt: doc.finalizedAt ? formatDate(doc.finalizedAt, isAr ? "ar" : "en") : null,
      physicianIdentifier: doc.emrMappings[0]?.physicianIdentifier || doc.physicianLicense,
      patient: doc.patientName,
      mrn: doc.mrn,
      dob: doc.dob,
      gender: doc.gender,
      diagnosis: doc.diagnosis,
      physician: doc.physicianName,
      physicianLicense: doc.physicianLicense,
      specialty: doc.physicianSpecialty,
      consentType: doc.template.consentType,
      plannedProcedure: doc.plannedProcedure,
      procedureDetails: doc.procedureDetails,
      risks: isAr ? doc.risksAr : doc.risksEn,
      sideEffects: isAr ? doc.sideEffectsAr : doc.sideEffectsEn,
      alternatives: isAr ? doc.alternativesAr : doc.alternativesEn,
      refusalRisks: isAr ? doc.refusalRisksAr : doc.refusalRisksEn,
      expectedOutcomes: isAr ? doc.expectedOutcomesAr : doc.expectedOutcomesEn,
      physicianNotes: isAr ? doc.physicianNotesAr : doc.physicianNotesEn,
      legalText: isAr ? doc.legalTextAr : doc.legalTextEn,
      pdplText: isAr ? doc.pdplTextAr : doc.pdplTextEn,
      witnessDecl: isAr ? doc.witnessDeclAr : doc.witnessDeclEn,
      physicianCert: isAr ? doc.physicianCertAr : doc.physicianCertEn,
      patientSignatureLabel: isAr ? "توقيع المريض / الولي" : "Patient / Guardian Signature",
      physicianSignatureLabel: isAr ? "توقيع الطبيب" : "Physician Signature",
      witnessSignatureLabel: isAr ? "توقيع الشاهد" : "Witness Signature",
      qrLabel: verifyUrl,
      qrDataUrl,
    });

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(output, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
        "X-Wathiq-Finalized-At": doc.finalizedAt ? doc.finalizedAt.toISOString() : "",
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
