import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { getEncountersByMrn } from "@/lib/server/trakcare/service";

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
    const result = await getEncountersByMrn(context, patientId);

    return NextResponse.json(
      result.data.map((encounter) => ({
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
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
