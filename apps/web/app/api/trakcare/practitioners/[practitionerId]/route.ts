import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { requireTrakCareOperationalContext } from "@/lib/server/trakcare/route-helpers";
import { getPractitioner } from "@/lib/server/trakcare/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> },
) {
  try {
    const { context } = await requireTrakCareOperationalContext(request);
    const { practitionerId } = await params;

    const result = await getPractitioner(context, practitionerId);
    return NextResponse.json({
      practitioner: result.data,
      sourceTransactionId: result.sourceTransactionId,
      correlationId: result.correlationId,
      sourceSystem: "InterSystems TrakCare",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
