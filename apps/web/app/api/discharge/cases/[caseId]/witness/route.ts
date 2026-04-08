import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { recordCaseWitness } from "@/lib/server/case-compliance-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const payload = (await request.json().catch(() => ({}))) as {
      witness_name?: string;
      witness_role?: string;
    };
    const updated = await recordCaseWitness(auth, caseId, payload, request);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}