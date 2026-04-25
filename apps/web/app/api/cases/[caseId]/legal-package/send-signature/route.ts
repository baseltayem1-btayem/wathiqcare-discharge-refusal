import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { sendLegalPackageForSignature } from "@/lib/server/legal-package-module-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const result = await sendLegalPackageForSignature(auth, caseId, request);

    const sigReq = result.signature_request;
    const smsSent = Boolean(sigReq.sms_sent_at);
    const smsConfigured = result.integration_status.taqnyat_configured;
    const signingLink = sigReq.signing_link ?? null;

    return NextResponse.json({
      ...result,
      success: true,
      signature_request_id: sigReq.pdffiller_signature_request_id,
      signing_link: signingLink,
      sms_sent: smsSent,
      sms_configured: smsConfigured,
      message: result.external_signing_message,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
