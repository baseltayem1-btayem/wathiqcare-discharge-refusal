import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requireTrakCareOperationalContext } from "@/lib/server/trakcare/route-helpers";
import { getEncounterMedications } from "@/lib/server/trakcare/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> },
) {
  try {
    const { context } = await requireTrakCareOperationalContext(request);
    const { encounterId } = await params;

    const result = await getEncounterMedications(context, encounterId);
    return NextResponse.json({
      medications: result.data,
      sourceTransactionId: result.sourceTransactionId,
      correlationId: result.correlationId,
      sourceSystem: "InterSystems TrakCare",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
