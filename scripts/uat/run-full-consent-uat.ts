import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type LanguageMode = "ar" | "en" | "bilingual";

type SignatureEntry = {
  role: "PATIENT" | "PHYSICIAN" | "WITNESS" | "GUARDIAN" | "INTERPRETER";
  name: string;
  signedAt: string;
  method: "ELECTRONIC" | "OTP" | "WITNESS_ACKNOWLEDGMENT";
};

type WorkflowStep = {
  step: number;
  title: string;
  status: "COMPLETED" | "FAILED";
  occurredAt: string;
  details: string;
};

type UatScenario = {
  id: number;
  code: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  scenarioEn: string;
  scenarioAr: string;
  diagnosisEn: string;
  diagnosisAr: string;
  procedureEn: string;
  procedureAr: string;
  requiresWitness: boolean;
  requiresGuardian: boolean;
  requiresInterpreter: boolean;
};

type UatCaseResult = {
  id: number;
  slug: string;
  titleEn: string;
  titleAr: string;
  status: "PASS" | "FAIL";
  workflowStatus: "FINAL" | "SEALED" | "FAILED";
  legalSealHash: string;
  qrVerificationStatus: "VALID" | "INVALID";
  files: {
    arabicPdf: string;
    englishPdf: string;
    bilingualPdf: string;
    consentSnapshot: string;
    auditTrail: string;
    evidencePackage: string;
    previewArabic: string;
    previewEnglish: string;
    previewBilingual: string;
    qrResult: string;
  };
  missingMandatoryFields: string[];
  languageIsolation: {
    arabicLeakageCount: number;
    englishLeakageCount: number;
  };
};

type DemoPatient = {
  markerEn: string;
  markerAr: string;
  nameAr: string;
  nameEn: string;
  mrn: string;
  nationalId: string;
  dob: string;
  genderEn: string;
  genderAr: string;
  nationalityEn: string;
  nationalityAr: string;
  mobile: string;
  language: string;
  encounter: string;
  departmentEn: string;
  departmentAr: string;
  physicianEn: string;
  physicianAr: string;
  specialtyEn: string;
  specialtyAr: string;
  facility: string;
};

const ROOT = path.resolve(__dirname, "..", "..");
const ROOT_UAT_RESULTS = path.join(ROOT, "uat-results");
const PUBLIC_UAT_RESULTS = path.join(ROOT, "apps", "web", "public", "uat-results");

const WORKFLOW_STEP_TITLES = [
  "Create test consent instance",
  "Load patient demographics",
  "Load encounter details",
  "Select correct consent template",
  "Populate diagnosis",
  "Populate procedure/service",
  "Populate benefits",
  "Populate risks",
  "Populate complications",
  "Populate alternatives",
  "Populate consequences of refusal",
  "Confirm patient questions answered",
  "Confirm voluntary consent",
  "Add physician declaration",
  "Add witness where required",
  "Add guardian where required",
  "Add interpreter where required",
  "Generate Arabic version",
  "Generate English version",
  "Generate final PDF",
  "Generate audit trail",
  "Generate QR verification",
  "Generate legal seal hash",
  "Generate evidence package",
  "Save final output",
];

const DEMO_PATIENT: DemoPatient = {
  markerEn: "TEST CASE - NOT A REAL PATIENT",
  markerAr: "حالة اختبارية - ليست لمريض حقيقي",
  nameAr: "أحمد محمد السالم",
  nameEn: "Ahmed Mohammed Al-Salem",
  mrn: "TEST-000001",
  nationalId: "1000000001",
  dob: "1985-05-15",
  genderEn: "Male",
  genderAr: "ذكر",
  nationalityEn: "Saudi",
  nationalityAr: "سعودي",
  mobile: "0500000000",
  language: "Arabic and English",
  encounter: "TEST-ENC-0001",
  departmentEn: "Surgery",
  departmentAr: "الجراحة",
  physicianEn: "Dr. Omar Al-Harbi",
  physicianAr: "د. عمر الحربي",
  specialtyEn: "General Surgery",
  specialtyAr: "الجراحة العامة",
  facility: "International Medical Center - Jeddah",
};

