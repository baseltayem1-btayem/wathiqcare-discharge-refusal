import { NextResponse } from "next/server";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

export async function GET() {
  if (!isInformedConsentsEnabled()) {
    return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }

  // TODO: Integrate patient lookup API and map MRN search request/response contracts.
  return NextResponse.json({ ok: false, message: "TODO: patient lookup API integration pending." }, { status: 501 });
}
