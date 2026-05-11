import { NextResponse } from "next/server";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

export async function POST() {
  if (!isInformedConsentsEnabled()) {
    return NextResponse.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }

  // TODO: Integrate PDF filler provider for field population and legal template rendering.
  // TODO: Integrate immutable storage backend for finalized legal PDFs (WORM/object-lock).
  return NextResponse.json({ ok: false, message: "TODO: legal PDF generation integration pending." }, { status: 501 });
}
