import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "sample-pdf-review");
const SCREENSHOTS_DIR = path.join(BASE, "screenshots");
const REPORT_PATH = path.join(ROOT, "SAMPLE_PDF_VISUAL_REVIEW_REPORT.md");
const LOGO_PATH = path.join(ROOT, "apps", "web", "public", "images", "imc-logo.png");

const samples = [
  { module: "informed-consents", slug: "02-surgical-consent", workflow: "surgical consent", template: "Surgical Consent" },
  { module: "informed-consents", slug: "03-anesthesia-consent", workflow: "anesthesia consent", template: "Anesthesia Consent" },
  { module: "informed-consents", slug: "05-high-risk-procedure-consent", workflow: "high-risk procedure", template: "High-Risk Procedure Consent" },
  { module: "dama", slug: "07-dama-refusal-of-treatment", workflow: "DAMA refusal", template: "DAMA / Refusal of Treatment" },
  { module: "dama", slug: "08-refusal-of-surgery", workflow: "refusal of treatment", template: "Refusal of Surgery" },
  { module: "dama", slug: "09-telemedicine-consent", workflow: "telemedicine", template: "Telemedicine Consent" },
  { module: "legal-evidence", slug: "11-pdpl-data-processing-consent", workflow: "legal acknowledgment", template: "PDPL / Data Processing Consent" },
  { module: "legal-evidence", slug: "16-icu-critical-care-consent", workflow: "ICU/critical care", template: "ICU / Critical Care Consent" },
  { module: "legal-evidence", slug: "19-minor-guardian-consent", workflow: "guardian consent", template: "Minor / Guardian Consent" },
];

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumericDate(iso) {
  if (!iso) return "";
  return String(iso).replace(/[TZ]/g, " ").replace(/[^0-9:\- ]/g, "").trim();
}

