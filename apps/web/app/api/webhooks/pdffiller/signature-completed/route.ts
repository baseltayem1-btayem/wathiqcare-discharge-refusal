import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/http";
import {
  processPdfFillerSignatureWebhook,
} from "@/lib/server/legal-package-module-service";
import { validatePdfFillerWebhookSignature } from "@/lib/server/integrations/pdffiller";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-pdffiller-signature");
    const isValid = validatePdfFillerWebhookSignature(raw, signature);

    if (!isValid) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    await processPdfFillerSignatureWebhook(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
