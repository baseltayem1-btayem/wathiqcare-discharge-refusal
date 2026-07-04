import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function envBool(key: string): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function envList(key: string): string[] {
  const raw = process.env[key]?.trim();
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  await requireModuleOperationalAccess(request, "informed-consents");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mobileNumber = String(body.mobileNumber || "").trim();
  const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();

  const pilotEnabled = envBool("FF_PATIENT_FACING_PILOT_SEND");
  const allowedMobiles = envList("PILOT_PATIENT_SEND_ALLOWLIST_MOBILE").map(normalizePhoneNumber);
  const allowedEmails = envList("PILOT_PATIENT_SEND_ALLOWLIST_EMAIL").map(normalizeRecipientEmail);

  const mobileAllowed = Boolean(mobileNumber && allowedMobiles.includes(normalizePhoneNumber(mobileNumber)));
  const emailAllowed = Boolean(recipientEmail && allowedEmails.includes(normalizeRecipientEmail(recipientEmail)));
  const allowlisted = mobileAllowed || emailAllowed;

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
