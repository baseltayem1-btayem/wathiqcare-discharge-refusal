import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  envList,
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
  const allowedMobiles = envList("PILOT_PATIENT_SEND_ALLOWLIST_MOBILE").map(normalizePhoneNumber);
  const allowedEmails = envList("PILOT_PATIENT_SEND_ALLOWLIST_EMAIL").map(normalizeRecipientEmail);

  const mobileAllowed = Boolean(mobileNumber && allowedMobiles.includes(normalizePhoneNumber(mobileNumber)));
  const emailAllowed = Boolean(recipientEmail && allowedEmails.includes(normalizeRecipientEmail(recipientEmail)));
  const allowlisted = isAllowlistedRecipient(mobileNumber, recipientEmail);

  return NextResponse.json({
    ok: true,
    pilotEnabled,
    allowlisted,
    mobileAllowed: Boolean(mobileAllowed),
    emailAllowed: Boolean(emailAllowed),
    reason: pilotEnabled
      ? allowlisted
        ? "Recipient is approved for pilot send."
        : "Recipient is not in the pilot allowlist."
      : "Patient-facing pilot send is disabled.",
  });
}
