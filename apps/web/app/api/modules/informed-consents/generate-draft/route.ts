import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { createConsentDocument } from "@/lib/server/consent-library-service";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { deepSanitizeArabicText, sanitizePdfDisplayText } from "@/lib/server/arabic-text-sanitizer";
import { criticalCareConsentTemplate } from "@/data/imc-digital-consent-templates";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GenerateDraftPayload = {
  patientId?: string;
  patientMrn?: string;
  patientCaseId?: string;
  encounterId?: string;
  encounterNumber?: string;
  encounterCaseNumber?: string;
  encounterAdmissionDate?: string;
  encounterDepartment?: string;
  encounterPhysician?: string;
  encounterPhysicianLicense?: string;
  encounterPhysicianSpecialty?: string;
  encounterDiagnosis?: string;
  encounterProcedure?: string;
  encounterSyncStatus?: string;
  encounterSource?: string;
  templateId?: string;
  templateVersionId?: string;
  formCode?: string;
  digitalConsentTemplate?: unknown;
  procedure?: {
    digitalConsentTemplate?: unknown;
  };
  language?: "ar" | "en" | "bilingual";
};

function deepSanitizeArabicText(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF\uFFFD]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]+/g, "")
    .replace(/￾+/g, "")
    .replace(/المركز\s+الطيب\s+الدويل/g, "المركز الطبي الدولي")
    .replace(/المركز\s+الطيب\s+الدولي/g, "المركز الطبي الدولي")
    .replace(/موافقة\s+مستنرية/g, "موافقة مستنيرة")
    .replace(/نموذج\s+الموافقة\s+المستنرية/g, "نموذج الموافقة المستنيرة")
    .replace(/رقم\s+الملف\s+الطيب/g, "رقم الملف الطبي")
    .replace(/المحتوى\s+الطيب/g, "المحتوى الطبي")
    .replace(/السجل\s+الطيب/g, "السجل الطبي")
    .replace(/التوثيق\s+الطيب/g, "التوثيق الطبي")
    .replace(/الفيديو\s+الطيب/g, "الفيديو الطبي")
    .replace(/تشخييص/g, "تشخيصي")
    .replace(/الجنيب/g, "الجنبي")
    .replace(/الزنيف/g, "النزيف")
    .replace(/رفّمع/g, "معرّف")
    .replace(/وقد\s+الطبيب/g, "وقد شرح الطبيب")
    .replace(/لقد\s+تم\s+جميع\s+البنود/g, "لقد تم شرح جميع البنود")
    .replace(/لط\s+جميع\s+أسئلتي/g, "لطرح جميع أسئلتي")
    .replace(/تم\s+البدائل\s+العلاجية/g, "تم شرح البدائل العلاجية")
    .replace(/\s+$/gm, "")
    .trim();
}

function sanitizeCriticalCareContent(content: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(content).map(([key, value]) => {
      if (/Ar$/.test(key)) {
        return [key, deepSanitizeArabicText(value)];
      }

      return [key, value];
    }),
  );
}


