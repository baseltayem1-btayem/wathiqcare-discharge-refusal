import { ConsentSectionKind, ConsentTemplateStatus, Prisma } from "@prisma/client";
import crypto from "node:crypto";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  SAUDI_ENTERPRISE_TEMPLATES,
  buildSaudiTemplateBodyAr,
  buildSaudiTemplateBodyEn,
  buildSaudiTemplateSections,
  type SaudiEnterpriseTemplateSeed,
} from "@/lib/server/informed-consents-saudi-template-library";

const prisma = () => getPrisma();

export type RuntimeConsentTemplate = {
  id: string;
  templateVersionId: string;
  titleAr: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department: string | null;
  version: string;
  status: ConsentTemplateStatus;
  language: "bilingual";
  summaryAr: string | null;
  summaryEn: string | null;
  previewAr: string;
  previewEn: string;
};

type RuntimeTemplateFilter = {
  consentType?: string;
  specialty?: string;
  department?: string;
};

type DefaultTemplateSeed = SaudiEnterpriseTemplateSeed;

const FIXED_LEGAL_TITLE_AR = "الموافقة المستنيرة الطبية";
const FIXED_LEGAL_TITLE_EN = "Medical Informed Consent";

const FIXED_MAIN_AR = `أقر أنا الموقع أدناه بأن الطبيب المعالج وفريق الرعاية الصحية قد قاموا بشرح حالتي الصحية وطبيعة الإجراء الطبي / الجراحي / التشخيصي / العلاجي المقترح لي بصورة واضحة ومفهومة، بما في ذلك الغرض من الإجراء، والفوائد المتوقعة، والمخاطر والمضاعفات المحتملة، والبدائل العلاجية الممكنة، إضافة إلى النتائج أو المضاعفات المحتملة في حال رفض العلاج أو عدم إجرائه.

كما أقر بأنه أتيحت لي الفرصة الكاملة لطرح الأسئلة والاستفسارات المتعلقة بحالتي الصحية والإجراء المقترح، وقد تمت الإجابة على جميع استفساراتي بصورة واضحة ومفهومة ومرضية بالنسبة لي.

وأفهم أن ممارسة الطب والجراحة لا تخلو من المخاطر والمضاعفات المحتملة، وأنه لا يمكن تقديم أو ضمان نتائج محددة بشكل مطلق، رغم اتخاذ كافة المعايير المهنية والطبية المتعارف عليها.

وأفهم كذلك أن بعض المخاطر أو المضاعفات قد تكون شائعة أو نادرة أو خطيرة أو مهددة للحياة بحسب طبيعة الإجراء وحالتي الصحية.

كما أوافق على اتخاذ أي إجراءات طبية إضافية أو طارئة يراها الفريق الطبي ضرورية أثناء أو بعد الإجراء الطبي حفاظًا على سلامتي الصحية، وفقًا للأصول الطبية المتعارف عليها.

وأقر بأنه قد تم شرح خيارات التخدير المناسبة لي — إن وجدت — بما في ذلك مخاطر التخدير ومضاعفاته المحتملة.

وأوافق على استخدام ومعالجة معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، وفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.

كما أقر بأن هذه الموافقة تمثل موافقة مستنيرة وصادرة بإرادتي الحرة دون أي إكراه أو ضغط.`;

const FIXED_MAIN_EN = `I, the undersigned, hereby acknowledge that the treating physician and healthcare team have explained to me, in a clear and understandable manner, my medical condition and the nature of the proposed medical, surgical, diagnostic, or therapeutic procedure, including the purpose of the procedure, expected benefits, potential risks and complications, available treatment alternatives, and the possible consequences or complications that may arise from refusing or delaying treatment.

I further acknowledge that I have been given full opportunity to ask questions and discuss concerns regarding my condition and the proposed procedure, and that all my questions have been answered clearly and satisfactorily.

I understand that the practice of medicine and surgery involves inherent risks and potential complications, and that no absolute guarantee or assurance has been made regarding specific outcomes, despite adherence to recognized medical and professional standards.

I further understand that certain risks or complications may be common, uncommon, serious, or life-threatening depending on the nature of the procedure and my medical condition.

I also authorize the medical team to perform any additional or emergency procedures deemed medically necessary during or after the procedure in order to preserve my health and safety in accordance with accepted medical standards.

I acknowledge that the available anesthesia options — where applicable — together with their potential risks and complications have been explained to me.

I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.

I further acknowledge that this informed consent is given voluntarily and without coercion or undue pressure.`;