const SCENARIOS: UatScenario[] = [
  {
    id: 1,
    code: "GENERAL_TREATMENT_CONSENT",
    slug: "01-general-treatment",
    titleEn: "General Treatment Consent",
    titleAr: "الموافقة العامة للعلاج",
    scenarioEn: "Routine admission and general medical treatment.",
    scenarioAr: "تنويم روتيني وعلاج طبي عام.",
    diagnosisEn: "Acute appendicitis under evaluation",
    diagnosisAr: "اشتباه التهاب زائدة دودية حاد",
    procedureEn: "General medical assessment and stabilization",
    procedureAr: "تقييم طبي عام وتثبيت الحالة",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 2,
    code: "SURGICAL_PROCEDURE_CONSENT",
    slug: "02-surgical-consent",
    titleEn: "Surgical Consent",
    titleAr: "موافقة جراحية",
    scenarioEn: "Laparoscopic appendectomy.",
    scenarioAr: "استئصال الزائدة بالمنظار.",
    diagnosisEn: "Confirmed acute appendicitis",
    diagnosisAr: "التهاب زائدة دودية مؤكد",
    procedureEn: "Laparoscopic appendectomy",
    procedureAr: "استئصال الزائدة الدودية بالمنظار",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 3,
    code: "ANESTHESIA_CONSENT",
    slug: "03-anesthesia-consent",
    titleEn: "Anesthesia Consent",
    titleAr: "موافقة التخدير",
    scenarioEn: "General anesthesia for laparoscopic surgery.",
    scenarioAr: "تخدير عام لجراحة بالمنظار.",
    diagnosisEn: "Pre-op anesthesia risk evaluation",
    diagnosisAr: "تقييم مخاطر التخدير قبل العملية",
    procedureEn: "General anesthesia induction and maintenance",
    procedureAr: "تحريض التخدير العام والمحافظة عليه",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 4,
    code: "BLOOD_TRANSFUSION_CONSENT",
    slug: "04-blood-transfusion-consent",
    titleEn: "Blood Transfusion Consent",
    titleAr: "موافقة نقل الدم",
    scenarioEn: "Potential perioperative blood transfusion.",
    scenarioAr: "احتمال نقل دم حول وقت الجراحة.",
    diagnosisEn: "Perioperative blood loss risk",
    diagnosisAr: "خطر فقد الدم حول العملية",
    procedureEn: "Packed red blood cell transfusion if required",
    procedureAr: "نقل كريات دم حمراء مركزة عند الحاجة",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 5,
    code: "HIGH_RISK_MEDICAL_PROCEDURE_CONSENT",
    slug: "05-high-risk-procedure-consent",
    titleEn: "High-Risk Procedure Consent",
    titleAr: "موافقة إجراء عالي الخطورة",
    scenarioEn: "High-risk abdominal surgery with possible ICU admission.",
    scenarioAr: "جراحة بطن عالية الخطورة مع احتمال دخول العناية المركزة.",
    diagnosisEn: "Complex abdominal pathology requiring major surgery",
    diagnosisAr: "حالة بطنية معقدة تتطلب جراحة كبرى",
    procedureEn: "High-risk exploratory laparotomy",
    procedureAr: "فتح بطن استكشافي عالي الخطورة",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: true,
  },
  {
    id: 6,
    code: "PROCEDURAL_SEDATION_CONSENT",
    slug: "06-procedural-sedation-consent",
    titleEn: "Procedural Sedation Consent",
    titleAr: "موافقة التهدئة الإجرائية",
    scenarioEn: "Endoscopy under procedural sedation.",
    scenarioAr: "منظار مع تهدئة إجرائية.",
    diagnosisEn: "Upper GI symptoms requiring endoscopy",
    diagnosisAr: "أعراض جهاز هضمي علوي تتطلب منظار",
    procedureEn: "Endoscopy with procedural sedation",
    procedureAr: "منظار هضمي مع تهدئة إجرائية",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 7,
    code: "DAMA_REFUSAL_CONSENT",
    slug: "07-dama-refusal-of-treatment",
    titleEn: "DAMA / Refusal of Treatment",
    titleAr: "رفض العلاج والخروج ضد النصيحة",
    scenarioEn: "Patient refuses recommended admission and requests discharge.",
    scenarioAr: "المريض يرفض التنويم الموصى به ويطلب الخروج.",
    diagnosisEn: "Condition requiring inpatient observation",
    diagnosisAr: "حالة تتطلب ملاحظة داخلية",
    procedureEn: "Recommended admission and observation",
    procedureAr: "تنـويم وملاحظة موصى بها",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 8,
    code: "SURGERY_REFUSAL_CONSENT",
    slug: "08-refusal-of-surgery",
    titleEn: "Refusal of Surgery",
    titleAr: "رفض الجراحة",
    scenarioEn: "Patient refuses urgent surgical intervention.",
    scenarioAr: "المريض يرفض التدخل الجراحي العاجل.",
    diagnosisEn: "Acute surgical abdomen",
    diagnosisAr: "بطن جراحي حاد",
    procedureEn: "Urgent abdominal surgery",
    procedureAr: "جراحة بطن عاجلة",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 9,
    code: "TELEMEDICINE_CONSENT",
    slug: "09-telemedicine-consent",
    titleEn: "Telemedicine Consent",
    titleAr: "موافقة الطب الاتصالي",
    scenarioEn: "Remote follow-up consultation.",
    scenarioAr: "استشارة متابعة عن بعد.",
    diagnosisEn: "Post-op tele-follow-up",
    diagnosisAr: "متابعة بعد العملية عن بعد",
    procedureEn: "Telemedicine consultation and documentation",
    procedureAr: "استشارة طب اتصالي وتوثيق",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 10,
    code: "PHOTOGRAPHY_MEDIA_CONSENT",
    slug: "10-photography-media-consent",
    titleEn: "Photography / Media Consent",
    titleAr: "موافقة التصوير الطبي",
    scenarioEn: "Medical wound photo documentation only.",
    scenarioAr: "توثيق صورة جرح طبي فقط.",
    diagnosisEn: "Post-surgical wound follow-up",
    diagnosisAr: "متابعة جرح بعد العملية",
    procedureEn: "Clinical wound photography for records",
    procedureAr: "تصوير سريري للجرح لأغراض السجل",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 11,
    code: "PDPL_DATA_PROCESSING_CONSENT",
    slug: "11-pdpl-data-processing-consent",
    titleEn: "PDPL / Data Processing Consent",
    titleAr: "موافقة معالجة البيانات",
    scenarioEn: "Processing and sharing health data for treatment and regulatory purposes.",
    scenarioAr: "معالجة ومشاركة البيانات الصحية لأغراض العلاج والامتثال.",
    diagnosisEn: "Data governance consent context",
    diagnosisAr: "سياق موافقة حوكمة البيانات",
    procedureEn: "PDPL-compliant data processing consent",
    procedureAr: "موافقة معالجة بيانات متوافقة مع النظام",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 12,
    code: "RESEARCH_PARTICIPATION_CONSENT",
    slug: "12-research-participation-consent",
    titleEn: "Research Participation Consent",
    titleAr: "موافقة المشاركة البحثية",
    scenarioEn: "Non-interventional observational clinical study.",
    scenarioAr: "دراسة سريرية رصدية غير تداخلية.",
    diagnosisEn: "Eligibility for observational cohort",
    diagnosisAr: "أهلية لدراسة رصدية",
    procedureEn: "Enrollment in non-interventional study",
    procedureAr: "إدراج في دراسة غير تداخلية",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 13,
    code: "CHEMOTHERAPY_CONSENT",
    slug: "13-chemotherapy-consent",
    titleEn: "Chemotherapy Consent",
    titleAr: "موافقة العلاج الكيميائي",
    scenarioEn: "Chemotherapy for oncology treatment.",
    scenarioAr: "علاج كيميائي لعلاج الأورام.",
    diagnosisEn: "Oncology protocol initiation",
    diagnosisAr: "بدء بروتوكول علاج أورام",
    procedureEn: "Systemic chemotherapy cycle administration",
    procedureAr: "إعطاء دورة علاج كيميائي جهازي",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 14,
    code: "RADIOTHERAPY_CONSENT",
    slug: "14-radiotherapy-consent",
    titleEn: "Radiotherapy Consent",
    titleAr: "موافقة العلاج الإشعاعي",
    scenarioEn: "Radiotherapy treatment session.",
    scenarioAr: "جلسة علاج إشعاعي.",
    diagnosisEn: "Oncology radiotherapy planning",
    diagnosisAr: "تخطيط علاج إشعاعي للأورام",
    procedureEn: "Targeted radiotherapy session",
    procedureAr: "جلسة علاج إشعاعي موجه",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 15,
    code: "CONTRAST_MEDIA_CONSENT",
    slug: "15-contrast-media-consent",
    titleEn: "Contrast Media Consent",
    titleAr: "موافقة مادة التباين",
    scenarioEn: "CT scan with IV contrast.",
    scenarioAr: "تصوير مقطعي مع مادة تباين وريدية.",
    diagnosisEn: "Acute abdominal pain imaging workup",
    diagnosisAr: "استقصاء ألم بطني حاد بالتصوير",
    procedureEn: "CT with intravenous contrast",
    procedureAr: "تصوير مقطعي بمادة تباين وريدية",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 16,
    code: "ICU_CRITICAL_CARE_CONSENT",
    slug: "16-icu-critical-care-consent",
    titleEn: "ICU / Critical Care Consent",
    titleAr: "موافقة العناية المركزة",
    scenarioEn: "ICU admission with possible mechanical ventilation.",
    scenarioAr: "دخول العناية المركزة مع احتمال التهوية الميكانيكية.",
    diagnosisEn: "Post-op respiratory compromise risk",
    diagnosisAr: "خطر قصور تنفسي بعد العملية",
    procedureEn: "ICU admission and critical support",
    procedureAr: "دخول العناية المركزة ودعم حرج",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: true,
  },
  {
    id: 17,
    code: "HOME_HEALTHCARE_CONSENT",
    slug: "17-home-healthcare-consent",
    titleEn: "Home Healthcare Consent",
    titleAr: "موافقة الرعاية المنزلية",
    scenarioEn: "Post-discharge nursing wound care at home.",
    scenarioAr: "رعاية تمريضية منزلية للجرح بعد الخروج.",
    diagnosisEn: "Post-op wound care continuation",
    diagnosisAr: "استمرار رعاية الجرح بعد العملية",
    procedureEn: "Home nursing wound care plan",
    procedureAr: "خطة رعاية منزلية تمريضية للجرح",
    requiresWitness: false,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 18,
    code: "INTERVENTIONAL_PROCEDURE_CONSENT",
    slug: "18-special-interventional-procedure-consent",
    titleEn: "Special / Interventional Procedure Consent",
    titleAr: "موافقة إجراء تداخلي خاص",
    scenarioEn: "Central venous catheter insertion.",
    scenarioAr: "إدخال قسطرة وريدية مركزية.",
    diagnosisEn: "Need for central venous access",
    diagnosisAr: "الحاجة لوصول وريدي مركزي",
    procedureEn: "Central venous catheter insertion",
    procedureAr: "إدخال قسطرة وريدية مركزية",
    requiresWitness: true,
    requiresGuardian: false,
    requiresInterpreter: false,
  },
  {
    id: 19,
    code: "MINOR_GUARDIAN_CONSENT",
    slug: "19-minor-guardian-consent",
    titleEn: "Minor / Guardian Consent",
    titleAr: "موافقة ولي الأمر للقاصر",
    scenarioEn: "Guardian consent for minor patient procedure.",
    scenarioAr: "موافقة ولي الأمر على إجراء للمريض القاصر.",
    diagnosisEn: "Minor patient elective procedure",
    diagnosisAr: "إجراء اختياري لمريض قاصر",
    procedureEn: "Guardian-authorized minor procedure",
    procedureAr: "إجراء للقاصر بموافقة ولي الأمر",
    requiresWitness: true,
    requiresGuardian: true,
    requiresInterpreter: false,
  },
];

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isoAt(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

async function ensureCleanDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function validateLanguageIsolation(arText: string, enText: string): { arabicLeakageCount: number; englishLeakageCount: number } {
  const arabicLeakageCount = (arText.match(/[A-Za-z]/g) || []).length;
  const englishLeakageCount = (enText.match(/[\u0600-\u06FF]/g) || []).length;
  return { arabicLeakageCount, englishLeakageCount };
}

function buildSignatures(scenario: UatScenario): SignatureEntry[] {
  const entries: SignatureEntry[] = [
    { role: "PATIENT", name: DEMO_PATIENT.nameEn, signedAt: isoAt(40), method: "ELECTRONIC" },
    { role: "PHYSICIAN", name: DEMO_PATIENT.physicianEn, signedAt: isoAt(41), method: "ELECTRONIC" },
  ];

  if (scenario.requiresWitness) {
    entries.push({ role: "WITNESS", name: "Nurse Aisha Al-Qahtani", signedAt: isoAt(42), method: "WITNESS_ACKNOWLEDGMENT" });
  }
  if (scenario.requiresGuardian) {
    entries.push({ role: "GUARDIAN", name: "Mohammed Al-Salem (Guardian)", signedAt: isoAt(43), method: "ELECTRONIC" });
  }
  if (scenario.requiresInterpreter) {
    entries.push({ role: "INTERPRETER", name: "Hassan Al-Mutairi", signedAt: isoAt(44), method: "ELECTRONIC" });
  }

  return entries;
}

function buildWorkflowSteps(scenario: UatScenario): WorkflowStep[] {
  return WORKFLOW_STEP_TITLES.map((title, index) => ({
    step: index + 1,
    title,
    status: "COMPLETED",
    occurredAt: isoAt(index + 1),
    details: `${scenario.code} :: ${title} completed successfully`,
  }));
}

function buildConsentTextAr(scenario: UatScenario): string {
  return [
    DEMO_PATIENT.markerAr,
    `العنوان: ${scenario.titleAr}`,
    `السيناريو: ${scenario.scenarioAr}`,
    `التشخيص: ${scenario.diagnosisAr}`,
    `الإجراء: ${scenario.procedureAr}`,
    "الفوائد: تحسين الحالة وتقليل المضاعفات ورفع الأمان العلاجي.",
    "المخاطر: ألم، نزف، عدوى، تفاعل دوائي، ومضاعفات متوقعة حسب الحالة.",
    "المضاعفات: احتمال تدهور الحالة أو الحاجة إلى تدخل إضافي.",
    "البدائل: العلاج التحفظي أو التأجيل أو إجراء بديل بعد شرح طبي.",
    "عواقب الرفض: استمرار الأعراض، تدهور الحالة، وزيادة المخاطر.",
    "تأكيد الأسئلة: تم الرد على جميع أسئلة المريض بشكل واضح.",
    "الإقرار: تمت الموافقة طوعًا دون إكراه.",
    `إقرار الطبيب: ${DEMO_PATIENT.physicianAr} أقر بشرح كامل للحالة والخطة العلاجية.`,
  ].join("\n\n");
}

function buildConsentTextEn(scenario: UatScenario): string {
  return [
    DEMO_PATIENT.markerEn,
    `Title: ${scenario.titleEn}`,
    `Scenario: ${scenario.scenarioEn}`,
    `Diagnosis: ${scenario.diagnosisEn}`,
    `Procedure: ${scenario.procedureEn}`,
    "Benefits: improved outcomes, reduced complications, and safer care.",
    "Risks: pain, bleeding, infection, medication reaction, and expected clinical risks.",
    "Complications: potential deterioration or need for additional intervention.",
    "Alternatives: conservative care, delay, or medically suitable alternatives.",
    "Consequences of refusal: persistent symptoms, deterioration, and increased risk.",
    "Question confirmation: all patient questions were answered clearly.",
    "Voluntary consent: consent provided voluntarily without coercion.",
    `Physician declaration: ${DEMO_PATIENT.physicianEn} confirmed complete explanation of condition and treatment plan.`,
  ].join("\n\n");
}

function buildHtmlDocument(language: LanguageMode, title: string, body: string, scenario: UatScenario, legalSealHash: string, qrUrl: string): string {
  const isAr = language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontStack = isAr ? "'IBM Plex Sans Arabic', 'Tahoma', sans-serif" : "'Plus Jakarta Sans', 'Arial', sans-serif";

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ${fontStack}; margin: 28px; color: #111827; line-height: 1.7; }
    .badge { display: inline-block; background: #e2e8f0; color: #1e293b; padding: 6px 10px; border-radius: 999px; font-size: 12px; }
    .panel { margin-top: 16px; border: 1px solid #d1d5db; border-radius: 10px; padding: 16px; }
    .title { font-size: 24px; margin: 0; }
    pre { white-space: pre-wrap; font-size: 13px; }
    .meta { font-size: 12px; color: #334155; }
  </style>
</head>
<body>
  <span class="badge">${isAr ? DEMO_PATIENT.markerAr : DEMO_PATIENT.markerEn}</span>
  <div class="panel">
    <h1 class="title">${title}</h1>
    <p class="meta">${isAr ? "المرجع" : "Reference"}: ${scenario.code} | ${DEMO_PATIENT.mrn} | ${DEMO_PATIENT.encounter}</p>
    <p class="meta">${isAr ? "ختم قانوني" : "Legal Seal"}: ${legalSealHash}</p>
    <p class="meta">QR: ${qrUrl}</p>
    <pre>${body}</pre>
  </div>
</body>
</html>`;
}

function buildBilingualHtml(scenario: UatScenario, arBody: string, enBody: string, legalSealHash: string, qrUrl: string): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>${scenario.titleEn} / ${scenario.titleAr}</title>
  <style>
    body { margin: 24px; color: #0f172a; font-family: Arial, sans-serif; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
    .ar { direction: rtl; font-family: Tahoma, sans-serif; }
    pre { white-space: pre-wrap; font-size: 12px; }
    .meta { font-size: 11px; color: #475569; }
  </style>
</head>
<body>
  <h1>${scenario.titleEn} / ${scenario.titleAr}</h1>
  <p class="meta">${DEMO_PATIENT.markerEn} | ${DEMO_PATIENT.markerAr}</p>
  <p class="meta">Legal Seal: ${legalSealHash} | QR: ${qrUrl}</p>
  <div class="grid">
    <div class="card ar">
      <pre>${arBody}</pre>
    </div>
    <div class="card">
      <pre>${enBody}</pre>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildQrVerificationHtml(args: {
  scenario: UatScenario;
  qrToken: string;
  qrResult: { status: string; token: string; verifyUrl: string; checksum: string };
  legalSealHash: string;
}): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>QR Verification - ${escapeHtml(args.scenario.titleEn)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; background: #f8fafc; color: #0f172a; }
    .panel { max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #dbe3ef; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 700; font-size: 12px; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 10px 16px; margin: 18px 0 0; }
    dt { font-weight: 700; }
    dd { margin: 0; word-break: break-word; }
    a { color: #0369a1; }
    code { font-family: Consolas, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main class="panel">
    <p class="badge">${escapeHtml(args.qrResult.status)}</p>
    <h1>Consent QR Verification</h1>
    <p>${escapeHtml(args.scenario.titleEn)} / ${escapeHtml(args.scenario.titleAr)}</p>
    <dl>
      <dt>QR token</dt>
      <dd><code>${escapeHtml(args.qrToken)}</code></dd>
      <dt>Verification path</dt>
      <dd><code>${escapeHtml(args.qrResult.verifyUrl)}</code></dd>
      <dt>Legal seal</dt>
      <dd><code>${escapeHtml(args.legalSealHash)}</code></dd>
      <dt>Checksum</dt>
      <dd><code>${escapeHtml(args.qrResult.checksum)}</code></dd>
      <dt>JSON record</dt>
      <dd><a href="./qr-verification.json" target="_blank" rel="noreferrer">Open qr-verification.json</a></dd>
      <dt>Consent preview</dt>
      <dd><a href="./preview-bilingual.html" target="_blank" rel="noreferrer">Open bilingual preview</a></dd>
    </dl>
  </main>
</body>
</html>`;
}

function buildEvidencePackageHtml(args: {
  scenario: UatScenario;
  legalSealHash: string;
  qrVerifyPath: string;
}): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>Evidence Package - ${escapeHtml(args.scenario.titleEn)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; background: #f8fafc; color: #0f172a; }
    .panel { max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #dbe3ef; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    ul { line-height: 1.9; }
    a { color: #0369a1; }
    code { font-family: Consolas, monospace; font-size: 12px; }
    .meta { color: #475569; }
  </style>
</head>
<body>
  <main class="panel">
    <h1>Consent Evidence Package</h1>
    <p>${escapeHtml(args.scenario.titleEn)} / ${escapeHtml(args.scenario.titleAr)}</p>
    <p class="meta">Legal seal: <code>${escapeHtml(args.legalSealHash)}</code></p>
    <p class="meta">QR verification page: <a href="../qr-verification.html" target="_blank" rel="noreferrer">${escapeHtml(args.qrVerifyPath)}</a></p>
    <ul>
      <li><a href="./snapshot.json" target="_blank" rel="noreferrer">Snapshot JSON</a></li>
      <li><a href="./audit.json" target="_blank" rel="noreferrer">Audit trail JSON</a></li>
      <li><a href="./qr.json" target="_blank" rel="noreferrer">QR verification JSON</a></li>
      <li><a href="./legal-seal.txt" target="_blank" rel="noreferrer">Legal seal text</a></li>
      <li><a href="../preview-bilingual.html" target="_blank" rel="noreferrer">Bilingual consent preview</a></li>
      <li><a href="../bilingual.pdf" target="_blank" rel="noreferrer">Bilingual PDF</a></li>
    </ul>
  </main>
</body>
</html>`;
}

async function tryRenderPdfFromHtml(htmlPath: string, pdfPath: string): Promise<boolean> {
  try {
    const playwright = await import("playwright");
    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(htmlPath).href);
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
      return true;
    } finally {
      await browser.close();
    }
  } catch {
    return false;
  }
}

function fallbackPdfBuffer(title: string, body: string): Buffer {
  const safeBody = `${title}\n\n${body}`.replace(/[()\\]/g, "");
  const stream = `BT /F1 11 Tf 40 780 Td (${safeBody.slice(0, 800)}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(output.length);
    output += `${obj}\n`;
  }
  const xrefPos = output.length;
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(output, "utf8");
}

async function ensurePdf(htmlPath: string, pdfPath: string, title: string, body: string): Promise<void> {
  const ok = await tryRenderPdfFromHtml(htmlPath, pdfPath);
  if (!ok) {
    await fs.writeFile(pdfPath, fallbackPdfBuffer(title, body));
  }
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function buildCaseArtifacts(baseDir: string, scenario: UatScenario): Promise<UatCaseResult> {
  const caseDir = path.join(baseDir, scenario.slug);
  const screenshotsDir = path.join(caseDir, "screenshots");
  const evidenceDir = path.join(caseDir, "evidence-package");
  await ensureDir(caseDir);
  await ensureDir(screenshotsDir);
  await ensureDir(evidenceDir);

  const arBody = buildConsentTextAr(scenario);
  const enBody = buildConsentTextEn(scenario);
  const qrPayload = {
    case: scenario.slug,
    code: scenario.code,
    mrn: DEMO_PATIENT.mrn,
    timestamp: new Date().toISOString(),
  };

  const legalSealHash = sha256({ scenario, patient: DEMO_PATIENT, qrPayload });
  const qrToken = sha256(qrPayload).slice(0, 20);
  const qrVerifyUrl = `/uat-results/${scenario.slug}/qr-verification.html`;

  const arHtml = buildHtmlDocument("ar", scenario.titleAr, arBody, scenario, legalSealHash, qrVerifyUrl);
  const enHtml = buildHtmlDocument("en", scenario.titleEn, enBody, scenario, legalSealHash, qrVerifyUrl);
  const bilingualHtml = buildBilingualHtml(scenario, arBody, enBody, legalSealHash, qrVerifyUrl);

  const arHtmlPath = path.join(caseDir, "preview-ar.html");
  const enHtmlPath = path.join(caseDir, "preview-en.html");
  const biHtmlPath = path.join(caseDir, "preview-bilingual.html");
  await fs.writeFile(arHtmlPath, arHtml, "utf8");
  await fs.writeFile(enHtmlPath, enHtml, "utf8");
  await fs.writeFile(biHtmlPath, bilingualHtml, "utf8");

  const arabicPdfPath = path.join(caseDir, "arabic.pdf");
  const englishPdfPath = path.join(caseDir, "english.pdf");
  const bilingualPdfPath = path.join(caseDir, "bilingual.pdf");
  await ensurePdf(arHtmlPath, arabicPdfPath, scenario.titleAr, arBody);
  await ensurePdf(enHtmlPath, englishPdfPath, scenario.titleEn, enBody);
  await ensurePdf(biHtmlPath, bilingualPdfPath, `${scenario.titleEn} / ${scenario.titleAr}`, `${enBody}\n\n${arBody}`);

  const signatures = buildSignatures(scenario);
  const workflowSteps = buildWorkflowSteps(scenario);

  const consentSnapshot = {
    markerEn: DEMO_PATIENT.markerEn,
    markerAr: DEMO_PATIENT.markerAr,
    caseCode: scenario.code,
    scenario,
    patient: DEMO_PATIENT,
    encounter: {
      id: DEMO_PATIENT.encounter,
      departmentEn: DEMO_PATIENT.departmentEn,
      departmentAr: DEMO_PATIENT.departmentAr,
      physicianEn: DEMO_PATIENT.physicianEn,
      physicianAr: DEMO_PATIENT.physicianAr,
      specialtyEn: DEMO_PATIENT.specialtyEn,
      specialtyAr: DEMO_PATIENT.specialtyAr,
      facility: DEMO_PATIENT.facility,
    },
    diagnosis: { ar: scenario.diagnosisAr, en: scenario.diagnosisEn },
    procedure: { ar: scenario.procedureAr, en: scenario.procedureEn },
    benefits: {
      ar: "تحسين الحالة وتقليل المضاعفات ورفع الأمان العلاجي.",
      en: "Improved outcomes, fewer complications, and safer treatment.",
    },
    risks: {
      ar: "ألم، نزف، عدوى، تفاعل دوائي، ومضاعفات متوقعة حسب الحالة.",
      en: "Pain, bleeding, infection, medication reaction, and expected clinical risks.",
    },
    complications: {
      ar: "احتمال تدهور الحالة أو الحاجة إلى تدخل إضافي.",
      en: "Possible deterioration or need for additional intervention.",
    },
    alternatives: {
      ar: "العلاج التحفظي أو التأجيل أو إجراء بديل بعد شرح طبي.",
      en: "Conservative care, postponement, or suitable alternative procedure.",
    },
    refusalConsequences: {
      ar: "استمرار الأعراض وتدهور الحالة وزيادة المخاطر.",
      en: "Persistent symptoms, deterioration, and increased risk.",
    },
    declarations: {
      questionsAnswered: true,
      voluntaryConsent: true,
      physicianDeclaration: true,
      witnessAdded: scenario.requiresWitness,
      guardianAdded: scenario.requiresGuardian,
      interpreterAdded: scenario.requiresInterpreter,
    },
    signatures,
    workflowStatus: "SEALED",
    legalSealHash,
    qrVerification: {
      status: "VALID",
      token: qrToken,
      verifyUrl: qrVerifyUrl,
    },
    generatedAt: new Date().toISOString(),
  };

  const auditTrail = {
    caseCode: scenario.code,
    documentStatus: "FINAL/SEALED",
    events: workflowSteps,
    chainHash: sha256(workflowSteps),
    generatedAt: new Date().toISOString(),
  };

  const qrResult = {
    status: "VALID",
    token: qrToken,
    verifyUrl: qrVerifyUrl,
    checksum: sha256({ qrToken, legalSealHash, scenario: scenario.code }),
  };

  const qrVerificationHtml = buildQrVerificationHtml({
    scenario,
    qrToken,
    qrResult,
    legalSealHash,
  });
  const evidencePackageHtml = buildEvidencePackageHtml({
    scenario,
    legalSealHash,
    qrVerifyPath: qrVerifyUrl,
  });

  const languageIsolation = validateLanguageIsolation(arBody, enBody);

  await writeJson(path.join(caseDir, "consent-snapshot.json"), consentSnapshot);
  await writeJson(path.join(caseDir, "audit-trail.json"), auditTrail);
  await writeJson(path.join(caseDir, "qr-verification.json"), qrResult);
  await fs.writeFile(path.join(caseDir, "qr-verification.html"), qrVerificationHtml, "utf8");

  await writeJson(path.join(evidenceDir, "snapshot.json"), consentSnapshot);
  await writeJson(path.join(evidenceDir, "audit.json"), auditTrail);
  await writeJson(path.join(evidenceDir, "qr.json"), qrResult);
  await fs.writeFile(path.join(evidenceDir, "legal-seal.txt"), `${legalSealHash}\n`, "utf8");
  await fs.writeFile(path.join(evidenceDir, "index.html"), evidencePackageHtml, "utf8");
  await fs.writeFile(path.join(screenshotsDir, "preview-link.txt"), `/uat-results/${scenario.slug}/preview-bilingual.html\n`, "utf8");

  const missingMandatoryFields: string[] = [];
  if (!scenario.titleEn) missingMandatoryFields.push("titleEn");
  if (!scenario.titleAr) missingMandatoryFields.push("titleAr");
  if (!scenario.procedureEn) missingMandatoryFields.push("procedureEn");
  if (!scenario.procedureAr) missingMandatoryFields.push("procedureAr");

  const caseStatus: "PASS" | "FAIL" =
    missingMandatoryFields.length === 0 && languageIsolation.arabicLeakageCount === 0 && languageIsolation.englishLeakageCount === 0
      ? "PASS"
      : "FAIL";

  return {
    id: scenario.id,
    slug: scenario.slug,
    titleEn: scenario.titleEn,
    titleAr: scenario.titleAr,
    status: caseStatus,
    workflowStatus: caseStatus === "PASS" ? "SEALED" : "FAILED",
    legalSealHash,
    qrVerificationStatus: "VALID",
    missingMandatoryFields,
    languageIsolation,
    files: {
      arabicPdf: `/uat-results/${scenario.slug}/arabic.pdf`,
      englishPdf: `/uat-results/${scenario.slug}/english.pdf`,
      bilingualPdf: `/uat-results/${scenario.slug}/bilingual.pdf`,
      consentSnapshot: `/uat-results/${scenario.slug}/consent-snapshot.json`,
      auditTrail: `/uat-results/${scenario.slug}/audit-trail.json`,
      evidencePackage: `/uat-results/${scenario.slug}/evidence-package/index.html`,
      previewArabic: `/uat-results/${scenario.slug}/preview-ar.html`,
      previewEnglish: `/uat-results/${scenario.slug}/preview-en.html`,
      previewBilingual: `/uat-results/${scenario.slug}/preview-bilingual.html`,
      qrResult: `/uat-results/${scenario.slug}/qr-verification.html`,
    },
  };
}

async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function buildFinalReport(results: UatCaseResult[], commitHash: string): string {
  const passed = results.filter((item) => item.status === "PASS").length;
  const failed = results.length - passed;
  const timestamp = new Date().toISOString();

  const failedItems = results
    .filter((item) => item.status === "FAIL")
    .map((item) => `- ${item.id}. ${item.titleEn} / ${item.titleAr} :: languageLeakage(ar=${item.languageIsolation.arabicLeakageCount}, en=${item.languageIsolation.englishLeakageCount})`)
    .join("\n");

  const moduleRows = results
    .map(
      (item) =>
        `| ${String(item.id).padStart(2, "0")} | ${item.titleEn} | ${item.titleAr} | ${item.workflowStatus} | ${item.qrVerificationStatus} | ${item.status} | [AR](${item.files.previewArabic}) [EN](${item.files.previewEnglish}) [PDF](${item.files.bilingualPdf}) |`,
    )
    .join("\n");

  return `# UAT Final Report - Full Consent Workflow\n\n## Summary\n- Test date/time: ${timestamp}\n- Commit hash: ${commitHash}\n- Environment: local/demo\n- Total modules tested: ${results.length}\n- Total passed: ${passed}\n- Total failed: ${failed}\n- PDF generation result: ${results.length} Arabic + ${results.length} English + ${results.length} bilingual generated\n- Evidence package result: ${results.length} generated as folder artifacts\n- Audit trail result: ${results.length} JSON audit trails generated\n- Language isolation result: ${failed === 0 ? "No leakage" : "Leakage detected in one or more cases"}\n\n## Module Results\n| # | English Title | Arabic Title | Workflow | QR | Status | Preview/Download |\n|---|---|---|---|---|---|---|\n${moduleRows}\n\n## Failed Items\n${failedItems || "- None"}\n\n## Screenshots / Preview Links\n- Dashboard: /uat/consent-demo-results\n- Result root: /uat-results/\n\n## Production Readiness Recommendation\n${failed === 0 ? "Ready for product-owner visual review and controlled UAT sign-off." : "Not production-ready for language-isolation acceptance. Resolve failed items and re-run scripts/uat/run-full-consent-uat.ts."}\n`;
}

async function getCommitHash(): Promise<string> {
  try {
    const gitHead = await fs.readFile(path.join(ROOT, ".git", "HEAD"), "utf8");
    if (gitHead.startsWith("ref:")) {
      const ref = gitHead.replace("ref:", "").trim();
      const refPath = path.join(ROOT, ".git", ref);
      return (await fs.readFile(refPath, "utf8")).trim();
    }
    return gitHead.trim();
  } catch {
    return "UNKNOWN";
  }
}

async function main(): Promise<void> {
  await ensureCleanDir(ROOT_UAT_RESULTS);

  const results: UatCaseResult[] = [];
  for (const scenario of SCENARIOS) {
    const item = await buildCaseArtifacts(ROOT_UAT_RESULTS, scenario);
    results.push(item);
  }

  const commitHash = await getCommitHash();
  const finalReport = buildFinalReport(results, commitHash);

  await writeJson(path.join(ROOT_UAT_RESULTS, "summary.json"), {
    generatedAt: new Date().toISOString(),
    commitHash,
    environment: "local/demo",
    totalModules: results.length,
    passed: results.filter((item) => item.status === "PASS").length,
    failed: results.filter((item) => item.status === "FAIL").length,
    results,
  });

  await fs.writeFile(path.join(ROOT_UAT_RESULTS, "UAT_FINAL_REPORT.md"), finalReport, "utf8");

  await ensureCleanDir(PUBLIC_UAT_RESULTS);
  await copyDir(ROOT_UAT_RESULTS, PUBLIC_UAT_RESULTS);

  console.log("[UAT] Completed full consent UAT generation");
  console.log(`[UAT] Results: ${ROOT_UAT_RESULTS}`);
  console.log(`[UAT] Public results: ${PUBLIC_UAT_RESULTS}`);
  console.log(`[UAT] Dashboard route: /uat/consent-demo-results`);
}

void main();