function shouldAttachCriticalCareApprovedSource(payload: GenerateDraftPayload): boolean {
  const values = [
    payload.formCode,
    payload.templateId,
    payload.encounterProcedure,
    payload.encounterDepartment,
    payload.encounterDiagnosis,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return Boolean(
    payload.digitalConsentTemplate ||
      payload.procedure?.digitalConsentTemplate ||
      values.some((value) =>
        value.includes("imc mr 1363") ||
        value.includes("imc-mr-1363") ||
        value.includes("imc-critical-care-consent") ||
        value.includes("icu") ||
        value.includes("critical care")
      )
  );
}

function buildCriticalCareApprovedMetadata(payload: GenerateDraftPayload): Record<string, unknown> {
  return {
    approvedSource: {
      library: "IMC Approved Consent Library / Al-Kanz",
      formCode: criticalCareConsentTemplate.formCode,
      sourceType: criticalCareConsentTemplate.source.sourceType,
      sourceTitle: criticalCareConsentTemplate.source.sourceTitle,
      sourceNote: criticalCareConsentTemplate.source.sourceNote,
      sourcePdfUrl: criticalCareConsentTemplate.source.sourcePdfUrl,
      digitalTemplateId: criticalCareConsentTemplate.id,
      version: criticalCareConsentTemplate.version,
      status: criticalCareConsentTemplate.status,
    },
    digitalConsentTemplate: {
      ...(payload.procedure?.digitalConsentTemplate && typeof payload.procedure.digitalConsentTemplate === "object"
        ? payload.procedure.digitalConsentTemplate as Record<string, unknown>
        : {}),
      ...(payload.digitalConsentTemplate && typeof payload.digitalConsentTemplate === "object"
        ? payload.digitalConsentTemplate as Record<string, unknown>
        : {}),
      id: criticalCareConsentTemplate.id,
      formCode: criticalCareConsentTemplate.formCode,
      version: criticalCareConsentTemplate.version,
      title: criticalCareConsentTemplate.title,
      source: criticalCareConsentTemplate.source,
    },
  };
}


function languageBlocksToText(
  blocks: Array<{ en: string; ar: string }>,
  lang: "en" | "ar",
): string {
  return blocks
    .map((item) => item[lang])
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n")
    .trim();
}

function buildCriticalCareDigitalDocumentContent(): Record<string, string> {
  const template = criticalCareConsentTemplate;

  const procedureDetailsEn = [
    `${template.title.en} (${template.formCode})`,
    `Approved source: ${template.source.sourceTitle}`,
    "",
    languageBlocksToText(template.introduction, "en"),
    "",
    "Included ICU / Critical Care procedures:",
    ...template.procedures.map((item, index) =>
      `${index + 1}. ${item.title.en}\nUse: ${item.uses.en}`
    ),
  ].join("\n").trim();

  const procedureDetailsAr = [
    `${template.title.ar} (${template.formCode})`,
    `المصدر المعتمد: ${template.source.sourceTitle}`,
    "",
    languageBlocksToText(template.introduction, "ar"),
    "",
    "الإجراءات المشمولة في موافقة الرعاية الحرجة / العناية المركزة:",
    ...template.procedures.map((item, index) =>
      `${index + 1}. ${item.title.ar}\nالاستخدام: ${item.uses.ar}`
    ),
  ].join("\n").trim();

  const risksEn = template.procedures
    .map((item, index) => `${index + 1}. ${item.title.en}: ${item.risks.en}`)
    .join("\n")
    .trim();

  const risksAr = template.procedures
    .map((item, index) => `${index + 1}. ${item.title.ar}: ${item.risks.ar}`)
    .join("\n")
    .trim();

  const legalTextEn = [
    languageBlocksToText(template.introduction, "en"),
    languageBlocksToText(template.acknowledgement, "en"),
  ].join("\n\n").trim();

  const legalTextAr = [
    languageBlocksToText(template.introduction, "ar"),
    languageBlocksToText(template.acknowledgement, "ar"),
  ].join("\n\n").trim();

  const alternativesEn =
    "Alternative management options, where clinically applicable, have been explained by the treating physician. Less common or additional procedures may require separate consent unless the situation is an emergency and there is no time to obtain permission.";

  const alternativesAr =
    "تم شرح البدائل العلاجية الممكنة، متى كانت منطبقة طبياً، من قبل الطبيب المعالج. وقد تتطلب الإجراءات الأقل شيوعاً أو الإضافية موافقة مستقلة، ما لم تكن الحالة طارئة ولا يوجد وقت كافٍ للحصول على الإذن.";

  const expectedOutcomesEn =
    "No guarantee has been made concerning the results of any ICU treatment or procedure. The consent remains valid until discharge unless revoked by the patient or responsible relative.";

  const expectedOutcomesAr =
    "لم يتم تقديم أي ضمان بشأن نتائج أي علاج أو إجراء داخل وحدة العناية المركزة. وتظل هذه الموافقة سارية حتى الخروج من المستشفى، ما لم يتم إلغاؤها من قبل المريض أو القريب المسؤول.";

  return {
    procedureDetails: procedureDetailsEn,
    procedureDetailsAr: deepSanitizeArabicText(procedureDetailsAr, { preserveNewlines: true }),
    risksAr: deepSanitizeArabicText(risksAr, { preserveNewlines: true }),
    risksEn,
    alternativesAr: deepSanitizeArabicText(alternativesAr),
    alternativesEn,
    refusalRisksAr: deepSanitizeArabicText(template.refusalSection.text.ar),
    refusalRisksEn: template.refusalSection.text.en,
    expectedOutcomesAr: deepSanitizeArabicText(expectedOutcomesAr),
    expectedOutcomesEn,
    legalTextAr: deepSanitizeArabicText(legalTextAr, { preserveNewlines: true }),
    legalTextEn,
    pdplTextAr:
      deepSanitizeArabicText("أوافق على معالجة واستخدام ومشاركة بياناتي الشخصية والصحية داخل المنشأة الصحية ومع الجهات المختصة عند الاقتضاء، وذلك لأغراض تقديم الرعاية الصحية، والتوثيق الطبي، والجودة، وسلامة المرضى، والمطالبات، والامتثال التنظيمي، وحماية الحقوق، وفقاً لنظام حماية البيانات الشخصية والأنظمة الصحية المعمول بها في المملكة العربية السعودية."),
    pdplTextEn:
      "I consent to the processing, use, and sharing of my personal and health data within the healthcare facility and with competent authorities where required, for healthcare delivery, medical documentation, quality, patient safety, claims, regulatory compliance, and protection of rights, in accordance with the Saudi Personal Data Protection Law and applicable healthcare regulations.",
    witnessDeclAr:
      deepSanitizeArabicText("يقر الشاهد بأن شرح الموافقة تم تقديمه للمريض أو ممثله النظامي، وأن التوقيع تم طوعاً ودون إكراه، بحسب ما ظهر له وقت التوقيع."),
    witnessDeclEn:
      "The witness confirms that the consent explanation was provided to the patient or legal representative, and that the signature was given voluntarily and without coercion, to the best of the witness's observation at the time of signing.",
    physicianCertAr:
      deepSanitizeArabicText("أقر أنا الطبيب / الممارس الصحي الموقع أدناه بأنني شرحت للمريض أو ممثله النظامي الحالة الطبية، وطبيعة إجراءات الرعاية الحرجة، والفوائد المتوقعة، والمخاطر والمضاعفات المحتملة، والبدائل المتاحة، ومخاطر الرفض أو التأخير، بلغة واضحة ومفهومة، وأجبت عن جميع الأسئلة ذات العلاقة وفقاً للمعايير المهنية والطبية المعتمدة."),
    physicianCertEn:
      "I, the undersigned physician / healthcare practitioner, certify that I have explained to the patient or legal representative the medical condition, the nature of the critical care procedures, expected benefits, potential risks and complications, available alternatives, and the risks of refusal or delay in a clear and understandable manner, and that I have answered all related questions in accordance with accepted medical and professional standards.",
    physicianNotesAr: deepSanitizeArabicText("يتم استكمال أي ملاحظات إضافية بواسطة الطبيب المعالج عند الحاجة."),
    physicianNotesEn: "Any additional physician notes shall be completed by the treating physician as clinically required.",
  };
}


async function resolveCaseId(tenantId: string, payload: GenerateDraftPayload): Promise<string> {
  const prisma = getPrisma();
  const requestedCaseId = payload.patientCaseId?.trim();

  if (requestedCaseId) {
    const existingCase = await prisma.case.findFirst({
      where: {
        id: requestedCaseId,
        tenantId,
      },
      select: { id: true },
    });

    if (existingCase) {
      return existingCase.id;
    }
  }

  const encounterCaseNumber = payload.encounterCaseNumber?.trim().toUpperCase();
  const patientMrn = payload.patientMrn?.trim().toUpperCase() || payload.patientId?.trim().toUpperCase();

  const matchingCase = await prisma.case.findFirst({
    where: {
      tenantId,
      ...(encounterCaseNumber ? { caseNumber: encounterCaseNumber } : {}),
      ...(patientMrn ? { medicalRecordNo: patientMrn } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (matchingCase) {
    return matchingCase.id;
  }

  if (encounterCaseNumber) {
    const caseByNumber = await prisma.case.findFirst({
      where: {
        tenantId,
        caseNumber: encounterCaseNumber,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    if (caseByNumber) {
      return caseByNumber.id;
    }
  }

  if (patientMrn) {
    const caseByMrn = await prisma.case.findFirst({
      where: {
        tenantId,
        medicalRecordNo: patientMrn,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    if (caseByMrn) {
      return caseByMrn.id;
    }
  }

  throw new ApiError(404, "No matching case was found for the selected patient/encounter");
}

function mapDraftResponse(
  created: Awaited<ReturnType<typeof createConsentDocument>>,
  payload: GenerateDraftPayload,
) {
  return {
    id: created.id,
    patientData: {
      id: payload.patientId?.trim() || created.mrn || created.caseId,
      mrn: created.mrn || payload.patientMrn?.trim() || payload.patientId?.trim() || "",
      name: created.patientName,
      dateOfBirth: created.dob,
      gender: created.gender,
    },
    encounterData: {
      id: payload.encounterId?.trim() || created.caseId,
      encounterId: payload.encounterNumber?.trim() || payload.encounterId?.trim() || created.case?.caseNumber || created.caseId,
      admissionDate: payload.encounterAdmissionDate?.trim() || null,
      department: created.department,
      physician: created.physicianName,
      physicianLicense: created.physicianLicense,
      diagnosis: created.diagnosis,
      procedure: created.plannedProcedure || created.procedureDetails,
      physicianSpecialty: created.physicianSpecialty,
      caseNumber: created.case?.caseNumber || payload.encounterCaseNumber?.trim() || null,
      syncStatus: payload.encounterSyncStatus?.trim() || null,
      source: payload.encounterSource?.trim() || null,
    },
    template: {
      id: created.templateId,
      templateVersionId: created.templateVersionId,
      titleAr: created.template.titleAr,
      titleEn: created.template.titleEn,
      consentType: created.template.consentType,
      specialty: created.template.specialty,
      department: created.template.department,
      version: created.templateVersion.versionLabel,
      status: created.templateVersion.status,
      language: created.language,
      summaryAr: created.template.summaryAr,
      summaryEn: created.template.summaryEn,
      previewAr: created.templateVersion.legalTextAr,
      previewEn: created.templateVersion.legalTextEn,
    },
    status: created.status,
    draftPdfUrl: `/api/modules/informed-consents/documents/${encodeURIComponent(created.id)}/pdf?lang=${encodeURIComponent(created.language)}`,
    createdAt: created.createdAt.toISOString(),
    lastModified: created.updatedAt.toISOString(),
  };
}

/**
 * POST /api/modules/informed-consents/generate-draft
 * Generate a draft consent document from patient, encounter, and template
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const body = (await request.json().catch(() => null)) as GenerateDraftPayload | null;
    const payload = body || {};
    const { patientId, encounterId, templateId } = payload;

    if (!patientId || !encounterId || !templateId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const tenantId = auth.tenant_id?.trim();
    if (!tenantId) {
      throw new ApiError(403, "Tenant context required");
    }

    const caseId = await resolveCaseId(tenantId, payload);
    const attachCriticalCareApprovedSource = shouldAttachCriticalCareApprovedSource(payload);
    const criticalCareDigitalContent = attachCriticalCareApprovedSource
      ? sanitizeCriticalCareContent(buildCriticalCareDigitalDocumentContent())
      : {};

    const created = await createConsentDocument(
      auth,
      {
        caseId,
        templateId: payload.templateId,
        templateVersionId: payload.templateVersionId,
        language: payload.language || "bilingual",
        physicianName: payload.encounterPhysician,
        physicianLicense: payload.encounterPhysicianLicense,
        physicianSpecialty: payload.encounterPhysicianSpecialty,
        department: payload.encounterDepartment,
        diagnosis: payload.encounterDiagnosis,
        plannedProcedure: payload.encounterProcedure,
        procedureDetails: payload.encounterProcedure,
        ...criticalCareDigitalContent,
        metadata: {
          encounterSync: {
            encounterId: payload.encounterId || null,
            encounterNumber: payload.encounterNumber || null,
            caseNumber: payload.encounterCaseNumber || null,
            admissionDate: payload.encounterAdmissionDate || null,
            syncStatus: payload.encounterSyncStatus || null,
            source: payload.encounterSource || null,
          },
          draftSource: "modules.informed-consents.generate-draft",
          ...(attachCriticalCareApprovedSource
            ? {
                ...buildCriticalCareApprovedMetadata(payload),
                approvedSourceDisplay: sanitizePdfDisplayText(criticalCareConsentTemplate.source.sourceTitle, {
                  lang: "bilingual",
                  medicalContext: true,
                }),
              }
            : {}),
        },
      },
      request,
    );

    return NextResponse.json(mapDraftResponse(created, payload));
  } catch (error) {
    return handleApiError(error);
  }
}