const PATIENT_ACK_AR = "إقرار المريض / ولي الأمر: أقر بأنني قرأت وفهمت مضمون هذه الموافقة، وأن المعلومات المتعلقة بحالتي الصحية والإجراء المقترح قد تم شرحها لي بلغة واضحة ومفهومة، وأنني وافقت على الإجراء بعد اطلاعي على الفوائد والمخاطر والمضاعفات والبدائل ومخاطر الرفض.";
const PATIENT_ACK_EN = "Patient / Guardian Acknowledgment: I acknowledge that I have read and understood the contents of this consent form, and that the information regarding my medical condition and the proposed procedure has been explained to me in clear and understandable language. I consent to the procedure after being informed of the benefits, risks, complications, alternatives, and risks of refusal.";

const PHYSICIAN_CERT_AR = "إقرار الطبيب: أقر أنا الطبيب / الممارس الصحي الموقع أدناه بأنني قمت بشرح الحالة الطبية للمريض وطبيعة الإجراء المقترح والفوائد والمخاطر والمضاعفات المحتملة والبدائل العلاجية ومخاطر رفض العلاج للمريض أو لممثله النظامي بصورة واضحة ومفهومة، وأجبت على كافة الاستفسارات المطروحة وفقًا للأصول المهنية والطبية المتعارف عليها.";
const PHYSICIAN_CERT_EN = "Physician Certification: I, the undersigned physician / healthcare practitioner, certify that I have explained to the patient or the patient’s legal representative the medical condition, the nature of the proposed procedure, expected benefits, potential risks and complications, available treatment alternatives, and the risks of refusing treatment in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.";

const GUARDIAN_ACK_AR = "إقرار ولي الأمر / الممثل النظامي: أقر أنا الموقع أدناه بصفتي وليًا شرعيًا / ممثلًا نظاميًا للمريض بأنني مخول نظامًا بإعطاء هذه الموافقة نيابة عنه، وأنه تم شرح الحالة الطبية والإجراء المقترح والمخاطر والبدائل العلاجية لي بصورة واضحة ومفهومة.";
const GUARDIAN_ACK_EN = "Legal Guardian / Substitute Decision Maker Acknowledgment: I, the undersigned, acting as the patient’s legal guardian / authorized substitute decision maker, acknowledge that I am legally authorized to provide this consent on behalf of the patient, and that the medical condition, proposed procedure, risks, and treatment alternatives have been clearly explained to me.";

const INTERPRETER_ACK_AR = "إقرار المترجم: أقر بأن المعلومات المتعلقة بالحالة الصحية والإجراء المقترح قد تم شرحها للمريض / ولي الأمر باللغة التي يفهمها، وأنني قمت بالترجمة بصورة واضحة ومفهومة.";
const INTERPRETER_ACK_EN = "Interpreter Acknowledgment: I acknowledge that the information regarding the patient’s medical condition and proposed procedure has been explained to the patient / guardian in a language they understand, and that I have provided interpretation clearly and appropriately.";

const NO_GUARANTEE_AR = "عدم ضمان النتائج: أفهم وأقر بأنه لا يمكن ضمان أو التعهد بنتائج محددة للإجراء الطبي أو الجراحي أو العلاجي، وأن الاستجابة للعلاج تختلف من شخص لآخر بحسب الحالة الصحية والعوامل الطبية المختلفة.";
const NO_GUARANTEE_EN = "No Guarantee of Outcome: I understand and acknowledge that no specific result or outcome can be guaranteed for the medical, surgical, or therapeutic procedure, and that treatment outcomes may vary depending on individual medical conditions and related factors.";

