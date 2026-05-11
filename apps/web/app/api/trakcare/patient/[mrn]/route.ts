import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requireTrakCareOperationalContext } from "@/lib/server/trakcare/route-helpers";
import { getPatientByMrn } from "@/lib/server/trakcare/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mrn: string }> },
) {
  try {
    const { context } = await requireTrakCareOperationalContext(request);
    const { mrn } = await params;

    const result = await getPatientByMrn(context, mrn);

    return NextResponse.json({
      patient: result.data,
      sourceTransactionId: result.sourceTransactionId,
      correlationId: result.correlationId,
      sourceSystem: "InterSystems TrakCare",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
