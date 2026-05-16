import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { verifyEvidenceToken } from "@/lib/server/informed-consents-evidence-vault-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await verifyEvidenceToken(token);
    return NextResponse.json(toJsonSafe(result));
  } catch (error) {
    return handleApiError(error);
  }
}
