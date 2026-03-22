import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listMedicalLegalTemplates } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    return NextResponse.json(listMedicalLegalTemplates());
  } catch (error) {
    return handleApiError(error);
  }
}