const ELECTRONIC_SIGNATURE_AR = "التوقيع الإلكتروني: يُعد التوقيع الإلكتروني أو التوقيع المرسل عبر الرابط الإلكتروني الآمن معتمدًا وملزمًا نظامًا، ويترتب عليه ذات الأثر القانوني للتوقيع الخطي، وذلك وفقًا للأنظمة المعمول بها في المملكة العربية السعودية.";
const ELECTRONIC_SIGNATURE_EN = "Electronic Signature: Electronic signatures or signatures executed through a secure electronic link shall be considered legally valid and binding and shall have the same legal effect as handwritten signatures in accordance with the applicable laws and regulations of the Kingdom of Saudi Arabia.";

const PDPL_AR = "أوافق على استخدام ومعالجة معلوماتي الصحية الشخصية بالقدر اللازم لأغراض العلاج والرعاية الصحية والتوثيق الطبي والالتزام بالأنظمة واللوائح الصحية المعمول بها، وفقًا لنظام حماية البيانات الشخصية والأنظمة ذات العلاقة في المملكة العربية السعودية.";
const PDPL_EN = "I consent to the use and processing of my personal health information to the extent necessary for treatment, healthcare operations, medical documentation, and compliance with applicable healthcare laws and regulations, in accordance with the Personal Data Protection Law (PDPL) and related regulations of the Kingdom of Saudi Arabia.";

const LEGACY_DEFAULT_TEMPLATES: Array<Record<string, unknown>> = [
  {
    categoryCode: "GENERAL_CONSENT",
    categoryNameAr: "الموافقة العامة",
    categoryNameEn: "General Consent",
    templateCode: "GENERAL_TREATMENT_CONSENT",
    consentType: "GENERAL_CONSENT",
    specialty: "GENERAL_MEDICINE",
    department: "GENERAL_MEDICINE",
    titleAr: "نموذج الموافقة العامة على العلاج",
    titleEn: "General Treatment Consent",
    summaryAr: "موافقة علاجية عامة ثنائية اللغة مع فقرات قانونية ثابتة.",
    summaryEn: "Bilingual general treatment consent with fixed legal wording.",
  },
  {
    categoryCode: "SURGICAL_CONSENT",
    categoryNameAr: "موافقة جراحية",
    categoryNameEn: "Surgical Consent",
    templateCode: "GENERAL_SURGICAL_CONSENT",
    consentType: "SURGICAL_CONSENT",
    specialty: "SURGERY",
    department: "GENERAL_SURGERY",
    titleAr: "نموذج الموافقة الجراحية العامة",
    titleEn: "General Surgical Consent",
    summaryAr: "موافقة جراحية للممارسات الجراحية الروتينية وعالية المخاطر.",
    summaryEn: "Surgical consent for routine and high-risk surgery workflows.",
  },
  {
    categoryCode: "ANESTHESIA_CONSENT",
    categoryNameAr: "موافقة التخدير",
    categoryNameEn: "Anesthesia Consent",
    templateCode: "ANESTHESIA_CONSENT",
    consentType: "ANESTHESIA_CONSENT",
    specialty: "ANESTHESIA",
    department: "ANESTHESIA",
    titleAr: "نموذج موافقة التخدير",
    titleEn: "Anesthesia Consent",
    summaryAr: "موافقة تخدير تشمل المخاطر الشائعة والنادرة وخيارات التخدير.",
    summaryEn: "Anesthesia consent covering common/rare risks and anesthesia options.",
  },
  {
    categoryCode: "BLOOD_TRANSFUSION_CONSENT",
    categoryNameAr: "موافقة نقل الدم",
    categoryNameEn: "Blood Transfusion Consent",
    templateCode: "BLOOD_TRANSFUSION_CONSENT",
    consentType: "BLOOD_TRANSFUSION_CONSENT",
    specialty: "GENERAL_MEDICINE",
    department: "HEMATOLOGY",
    titleAr: "نموذج موافقة نقل الدم",
    titleEn: "Blood Transfusion Consent",
    summaryAr: "موافقة نقل الدم مع بدائل العلاج والمضاعفات المحتملة.",
    summaryEn: "Blood transfusion consent with alternatives and potential complications.",
  },
  {
    categoryCode: "REFUSAL_OF_TREATMENT",
    categoryNameAr: "رفض العلاج / داما",
    categoryNameEn: "DAMA / Refusal",
    templateCode: "DAMA_REFUSAL_OF_TREATMENT",
    consentType: "REFUSAL_OF_TREATMENT",
    specialty: "GENERAL_MEDICINE",
    department: "EMERGENCY",
    titleAr: "نموذج رفض العلاج (DAMA)",
    titleEn: "DAMA / Refusal of Treatment",
    summaryAr: "إقرار رفض العلاج مع توثيق مخاطر الرفض والبدائل.",
    summaryEn: "Refusal of treatment acknowledgment with refusal risks and alternatives.",
  },
];

