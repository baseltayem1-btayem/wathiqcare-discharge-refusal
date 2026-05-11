import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

/**
 * POST /api/modules/informed-consents/patients/[patientId]/encounters/[encounterId]/sync-trakcare
 * Sync patient and encounter data from TrakCare/EHR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; encounterId: string }> }
) {
  await requireModuleOperationalAccess(request, "informed-consents");

  const { patientId, encounterId } = await params;

  if (!patientId || !encounterId) {
    return NextResponse.json(
      { error: "Patient ID and Encounter ID required" },
      { status: 400 }
    );
  }

  try {
    // In production, this would call your TrakCare/EHR API
    // to fetch and sync live patient/encounter data
    // For now, simulating successful sync

    const importedFields = [
      "patientName",
      "mrn",
      "dateOfBirth",
      "gender",
      "nationalId",
      "diagnosis",
      "procedure",
      "allergies",
      "currentMedications",
      "encounterId",
      "admissionDate",
      "department",
    ];

    return NextResponse.json({
      status: "success",
      importedFields,
      syncTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
        importedFields: [],
      },
      { status: 500 }
    );
  }
}
