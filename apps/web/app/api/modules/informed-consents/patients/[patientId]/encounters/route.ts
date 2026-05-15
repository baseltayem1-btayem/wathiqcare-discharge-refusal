import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { getEncountersByMrn } from "@/lib/server/trakcare/service";

function readMetadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getEncounterFallbacks(tenantId: string, patientId: string) {
  const prisma = getPrisma();
  const cases = await prisma.case.findMany({
    where: {
      tenantId,
      medicalRecordNo: {
        equals: patientId,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      workflowType: true,
      roomNumber: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return cases.map((record) => ({
    id: record.id,
    encounterId: record.caseNumber,
    admissionDate: readMetadataValue(record.metadata, "admissionDate") || record.createdAt.toISOString(),
    department: readMetadataValue(record.metadata, "department") || record.workflowType || null,
    physician: readMetadataValue(record.metadata, "assignedPhysicianNameEn") || null,
    physicianLicense: readMetadataValue(record.metadata, "physicianLicense") || readMetadataValue(record.metadata, "assignedPhysicianLicense"),
    physicianId: readMetadataValue(record.metadata, "assignedPhysicianId"),
    diagnosis: readMetadataValue(record.metadata, "diagnosis"),
    procedure: readMetadataValue(record.metadata, "plannedProcedure") || record.title || null,
    allergies: readMetadataValue(record.metadata, "allergies"),
    currentMedications: readMetadataValue(record.metadata, "currentMedications"),
    physicianSpecialty: readMetadataValue(record.metadata, "physicianSpecialty"),
    sourceTransactionId: null,
  }));
}

/**
 * GET /api/modules/informed-consents/patients/[patientId]/encounters
 * Uses patientId as MRN and loads live encounter context from TrakCare.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
    }

    const context = buildTrakCareRequestContext(request, auth);
    const result = await getEncountersByMrn(context, patientId).catch(() => ({
      data: [],
      sourceTransactionId: null,
      correlationId: context.correlationId,
    }));

    const trakCareEncounters = result.data.map((encounter) => ({
      id: encounter.id || encounter.encounterId,
      encounterId: encounter.encounterId,
      admissionDate: encounter.admissionDate,
      department: encounter.department,
      physician: encounter.physician,
      physicianLicense: encounter.physicianLicense,
      physicianId: encounter.physicianId,
      diagnosis: encounter.diagnosis,
      procedure: encounter.procedure,
      allergies: encounter.allergies,
      currentMedications: encounter.currentMedications,
      physicianSpecialty: encounter.physicianSpecialty,
      sourceTransactionId: result.sourceTransactionId,
    }));

    if (trakCareEncounters.length > 0 || !auth.tenant_id) {
      return NextResponse.json(trakCareEncounters);
    }

    const fallbackEncounters = await getEncounterFallbacks(auth.tenant_id, patientId);
    return NextResponse.json(fallbackEncounters);
  } catch (error) {
    return handleApiError(error);
  }
}
