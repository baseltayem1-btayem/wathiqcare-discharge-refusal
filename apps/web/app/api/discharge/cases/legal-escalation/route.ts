import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listLegalEscalations } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const cases = await listLegalEscalations(auth);
    return NextResponse.json(cases);
  } catch (error) {
    return handleApiError(error);
  }
}
