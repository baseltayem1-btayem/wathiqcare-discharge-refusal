import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { createConsentDocument } from "@/lib/server/consent-library-service";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";


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
  anesthesiaDecision?: string;
  anesthesiaReviewRequired?: boolean;
  anesthesiaTypeLabel?: string;
  templateId?: string;
  templateVersionId?: string;
  imcLibraryItemId?: string;
  imcLibraryTitleEn?: string;
  imcLibraryPublicPath?: string;
  imcLibrarySource?: string;
  imcLibraryStatus?: string;
  imcLibraryTemplateType?: string;
  language?: "ar" | "en" | "bilingual";
};

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
    anesthesiaData: {
      decision: payload.anesthesiaDecision?.trim() || null,
      reviewRequired: Boolean(payload.anesthesiaReviewRequired),
      typeLabel: payload.anesthesiaTypeLabel?.trim() || null,
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
        metadata: {
          imcApprovedTemplate: {
            id: payload.imcLibraryItemId || null,
            titleEn: payload.imcLibraryTitleEn || null,
            publicPath: payload.imcLibraryPublicPath || null,
            source: payload.imcLibrarySource || null,
            status: payload.imcLibraryStatus || null,
            templateType: payload.imcLibraryTemplateType || null,
            locked: true,
          },
          encounterSync: {
            encounterId: payload.encounterId || null,
            encounterNumber: payload.encounterNumber || null,
            caseNumber: payload.encounterCaseNumber || null,
            admissionDate: payload.encounterAdmissionDate || null,
            syncStatus: payload.encounterSyncStatus || null,
            source: payload.encounterSource || null,
          },
          anesthesia: {
            applies: Boolean(payload.anesthesiaReviewRequired),
            anesthesiaRequired: Boolean(payload.anesthesiaReviewRequired),
            decision: payload.anesthesiaDecision || null,
            reviewRequired: Boolean(payload.anesthesiaReviewRequired),
            typeLabel: payload.anesthesiaTypeLabel || null,
            type: payload.anesthesiaTypeLabel || payload.anesthesiaDecision || null,
            typeEn: payload.anesthesiaTypeLabel || payload.anesthesiaDecision || null,
            typeAr: payload.anesthesiaTypeLabel || payload.anesthesiaDecision || null,
            optionsEn: payload.anesthesiaTypeLabel || payload.anesthesiaDecision || null,
            optionsAr: payload.anesthesiaTypeLabel || payload.anesthesiaDecision || null,
            risksEn: null,
            risksAr: null,
            acknowledgmentEn: payload.anesthesiaReviewRequired
              ? "Anesthesia review is required before sending the unified patient notification."
              : "No anesthesia review is required based on the physician selection.",
            acknowledgmentAr: payload.anesthesiaReviewRequired
              ? "يلزم إجراء مراجعة التخدير قبل إرسال الإشعار الموحد للمريض."
              : "لا يلزم إجراء مراجعة تخدير بناءً على اختيار الطبيب.",
            source: "physician-enterprise-workflow",
          },
          draftSource: "modules.informed-consents.generate-draft",
        },
      },
      request,
    );

    return NextResponse.json(mapDraftResponse(created, payload));
  } catch (error) {
    return handleApiError(error);
  }
}







