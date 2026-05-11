import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requireTrakCareOperationalContext } from "@/lib/server/trakcare/route-helpers";
import { getEncounterAllergies } from "@/lib/server/trakcare/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> },
) {
  try {
    const { context } = await requireTrakCareOperationalContext(request);
    const { encounterId } = await params;

    const result = await getEncounterAllergies(context, encounterId);
    return NextResponse.json({
      allergies: result.data,
      sourceTransactionId: result.sourceTransactionId,
      correlationId: result.correlationId,
      sourceSystem: "InterSystems TrakCare",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