const FIXED_DEFAULT_TEMPLATES: DefaultTemplateSeed[] = SAUDI_ENTERPRISE_TEMPLATES;

function requireTenantId(auth: AuthContext): string {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }
  return tenantId;
}

function normalizeFilter(value: string | null | undefined): string {
  return (value || "").trim();
}

function buildDefaultSections(): Array<{
  sectionKey: string;
  sectionKind: ConsentSectionKind;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isRequired: boolean;
  isEditableByPhysician: boolean;
  sortOrder: number;
}> {
  return [
    {
      sectionKey: "fixed_patient_acknowledgment",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "إقرار المريض / ولي الأمر",
      titleEn: "Patient / Guardian Acknowledgment",
      contentAr: PATIENT_ACK_AR,
      contentEn: PATIENT_ACK_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 10,
    },
    {
      sectionKey: "dynamic_diagnosis",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "التشخيص",
      titleEn: "Diagnosis",
      contentAr: "[يدخل الطبيب التشخيص الطبي هنا]",
      contentEn: "[Physician enters diagnosis here]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 20,
    },
    {
      sectionKey: "dynamic_medical_condition",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "الحالة الطبية",
      titleEn: "Medical condition",
      contentAr: "[وصف الحالة الطبية الحالية]",
      contentEn: "[Describe current medical condition]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 30,
    },
    {
      sectionKey: "dynamic_proposed_procedure",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "الإجراء المقترح",
      titleEn: "Proposed procedure",
      contentAr: "[تفاصيل الإجراء الطبي/الجراحي المقترح]",
      contentEn: "[Details of proposed medical/surgical procedure]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 40,
    },
    {
      sectionKey: "dynamic_procedure_site_laterality",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "موضع الإجراء / الجهة",
      titleEn: "Procedure site / laterality",
      contentAr: "[حدد موضع الإجراء والجهة اليمنى/اليسرى إن وجدت]",
      contentEn: "[Specify procedure site and laterality if applicable]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 50,
    },
    {
      sectionKey: "dynamic_expected_benefits",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "الفوائد المتوقعة",
      titleEn: "Expected benefits",
      contentAr: "[الفوائد العلاجية المتوقعة]",
      contentEn: "[Expected therapeutic benefits]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 60,
    },
    {
      sectionKey: "dynamic_common_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "المخاطر الشائعة",
      titleEn: "Common risks",
      contentAr: "[المخاطر الشائعة]",
      contentEn: "[Common risks]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 70,
    },
    {
      sectionKey: "dynamic_uncommon_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "المخاطر غير الشائعة",
      titleEn: "Uncommon risks",
      contentAr: "[المخاطر غير الشائعة]",
      contentEn: "[Uncommon risks]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 80,
    },
    {
      sectionKey: "dynamic_serious_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "المخاطر الجسيمة",
      titleEn: "Serious risks",
      contentAr: "[المخاطر الجسيمة أو المهددة للحياة]",
      contentEn: "[Serious or life-threatening risks]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 90,
    },
    {
      sectionKey: "dynamic_complications",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "المضاعفات",
      titleEn: "Complications",
      contentAr: "[المضاعفات المحتملة]",
      contentEn: "[Potential complications]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 100,
    },
    {
      sectionKey: "dynamic_treatment_alternatives",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "البدائل العلاجية",
      titleEn: "Treatment alternatives",
      contentAr: "[البدائل العلاجية الممكنة]",
      contentEn: "[Available treatment alternatives]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 110,
    },
    {
      sectionKey: "dynamic_refusal_risks",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "مخاطر رفض العلاج / عدم العلاج",
      titleEn: "Risks of refusal / non-treatment",
      contentAr: "[المخاطر المتوقعة في حال الرفض أو التأخير]",
      contentEn: "[Expected risks if treatment is refused or delayed]",
      isRequired: true,
      isEditableByPhysician: true,
      sortOrder: 120,
    },
    {
      sectionKey: "dynamic_post_procedure_instructions",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "تعليمات ما بعد الإجراء",
      titleEn: "Post-procedure instructions",
      contentAr: "[تعليمات المتابعة بعد الإجراء]",
      contentEn: "[Post-procedure follow-up instructions]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 130,
    },
    {
      sectionKey: "dynamic_physician_notes",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "ملاحظات الطبيب",
      titleEn: "Physician notes",
      contentAr: "[ملاحظات إضافية من الطبيب]",
      contentEn: "[Additional physician notes]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 140,
    },
    {
      sectionKey: "dynamic_special_precautions",
      sectionKind: ConsentSectionKind.DYNAMIC_MEDICAL,
      titleAr: "احتياطات خاصة",
      titleEn: "Special precautions",
      contentAr: "[احتياطات خاصة مرتبطة بالحالة]",
      contentEn: "[Special case-specific precautions]",
      isRequired: false,
      isEditableByPhysician: true,
      sortOrder: 150,
    },
    {
      sectionKey: "fixed_physician_certification",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "إقرار الطبيب",
      titleEn: "Physician Certification",
      contentAr: PHYSICIAN_CERT_AR,
      contentEn: PHYSICIAN_CERT_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 160,
    },
    {
      sectionKey: "fixed_legal_guardian_ack",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "إقرار ولي الأمر / الممثل النظامي",
      titleEn: "Legal Guardian / Substitute Decision Maker Acknowledgment",
      contentAr: GUARDIAN_ACK_AR,
      contentEn: GUARDIAN_ACK_EN,
      isRequired: false,
      isEditableByPhysician: false,
      sortOrder: 170,
    },
    {
      sectionKey: "interpreter_acknowledgment",
      sectionKind: ConsentSectionKind.INTERPRETER,
      titleAr: "إقرار المترجم",
      titleEn: "Interpreter Acknowledgment",
      contentAr: INTERPRETER_ACK_AR,
      contentEn: INTERPRETER_ACK_EN,
      isRequired: false,
      isEditableByPhysician: false,
      sortOrder: 180,
    },
    {
      sectionKey: "fixed_no_guarantee",
      sectionKind: ConsentSectionKind.FIXED_LEGAL,
      titleAr: "عدم ضمان النتائج",
      titleEn: "No Guarantee of Outcome",
      contentAr: NO_GUARANTEE_AR,
      contentEn: NO_GUARANTEE_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 190,
    },
    {
      sectionKey: "fixed_electronic_signature",
      sectionKind: ConsentSectionKind.SIGNATURE,
      titleAr: "التوقيع الإلكتروني",
      titleEn: "Electronic Signature",
      contentAr: ELECTRONIC_SIGNATURE_AR,
      contentEn: ELECTRONIC_SIGNATURE_EN,
      isRequired: true,
      isEditableByPhysician: false,
      sortOrder: 200,
    },
  ];
}

