import { NextRequest, NextResponse } from "next/server";
import { createConsentDocument } from "@/lib/server/consent-library-service";
import { requireModuleOperationalAccess, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * POST /api/modules/informed-consents/generate-draft
 * Generate and persist a real draft consent document from patient, encounter, and template.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const tenantId = requireTenantId(auth);
    const prisma = getPrisma();

    const body = (await request.json().catch(() => null)) as {
      patientId?: string;
      encounterId?: string;
      templateId?: string;
      templateVersionId?: string;
    } | null;

    const patientId = body?.patientId?.trim();
    const encounterId = body?.encounterId?.trim();
    const templateId = body?.templateId?.trim();
    const templateVersionId = body?.templateVersionId?.trim();

    if (!patientId || !encounterId || !templateId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const caseRecord =
      (await prisma.case.findFirst({
        where: { tenantId, id: encounterId },
        include: { tenant: false },
      })) ||
      (await prisma.case.findFirst({
        where: {
          tenantId,
          caseNumber: encounterId,
          ...(patientId ? { medicalRecordNo: patientId } : {}),
        },
      })) ||
      (await prisma.case.findFirst({
        where: {
          tenantId,
          medicalRecordNo: patientId,
        },
        orderBy: { createdAt: "desc" },
      }));

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found for the selected patient/encounter" }, { status: 404 });
    }

    let resolvedTemplateId = templateId;
    if (resolvedTemplateId.startsWith("fallback:")) {
      const templateCode = resolvedTemplateId.slice("fallback:".length).trim();
      const template = await prisma.consentTemplate.findFirst({
        where: { tenantId, templateCode },
        select: { id: true },
      });

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      resolvedTemplateId = template.id;
    }

    const caseMetadata = asRecord(caseRecord.metadata);

    const document = await createConsentDocument(
      auth,
      {
        caseId: caseRecord.id,
        templateId: resolvedTemplateId,
        templateVersionId: templateVersionId?.startsWith("fallback-version:") ? undefined : templateVersionId,
        language: "bilingual",
        physicianName: readMetadataString(caseMetadata, "assignedPhysicianNameEn") || auth.email || undefined,
        physicianLicense:
          readMetadataString(caseMetadata, "assignedPhysicianLicense") ||
          readMetadataString(caseMetadata, "physicianLicense") ||
          undefined,
        physicianSpecialty: readMetadataString(caseMetadata, "physicianSpecialty") || undefined,
        department: readMetadataString(caseMetadata, "department") || undefined,
        diagnosis: readMetadataString(caseMetadata, "diagnosis") || undefined,
        plannedProcedure:
          readMetadataString(caseMetadata, "plannedProcedure") ||
          readMetadataString(caseMetadata, "procedure") ||
          caseRecord.title ||
          undefined,
        admissionDetails: readMetadataString(caseMetadata, "admissionDetails") || undefined,
        procedureDetails: caseRecord.title || undefined,
      },
      request,
    );

    const persistedMetadata = asRecord(document.case?.metadata);

    const draftConsent = {
      id: document.id,
      patientData: {
        id: document.case?.medicalRecordNo || caseRecord.id,
        mrn: document.mrn,
        name: document.patientName,
        dateOfBirth: document.dob,
        gender: document.gender,
        nationalId: document.case?.patientIdNumber || null,
        iqamaNumber: readMetadataString(persistedMetadata, "iqamaNumber"),
        mobileNumber: readMetadataString(persistedMetadata, "mobileNumber"),
        emergencyContact: readMetadataString(persistedMetadata, "emergencyContact"),
        emergencyContactPhone: readMetadataString(persistedMetadata, "emergencyContactPhone"),
      },
      encounterData: {
        id: caseRecord.id,
        encounterId: document.case?.caseNumber || encounterId,
        admissionDate: readMetadataString(persistedMetadata, "admissionDate"),
        department: document.department,
        physician: document.physicianName,
        physicianLicense: document.physicianLicense,
        physicianId: readMetadataString(persistedMetadata, "assignedPhysicianId"),
        diagnosis: document.diagnosis,
        procedure: document.plannedProcedure || document.procedureDetails,
        allergies: readMetadataString(persistedMetadata, "allergies"),
        currentMedications: readMetadataString(persistedMetadata, "currentMedications"),
        physicianSpecialty: document.physicianSpecialty,
        sourceTransactionId: null,
      },
      template: {
        id: document.template.id,
        titleAr: document.template.titleAr,
        titleEn: document.template.titleEn,
        consentType: document.template.consentType,
        specialty: document.template.specialty,
        department: document.template.department,
        version: document.templateVersion?.versionLabel || document.documentVersion || "v1.0",
        status: document.templateVersion?.status || document.template.status,
        language: document.language,
        summaryAr: document.template.summaryAr,
        summaryEn: document.template.summaryEn,
        previewAr: document.legalTextAr,
        previewEn: document.legalTextEn,
      },
      status: document.status,
      draftPdfUrl: `/api/modules/informed-consents/documents/${encodeURIComponent(document.id)}/pdf?lang=${document.language}`,
      createdAt: document.createdAt,
      lastModified: document.updatedAt,
    };

    return NextResponse.json(draftConsent);
  } catch (error) {
    return handleApiError(error);
  }
}
