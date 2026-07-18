import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  isAllowlistEnforced,
  isAllowlistedRecipient,
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
  const allowlistEnforced = isAllowlistEnforced();
  const allowlisted = isAllowlistedRecipient(mobileNumber, recipientEmail);
  const hasValidContact = Boolean(normalizePhoneNumber(mobileNumber) || normalizeRecipientEmail(recipientEmail));

  return NextResponse.json({
    ok: true,
    pilotEnabled,
    allowlistEnforced,
    allowlisted,
    reason: allowlistEnforced
      ? allowlisted
        ? "Recipient is approved for pilot send."
        : "Recipient is not in the pilot allowlist."
      : hasValidContact
        ? "Recipient is eligible for production send."
        : "A valid patient mobile number or email is required.",
  });
}