async function ensureDefaultTemplates(tenantId: string, actorUserId?: string): Promise<void> {
  const now = new Date();

  for (const seed of FIXED_DEFAULT_TEMPLATES) {
    const category = await prisma().consentCategory.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: seed.categoryCode,
        },
      },
      update: {
        nameAr: seed.categoryNameAr,
        nameEn: seed.categoryNameEn,
        isActive: true,
      },
      create: {
        tenantId,
        code: seed.categoryCode,
        nameAr: seed.categoryNameAr,
        nameEn: seed.categoryNameEn,
        isActive: true,
      },
    });

    const template = await prisma().consentTemplate.upsert({
      where: {
        tenantId_templateCode: {
          tenantId,
          templateCode: seed.templateCode,
        },
      },
      update: {
        categoryId: category.id,
        riskLevel: seed.riskLevel,
        requiresWitness: seed.requiresWitness,
        requiresGuardian: seed.requiresGuardian,
        requiresInterpreter: seed.requiresInterpreter,
        requiresSeparateConsent: seed.requiresSeparateConsent,
        consentType: seed.consentType,
        specialty: seed.specialty,
        department: seed.department,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        summaryAr: seed.summaryAr,
        summaryEn: seed.summaryEn,
        isSystemTemplate: true,
      },
      create: {
        tenantId,
        categoryId: category.id,
        templateCode: seed.templateCode,
        riskLevel: seed.riskLevel,
        requiresWitness: seed.requiresWitness,
        requiresGuardian: seed.requiresGuardian,
        requiresInterpreter: seed.requiresInterpreter,
        requiresSeparateConsent: seed.requiresSeparateConsent,
        consentType: seed.consentType,
        specialty: seed.specialty,
        department: seed.department,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        summaryAr: seed.summaryAr,
        summaryEn: seed.summaryEn,
        status: ConsentTemplateStatus.ACTIVE,
        isSystemTemplate: true,
      },
    });

    const latestVersion = await prisma().consentTemplateVersion.findFirst({
      where: { tenantId, templateId: template.id },
      orderBy: { versionNumber: "desc" },
    });

    const arBody = buildSaudiTemplateBodyAr(seed);
    const enBody = buildSaudiTemplateBodyEn(seed);
    const legalHash = crypto.createHash("sha256").update(`${seed.templateCode}:${arBody}:${enBody}`).digest("hex");

    const hasActiveVersion = await prisma().consentTemplateVersion.findFirst({
      where: {
        tenantId,
        templateId: template.id,
        status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
        legalHash,
      },
      orderBy: { versionNumber: "desc" },
    });

    if (hasActiveVersion) {
      await prisma().consentTemplate.update({
        where: { id: template.id },
        data: {
          status: ConsentTemplateStatus.ACTIVE,
          currentVersionId: hasActiveVersion.id,
        },
      });
      continue;
    }

    const versionNumber = (latestVersion?.versionNumber || 0) + 1;
    const sections = buildSaudiTemplateSections(seed);

    const version = await prisma().consentTemplateVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        versionLabel: `v${versionNumber}.0-saudi-2019`,
        versionNumber,
        status: ConsentTemplateStatus.ACTIVE,
        legalTextAr: arBody,
        legalTextEn: enBody,
        pdplTextAr: PDPL_AR,
        pdplTextEn: PDPL_EN,
        witnessDeclAr: sections.find((s) => s.sectionKey === "19_witness_clause")?.contentAr || INTERPRETER_ACK_AR,
        witnessDeclEn: sections.find((s) => s.sectionKey === "19_witness_clause")?.contentEn || INTERPRETER_ACK_EN,
        physicianCertAr: PHYSICIAN_CERT_AR,
        physicianCertEn: PHYSICIAN_CERT_EN,
        aiWarningAr: "AI-assisted draft pending physician validation.",
        aiWarningEn: "AI-assisted draft pending physician validation.",
        legalHash,
        isImmutable: true,
        createdByUserId: actorUserId || null,
        approvedByUserId: actorUserId || null,
        approvedAt: now,
        effectiveFrom: now,
        metadata: {
          governance: {
            legalApprovalStatus: "APPROVED",
            medicalApprovalStatus: "APPROVED",
            immutableFixedWording: true,
            moduleKey: "informed-consents",
            saudiMedicalConsentGuide: "MOH 2019",
          },
          templateProfile: {
            riskLevel: seed.riskLevel,
            requiresWitness: seed.requiresWitness,
            requiresGuardian: seed.requiresGuardian,
            requiresInterpreter: seed.requiresInterpreter,
            requiresSeparateConsent: seed.requiresSeparateConsent,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await prisma().consentTemplateSection.createMany({
      data: sections.map((section) => ({
        tenantId,
        templateVersionId: version.id,
        sectionKey: section.sectionKey,
        sectionKind: section.sectionKind,
        titleAr: section.titleAr,
        titleEn: section.titleEn,
        contentAr: section.contentAr,
        contentEn: section.contentEn,
        isRequired: section.isRequired,
        isEditableByPhysician: section.isEditableByPhysician,
        sortOrder: section.sortOrder,
      })),
    });

    await prisma().consentTemplate.update({
      where: { id: template.id },
      data: {
        status: ConsentTemplateStatus.ACTIVE,
        currentVersionId: version.id,
      },
    });

    await prisma().consentTemplateLocalization.upsert({
      where: {
        templateVersionId_language: {
          templateVersionId: version.id,
          language: "AR",
        },
      },
      update: {
        direction: "RTL",
        title: seed.titleAr,
        fullBody: arBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleAr,
          content: s.contentAr,
          isRequired: s.isRequired,
        })) as Prisma.InputJsonValue,
      },
      create: {
        tenantId,
        templateVersionId: version.id,
        language: "AR",
        direction: "RTL",
        title: seed.titleAr,
        fullBody: arBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleAr,
          content: s.contentAr,
          isRequired: s.isRequired,
        })) as Prisma.InputJsonValue,
      },
    });

    await prisma().consentTemplateLocalization.upsert({
      where: {
        templateVersionId_language: {
          templateVersionId: version.id,
          language: "EN",
        },
      },
      update: {
        direction: "LTR",
        title: seed.titleEn,
        fullBody: enBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleEn,
          content: s.contentEn,
          isRequired: s.isRequired,
        })) as Prisma.InputJsonValue,
      },
      create: {
        tenantId,
        templateVersionId: version.id,
        language: "EN",
        direction: "LTR",
        title: seed.titleEn,
        fullBody: enBody,
        sectionsJson: sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionKind: s.sectionKind,
          title: s.titleEn,
          content: s.contentEn,
          isRequired: s.isRequired,
        })) as Prisma.InputJsonValue,
      },
    });
  }
}

