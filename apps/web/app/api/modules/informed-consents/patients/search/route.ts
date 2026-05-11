import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

/**
 * GET /api/modules/informed-consents/patients/search
 * Search for patients by MRN, name, or ID
 */
export async function GET(request: NextRequest) {
  await requireModuleOperationalAccess(request, "informed-consents");

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // In production, integrate with your EHR/TrakCare system
    // For now, returning empty list - this would be filled with real patient data
    const mockResults = [
      {
        id: `patient_${Date.now()}`,
        mrn: "MR-2024-001",
        name: q.startsWith("MR") ? "Ahmed Mohammed Al-Rashid" : q,
        dateOfBirth: "1985-03-15",
        gender: "M",
        nationalId: "1234567890123",
        iqamaNumber: "2345678901234",
        mobileNumber: "+966501234567",
        emergencyContact: "Fatima Al-Rashid",
        emergencyContactPhone: "+966509876543",
      },
    ];

    return NextResponse.json(mockResults.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.mrn.includes(q)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
