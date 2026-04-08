import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listCaseConsentRecords, recordCaseConsent } from "@/lib/server/consent-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const records = await listCaseConsentRecords(auth, caseId);
    return NextResponse.json(records);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const payload = (await request.json().catch(() => ({}))) as {
      processingPurpose?: string;
      lawfulBasis?: string;
      consentType?: string;
      consentMethod?: string;
      documentVersion?: string;
      witnessName?: string;
      otpReference?: string;
      documentSnapshot?: Record<string, unknown>;
    };
    const record = await recordCaseConsent(auth, caseId, payload, request);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}