export async function listRuntimeConsentTemplates(
  auth: AuthContext,
  filter: RuntimeTemplateFilter,
): Promise<RuntimeConsentTemplate[]> {
  const tenantId = requireTenantId(auth);
  const consentType = normalizeFilter(filter.consentType).toUpperCase();
  const specialty = normalizeFilter(filter.specialty).toUpperCase();
  const department = normalizeFilter(filter.department).toUpperCase();

  await ensureDefaultTemplates(tenantId, auth.sub);

  const templates = await prisma().consentTemplate.findMany({
    where: {
      tenantId,
      ...(consentType ? { consentType } : {}),
      ...(department ? { OR: [{ department }, { department: null }] } : {}),
      ...(specialty ? { OR: [{ specialty }, { specialty: "GENERAL_MEDICINE" }] } : {}),
      status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
    },
    include: {
      versions: {
        where: {
          status: { in: [ConsentTemplateStatus.ACTIVE, ConsentTemplateStatus.APPROVED] },
        },
        orderBy: [{ versionNumber: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ isSystemTemplate: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const mapped = templates
    .map((template) => {
      const version = template.versions[0];
      if (!version) return null;

      return {
        id: template.id,
        templateVersionId: version.id,
        titleAr: template.titleAr,
        titleEn: template.titleEn,
        consentType: template.consentType,
        specialty: template.specialty,
        department: template.department,
        version: version.versionLabel,
        status: version.status,
        language: "bilingual" as const,
        summaryAr: template.summaryAr,
        summaryEn: template.summaryEn,
        previewAr: version.legalTextAr,
        previewEn: version.legalTextEn,
      };
    })
    .filter((item): item is RuntimeConsentTemplate => item !== null);

  return mapped;
}
