import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { searchPatients } from "@/lib/server/trakcare/service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/modules/informed-consents/patients/search
 * Search patients from live TrakCare by MRN/name/identifier.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const context = buildTrakCareRequestContext(request, auth);
    const result = await searchPatients(context, q);

    return NextResponse.json(
      result.data.map((patient) => ({
        id: patient.mrn || patient.id,
        mrn: patient.mrn,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        nationalId: patient.nationalId,
        iqamaNumber: patient.iqamaNumber,
        mobileNumber: patient.mobileNumber,
        emergencyContact: patient.emergencyContact,
        emergencyContactPhone: patient.emergencyContactPhone,
        sourceTransactionId: result.sourceTransactionId,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
