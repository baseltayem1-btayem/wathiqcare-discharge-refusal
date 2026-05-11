import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

/**
 * GET /api/modules/informed-consents/patients/[patientId]/encounters
 * Get encounters/visits for a specific patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  await requireModuleOperationalAccess(request, "informed-consents");

  const { patientId } = await params;

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
  }

  try {
    // Mock encounters - in production, integrate with EHR/TrakCare
    const mockEncounters = [
      {
        id: `enc_${Date.now()}_1`,
        encounterId: "ENC-2024-001",
        admissionDate: "2024-05-08T14:30:00Z",
        department: "General Surgery",
        physician: "Dr. Sarah Al-Mazrouei",
        physicianLicense: "LIC-2024-0542",
        diagnosis: "Appendicitis",
        procedure: "Appendectomy",
        allergies: "Penicillin",
        currentMedications: "Paracetamol, Ibuprofen",
        physicianSpecialty: "SURGICAL",
      },
      {
        id: `enc_${Date.now()}_2`,
        encounterId: "ENC-2024-002",
        admissionDate: "2024-05-09T08:15:00Z",
        department: "Orthopedic Surgery",
        physician: "Dr. Hassan Al-Otaibi",
        physicianLicense: "LIC-2024-0543",
        diagnosis: "Fractured femur",
        procedure: "Open reduction and internal fixation",
        allergies: "None",
        currentMedications: "Morphine, Antibiotics",
        physicianSpecialty: "ORTHOPEDIC",
      },
    ];

    return NextResponse.json(mockEncounters);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch encounters" },
      { status: 500 }
    );
  }
}
