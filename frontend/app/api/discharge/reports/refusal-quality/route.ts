import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getRefusalQualityMetrics } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const metrics = await getRefusalQualityMetrics(auth);
    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error);
  }
}