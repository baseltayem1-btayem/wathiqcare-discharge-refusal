import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getRefusalQualityMetrics } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const metrics = await getRefusalQualityMetrics(auth);
    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error);
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
