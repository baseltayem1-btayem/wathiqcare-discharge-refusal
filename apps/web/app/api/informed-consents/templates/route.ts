import { NextResponse } from "next/server";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

export async function GET() {
  if (!isInformedConsentsEnabled()) {
    return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }

  // TODO: Integrate consent template API with role and language-aware template resolution.
  return NextResponse.json({ ok: false, message: "TODO: consent template API integration pending." }, { status: 501 });
}
