import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  isPilotPatientSendEnabled,
  normalizePhoneNumber,
  normalizeRecipientEmail,
} from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  await requireModuleOperationalAccess(request, "informed-consents");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mobileNumber = String(body.mobileNumber || "").trim();
  const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();

  const pilotEnabled = isPilotPatientSendEnabled();
  const hasValidContact = Boolean(normalizePhoneNumber(mobileNumber) || normalizeRecipientEmail(recipientEmail));

  // Production send is never gated by a pilot allowlist. These legacy fields
  // are kept for API compatibility but always report the non-blocking state.
  return NextResponse.json({
    ok: true,
    pilotEnabled,
    allowlistEnforced: false,
    allowlisted: hasValidContact,
    eligible: hasValidContact,
    reason: hasValidContact
      ? "Recipient is eligible for production send."
      : "A valid patient mobile number or email is required.",
  });
}
