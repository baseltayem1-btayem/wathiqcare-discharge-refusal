import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  evaluateAllowlistedRecipient,
  isPilotPatientSendEnabled,
} from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  await requireModuleOperationalAccess(request, "informed-consents");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mobileNumber = String(body.mobileNumber || "").trim();
  const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();

  const pilotEnabled = isPilotPatientSendEnabled();
  const evaluation = evaluateAllowlistedRecipient(mobileNumber, recipientEmail);

  return NextResponse.json({
    ok: true,
    pilotEnabled,
    allowlisted: evaluation.allowlisted,
    mobileAllowed: evaluation.mobileAllowed,
    emailAllowed: evaluation.emailAllowed,
    reason: evaluation.reason,
  });
}
