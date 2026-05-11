import { NextResponse } from "next/server";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

export async function POST() {
  if (!isInformedConsentsEnabled()) {
    return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }

  // TODO: Integrate OTP provider challenge and verification lifecycle for signer validation.
  // TODO: Integrate digital signature provider callback/token exchange and certificate verification.
  return NextResponse.json({ ok: false, message: "TODO: signature workflow integrations pending." }, { status: 501 });
}