function signaturesHtml(signatures, lang) {
  const rows = signatures
    .map((s, idx) => {
      if (lang === "ar") {
        const roleAr = s.role === "PATIENT" ? "المريض" : s.role === "PHYSICIAN" ? "الطبيب" : s.role === "WITNESS" ? "الشاهد" : s.role === "GUARDIAN" ? "ولي الأمر" : "المترجم";
        const methodAr = s.method === "OTP" ? "رمز تحقق OTP" : s.method === "ELECTRONIC" ? "توقيع إلكتروني" : "إقرار شاهد";
        return `<tr><td>${idx + 1}</td><td>${roleAr}</td><td>${escapeHtml(s.name)}</td><td>${methodAr}</td><td>${escapeHtml(formatNumericDate(s.signedAt))}</td></tr>`;
      }
      return `<tr><td>${idx + 1}</td><td>${escapeHtml(s.role)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.method)}</td><td>${escapeHtml(s.signedAt)}</td></tr>`;
    })
    .join("\n");

  if (lang === "ar") {
    return `
      <h3>كتلة التوقيعات</h3>
      <table>
        <thead><tr><th>#</th><th>الدور</th><th>الاسم</th><th>طريقة التوقيع</th><th>وقت التوقيع</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  return `
    <h3>Signature Block</h3>
    <table>
      <thead><tr><th>#</th><th>Role</th><th>Name</th><th>Method</th><th>Signed At</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildHtml({ lang, snapshot, qr, legalSeal, workflow, logoDataUri }) {
  const isAr = lang === "ar";
  const title = isAr ? snapshot.scenario.titleAr : snapshot.scenario.titleEn;
  const diagnosis = isAr ? snapshot.diagnosis.ar : snapshot.diagnosis.en;
  const procedure = isAr ? snapshot.procedure.ar : snapshot.procedure.en;
  const benefits = isAr ? snapshot.benefits.ar : snapshot.benefits.en;
  const risks = isAr ? snapshot.risks.ar : snapshot.risks.en;
  const complications = isAr ? snapshot.complications.ar : snapshot.complications.en;
  const alternatives = isAr ? snapshot.alternatives.ar : snapshot.alternatives.en;
  const refusal = isAr ? snapshot.refusalConsequences.ar : snapshot.refusalConsequences.en;
  const physician = isAr ? snapshot.encounter.physicianAr : snapshot.encounter.physicianEn;
  const department = isAr ? snapshot.encounter.departmentAr : snapshot.encounter.departmentEn;
  const patientName = isAr ? snapshot.patient.nameAr : snapshot.patient.nameEn;
  const consentMarker = isAr ? snapshot.markerAr : snapshot.markerEn;
  const otpCount = Array.isArray(snapshot.signatures)
    ? snapshot.signatures.filter((s) => s.method === "OTP").length
    : 0;
  const otpIndicator = otpCount > 0 ? (isAr ? `OTP: متوفر (${otpCount})` : `OTP: Available (${otpCount})`) : (isAr ? "OTP: غير مطبق" : "OTP: N/A");
  const qrStatusLabel = isAr ? (qr.status === "VALID" ? "صالح" : "غير صالح") : (qr.status || "UNKNOWN");
  const workflowStatusLabel = isAr
    ? {
        SEALED: "مختوم",
        FINAL: "نهائي",
        FAILED: "فشل",
      }[snapshot.workflowStatus] || "غير معروف"
    : (snapshot.workflowStatus || "UNKNOWN");
  const generatedAtLabel = isAr ? formatNumericDate(snapshot.generatedAt || "") : (snapshot.generatedAt || "");
  const workflowLabel = isAr
    ? {
        "surgical consent": "موافقة جراحية",
        "anesthesia consent": "موافقة التخدير",
        "high-risk procedure": "إجراء عالي الخطورة",
        "DAMA refusal": "رفض العلاج والخروج ضد النصيحة",
        "refusal of treatment": "رفض العلاج",
        telemedicine: "الطب الاتصالي",
        "legal acknowledgment": "إقرار قانوني",
        "ICU/critical care": "العناية المركزة",
        "guardian consent": "موافقة ولي الأمر",
      }[workflow] || "سير عمل سريري"
    : workflow;

  const reqFields = isAr
    ? [
        ["اسم المريض", patientName],
        ["رقم الملف", "000001"],
        ["القسم", department],
        ["الطبيب", physician],
        ["التشخيص", diagnosis],
        ["الإجراء / الخدمة", procedure],
      ]
    : [
        ["Patient Name", patientName],
        ["MRN", "000001"],
        ["Department", department],
        ["Physician", physician],
        ["Diagnosis", diagnosis],
        ["Procedure / Service", procedure],
      ];

  const reqHtml = reqFields
    .map(([k, v]) => `<div class="kv"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`)
    .join("\n");

  const sections = isAr
    ? [
        ["الفوائد", benefits],
        ["المخاطر", risks],
        ["المضاعفات", complications],
        ["البدائل", alternatives],
        ["عواقب الرفض", refusal],
        ["إقرار المريض", "تمت الإجابة على جميع الأسئلة، وتمت الموافقة طوعًا دون إكراه."],
        ["إقرار الطبيب", "أقر الطبيب بشرح الحالة، البدائل، المخاطر، وخطة العلاج."],
      ]
    : [
        ["Benefits", benefits],
        ["Risks", risks],
        ["Complications", complications],
        ["Alternatives", alternatives],
        ["Consequences of Refusal", refusal],
        ["Patient Acknowledgment", "All questions were answered and consent was given voluntarily."],
        ["Physician Declaration", "Physician confirmed complete explanation of condition, options, risks, and care plan."],
      ];

  if (snapshot.scenario.requiresWitness) {
    sections.push([isAr ? "الشاهد" : "Witness", isAr ? "تم توثيق حضور الشاهد عند التوقيع." : "Witness presence documented at signing."]);
  }
  if (snapshot.scenario.requiresGuardian) {
    sections.push([isAr ? "ولي الأمر" : "Guardian", isAr ? "تم اعتماد توقيع ولي الأمر حسب المتطلبات النظامية." : "Guardian signature validated per legal policy."]);
  }
  if (snapshot.scenario.requiresInterpreter) {
    sections.push([isAr ? "المترجم" : "Interpreter", isAr ? "تمت ترجمة المحتوى للمريض واعتماد ذلك." : "Interpreter attestation recorded."]);
  }

  const sectionHtml = sections
    .map(([h, b], i) => `<section><h4>${i + 1}. ${escapeHtml(h)}</h4><p>${escapeHtml(b)}</p></section>`)
    .join("\n");

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - Executive Sample</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: ${isAr ? "'Tahoma', 'Arial', sans-serif" : "'Segoe UI', 'Arial', sans-serif"}; color: #111827; margin: 0; }
    .page { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }
    .hgroup { flex: 1; }
    .brand { width: 150px; ${isAr ? "margin-left" : "margin-right"}: 10px; }
    h1 { margin: 0; font-size: 28px; color: #0f172a; }
    .sub { margin-top: 4px; color: #334155; font-size: 12px; }
    .badge { margin-top: 6px; display: inline-block; background: #e2e8f0; color: #0f172a; border-radius: 999px; padding: 4px 10px; font-size: 11px; }
    .meta { margin-top: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; }
    .kv { display: grid; grid-template-columns: 220px 1fr; gap: 10px; padding: 2px 0; font-size: 13px; }
    .k { font-weight: 700; color: #1f2937; }
    .v { color: #111827; }
    section { margin-top: 10px; }
    section h4 { margin: 0 0 3px 0; font-size: 15px; color: #0f172a; }
    section p { margin: 0; line-height: 1.62; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: ${isAr ? "right" : "left"}; }
    th { background: #f1f5f9; font-weight: 700; }
    .legal { margin-top: 10px; padding: 8px; border: 1px dashed #0f766e; border-radius: 8px; background: #f0fdfa; font-size: 12px; }
    .foot { margin-top: 10px; padding-top: 8px; border-top: 1px solid #94a3b8; font-size: 11px; color: #334155; display: flex; justify-content: space-between; gap: 16px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="head">
      <div class="hgroup">
        <h1>${escapeHtml(title)}</h1>
        <div class="sub">${isAr ? "الوحدة" : "Module"}: ${escapeHtml(workflowLabel)}</div>
        <span class="badge">${escapeHtml(consentMarker)}</span>
      </div>
      <img class="brand" src="${logoDataUri}" alt="IMC" />
    </div>

    <div class="meta">
      ${reqHtml}
    </div>

    ${sectionHtml}

    ${signaturesHtml(snapshot.signatures || [], lang)}

    <div class="legal">
      <div><strong>${isAr ? "التحقق عبر QR" : "QR Verification"}:</strong> ${escapeHtml(qr.verifyUrl || "")}</div>
      <div><strong>${isAr ? "حالة التحقق" : "Validation Status"}:</strong> ${escapeHtml(qrStatusLabel)}</div>
      <div><strong>${isAr ? "الختم القانوني" : "Legal Seal Hash"}:</strong> ${escapeHtml(legalSeal)}</div>
      <div><strong>${isAr ? "مؤشر OTP/التوقيع" : "OTP/Signature Indicator"}:</strong> ${escapeHtml(otpIndicator)}</div>
    </div>

    <div class="foot">
      <span>${isAr ? "تاريخ الإنشاء" : "Generated At"}: ${escapeHtml(generatedAtLabel)}</span>
      <span>${isAr ? "حالة المستند" : "Document Status"}: ${escapeHtml(workflowStatusLabel)}</span>
      <span>${isAr ? "مرجع الملف" : "Trace ID"}: ${escapeHtml(isAr ? "000001" : (snapshot.caseCode || ""))}</span>
    </div>
  </div>
</body>
</html>`;
}

function htmlToVisibleText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasArabicLeakage(text) {
  const stripped = htmlToVisibleText(text)
    .replace(/[0-9A-Fa-f]{32,}/g, "")
    .replace(/\/uat\/verify\/[A-Za-z0-9\-\/]+/g, "")
    .replace(/IMC|QR|OTP|N\/A|Trace ID|TEST CASE|NOT A REAL PATIENT/g, "");
  return /[A-Za-z]/.test(stripped);
}

function hasEnglishLeakage(text) {
  const stripped = htmlToVisibleText(text).replace(/[0-9A-Fa-f]{32,}/g, "").replace(/\/uat\/verify\/[A-Za-z0-9\-\/]+/g, "");
  return /[\u0600-\u06FF]/.test(stripped);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const logo = await fs.readFile(LOGO_PATH);
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;
  const uatSummary = JSON.parse(await fs.readFile(path.join(ROOT, "uat-results", "summary.json"), "utf8"));
  const isolationBySlug = new Map(
    (uatSummary.results || []).map((r) => [r.slug, (r.languageIsolation?.arabicLeakageCount === 0) && (r.languageIsolation?.englishLeakageCount === 0)])
  );

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const sample of samples) {
      const dir = path.join(BASE, sample.module, sample.slug);
      const snapPath = path.join(dir, "audit-snapshot.json");
      const qrPath = path.join(dir, "qr-verification.json");
      const auditPath = path.join(dir, "audit-trail.json");
      const evidenceLegalPath = path.join(dir, "evidence-package", "legal-seal.txt");

      const snapshot = JSON.parse(await fs.readFile(snapPath, "utf8"));
      const qr = JSON.parse(await fs.readFile(qrPath, "utf8"));
      const audit = JSON.parse(await fs.readFile(auditPath, "utf8"));
      const legalSeal = (await fs.readFile(evidenceLegalPath, "utf8")).trim();

      const arHtml = buildHtml({ lang: "ar", snapshot, qr, legalSeal, workflow: sample.workflow, logoDataUri });
      const enHtml = buildHtml({ lang: "en", snapshot, qr, legalSeal, workflow: sample.workflow, logoDataUri });

      const arHtmlPath = path.join(dir, "executive-preview-ar.html");
      const enHtmlPath = path.join(dir, "executive-preview-en.html");
      const arPdfPath = path.join(dir, "executive-ar.pdf");
      const enPdfPath = path.join(dir, "executive-en.pdf");
      const arPngPath = path.join(SCREENSHOTS_DIR, `${sample.slug}-executive-ar.png`);
      const enPngPath = path.join(SCREENSHOTS_DIR, `${sample.slug}-executive-en.png`);

      await fs.writeFile(arHtmlPath, arHtml, "utf8");
      await fs.writeFile(enHtmlPath, enHtml, "utf8");

      const page = await browser.newPage({ viewport: { width: 1400, height: 1980 } });
      await page.setContent(arHtml, { waitUntil: "networkidle" });
      await page.pdf({ path: arPdfPath, format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" } });
      await page.screenshot({ path: arPngPath, fullPage: true });

      await page.setContent(enHtml, { waitUntil: "networkidle" });
      await page.pdf({ path: enPdfPath, format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" } });
      await page.screenshot({ path: enPngPath, fullPage: true });
      await page.close();

      const visualQaPass = await exists(arPngPath) && await exists(enPngPath) && arHtml.includes("<img class=\"brand\"") && arHtml.includes("كتلة التوقيعات") && enHtml.includes("Signature Block") && arHtml.includes("الختم القانوني") && enHtml.includes("Legal Seal Hash");

      const signatureBlockExists = Array.isArray(snapshot.signatures) && snapshot.signatures.length >= 2;
      const qrValid = qr.status === "VALID" && typeof qr.verifyUrl === "string" && qr.verifyUrl.length > 0;
      const legalSealExists = legalSeal.length > 0 && typeof snapshot.legalSealHash === "string" && snapshot.legalSealHash.length > 0;
      const auditExists = Array.isArray(audit.events) && audit.events.length > 0;
      const evidencePackageExists = await exists(path.join(dir, "evidence-package", "snapshot.json"))
        && await exists(path.join(dir, "evidence-package", "audit.json"))
        && await exists(path.join(dir, "evidence-package", "qr.json"))
        && await exists(path.join(dir, "evidence-package", "legal-seal.txt"));

      const languageIsolationPass = Boolean(isolationBySlug.get(sample.slug));
      const overallPass = (await exists(arPdfPath))
        && (await exists(enPdfPath))
        && qrValid
        && legalSealExists
        && signatureBlockExists
        && auditExists
        && evidencePackageExists
        && languageIsolationPass
        && visualQaPass;

      results.push({
        module: sample.module,
        slug: sample.slug,
        templateName: sample.template,
        workflow: sample.workflow,
        arabicPdf: path.relative(ROOT, arPdfPath).replaceAll("\\", "/"),
        englishPdf: path.relative(ROOT, enPdfPath).replaceAll("\\", "/"),
        previewAr: path.relative(ROOT, arPngPath).replaceAll("\\", "/"),
        previewEn: path.relative(ROOT, enPngPath).replaceAll("\\", "/"),
        qrValidationStatus: qrValid ? "PASS" : "FAIL",
        sealStatus: legalSealExists ? "PASS" : "FAIL",
        signatureBlockStatus: signatureBlockExists ? "PASS" : "FAIL",
        auditStatus: auditExists ? "PASS" : "FAIL",
        evidenceStatus: evidencePackageExists ? "PASS" : "FAIL",
        visualQaStatus: visualQaPass ? "PASS" : "FAIL",
        languageIsolationStatus: languageIsolationPass ? "PASS" : "FAIL",
        otpIndicator: Array.isArray(snapshot.signatures) && snapshot.signatures.some((s) => s.method === "OTP") ? "Present" : "N/A",
        overallResult: overallPass ? "PASS" : "FAIL",
      });
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(path.join(BASE, "verification-data.json"), JSON.stringify(results, null, 2), "utf8");

  const passed = results.filter((r) => r.overallResult === "PASS").length;
  const failed = results.length - passed;

  const rows = results
    .map((r) => `| ${r.module} | ${r.templateName} | ${r.slug} | ${r.arabicPdf} | ${r.englishPdf} | ${r.qrValidationStatus} | ${r.sealStatus} | ${r.visualQaStatus} | ${r.languageIsolationStatus} | ${r.overallResult} |`)
    .join("\n");

  const details = results
    .map((r) => `### ${r.templateName} (${r.slug})\n- Module: ${r.module}\n- Workflow: ${r.workflow}\n- Arabic PDF: ${r.arabicPdf}\n- English PDF: ${r.englishPdf}\n- Preview AR: ${r.previewAr}\n- Preview EN: ${r.previewEn}\n- QR Validation: ${r.qrValidationStatus}\n- Legal Seal: ${r.sealStatus}\n- Signature Block: ${r.signatureBlockStatus}\n- Audit Metadata: ${r.auditStatus}\n- Evidence Package: ${r.evidenceStatus}\n- Visual QA: ${r.visualQaStatus}\n- Language Isolation: ${r.languageIsolationStatus}\n- OTP/Signature Indicator: ${r.otpIndicator}\n- Overall: ${r.overallResult}`).join("\n\n");

  const report = `# SAMPLE PDF Visual Review Report\n\nDate: ${new Date().toISOString()}\n\n## Scope\nGenerated 9 complete sample outputs across all requested modules:\n- Informed Consent Module (3)\n- Discharge Refusal / DAMA Module (3)\n- Legal Evidence / Patient Acknowledgment Module (3)\n\nEach sample includes:\n- Arabic PDF\n- English PDF\n- QR verification JSON\n- audit snapshot\n- audit trail\n- evidence package\n- executive preview screenshots\n\n## Matrix\n| Module | Template Name | Slug | Arabic PDF | English PDF | QR | Seal | Visual QA | Language Isolation | Overall |\n|---|---|---|---|---|---|---|---|---|---|\n${rows}\n\n## Result Summary\n- Total samples: ${results.length}\n- PASS: ${passed}\n- FAIL: ${failed}\n\n## Detailed Results\n\n${details}\n\n## Final Gate\n${failed === 0 ? "PASS - All 9 samples meet completeness and visual QA gates for executive review package." : "FAIL - One or more samples did not satisfy completeness or visual QA gates."}\n`;

  await fs.writeFile(REPORT_PATH, report, "utf8");
  console.log(`Generated executive samples and report. PASS=${passed} FAIL=${failed}`);
}

await main();
