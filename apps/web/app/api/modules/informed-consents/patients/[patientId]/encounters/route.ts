import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { getEncountersByMrn } from "@/lib/server/trakcare/service";
import {
  getUatMockEncounter,
  isSupportedUatMockMrn,
  isUatMockEncounterEnvironmentEnabled,
} from "@/lib/server/uat-mock-encounters";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EncounterResponseItem = {
  id: string;
  encounterId: string;
  admissionDate: string | null;
  department: string | null;
  physician: string | null;
  physicianLicense?: string | null;
  physicianId?: string | null;
  diagnosis: string | null;
  procedure: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  physicianSpecialty?: string | null;
  caseNumber?: string | null;
  sourceTransactionId?: string | null;
  syncStatus?: "SYNCED" | "CACHED" | "UAT_MOCK";
  isMock?: boolean;
  source?: "trakcare" | "cached_local" | "uat_mock";
  mockLabel?: string;
};

function mapTrakCareEncounters(
  result: Awaited<ReturnType<typeof getEncountersByMrn>>,
): EncounterResponseItem[] {
  return result.data.map((encounter) => ({
    id: encounter.id || encounter.encounterId,
    encounterId: encounter.encounterId,
    admissionDate: encounter.admissionDate ?? null,
    department: encounter.department ?? null,
    physician: encounter.physician ?? null,
    physicianLicense: encounter.physicianLicense ?? null,
    physicianId: encounter.physicianId ?? null,
    diagnosis: encounter.diagnosis ?? null,
    procedure: encounter.procedure ?? null,
    allergies: encounter.allergies ?? null,
    currentMedications: encounter.currentMedications ?? null,
    physicianSpecialty: encounter.physicianSpecialty ?? null,
    sourceTransactionId: result.sourceTransactionId,
    syncStatus: "SYNCED",
    isMock: false,
    source: "trakcare",
  }));
}

async function loadCachedEncounters(tenantId: string, patientMrn: string): Promise<EncounterResponseItem[]> {
  const prisma = getPrisma();
  const patientRef = await prisma.patientExternalReference.findUnique({
    where: {
      tenantId_externalSystem_patientMrn: {
        tenantId,
        externalSystem: "TRAKCARE",
        patientMrn,
      },
    },
    select: { id: true },
  });

  if (!patientRef?.id) {
    return [];
  }

  const encounters = await prisma.encounterExternalReference.findMany({
    where: {
      tenantId,
      externalSystem: "TRAKCARE",
      patientExternalReferenceId: patientRef.id,
    },
    select: {
      id: true,
      externalEncounterId: true,
      encounterNumber: true,
      department: true,
      admissionDate: true,
      externalPractitionerId: true,
      sourceTransactionId: true,
    },
    orderBy: [{ admissionDate: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  return encounters.map((encounter) => ({
    id: encounter.externalEncounterId || encounter.id,
    encounterId: encounter.encounterNumber || encounter.externalEncounterId || encounter.id,
    admissionDate: encounter.admissionDate?.toISOString() || null,
    department: encounter.department,
    physician: encounter.externalPractitionerId || "Cached TrakCare Encounter",
    physicianLicense: encounter.externalPractitionerId,
    physicianId: encounter.externalPractitionerId,
    diagnosis: "Cached encounter context",
    procedure: "Cached encounter context",
    allergies: null,
    currentMedications: null,
    physicianSpecialty: null,
    sourceTransactionId: encounter.sourceTransactionId,
    syncStatus: "CACHED",
    isMock: false,
    source: "cached_local",
  }));
}

function resolveUatMockEncounter(patientMrn: string): EncounterResponseItem[] {
  const allowMock = isUatMockEncounterEnvironmentEnabled() || isSupportedUatMockMrn(patientMrn);
  if (!allowMock) {
    return [];
  }

  const mockEncounter = getUatMockEncounter(patientMrn);
  return mockEncounter ? [mockEncounter] : [];
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

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
    }

    const normalizedPatientMrn = patientId.trim().toUpperCase();
    const tenantId = auth.tenant_id || "";

    let encounterList: EncounterResponseItem[] = [];

    try {
      const context = buildTrakCareRequestContext(request, auth);
      const result = await getEncountersByMrn(context, normalizedPatientMrn);
      encounterList = mapTrakCareEncounters(result);
    } catch {
      encounterList = [];
    }

    if (encounterList.length === 0 && tenantId) {
      encounterList = await loadCachedEncounters(tenantId, normalizedPatientMrn);
    }

    if (encounterList.length === 0) {
      encounterList = resolveUatMockEncounter(normalizedPatientMrn);
    }

    return NextResponse.json(encounterList);
  } catch (error) {
    return handleApiError(error);
  }
}
