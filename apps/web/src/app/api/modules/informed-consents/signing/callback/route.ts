import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PatientMessageChannel } from "@prisma/client";
import {
  getCallbackSecret,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyCallbackSignature,
} from "@/lib/server/signing-callback-service";
import { recordDeliveryCallback } from "@/lib/server/patient-message-outbox-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidChannel(value: string): value is PatientMessageChannel {
  return value === "SMS" || value === "EMAIL";
}

export async function POST(request: NextRequest) {
  let secret: string;
  try {
    secret = getCallbackSecret();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Callback secret not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signatureHeader = request.headers.get(SIGNATURE_HEADER);
  const timestampHeader = request.headers.get(TIMESTAMP_HEADER);

  const verified = verifyCallbackSignature({
    secret,
    body,
    signatureHeader,
    timestampHeader,
  });

  if (!verified.valid) {
    return NextResponse.json(
      { ok: false, error: verified.reason },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : "";
  const channelValue = typeof payload.channel === "string" ? payload.channel : "";
  const providerMessageId =
    typeof payload.providerMessageId === "string" ? payload.providerMessageId : "";
  const statusValue = typeof payload.status === "string" ? payload.status : "";
  const deliveredAtValue =
    typeof payload.deliveredAt === "string" ? payload.deliveredAt : undefined;

  if (!tenantId || !isValidChannel(channelValue) || !providerMessageId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenantId, channel or providerMessageId" },
      { status: 400 },
    );
  }

  const deliveredAt = deliveredAtValue ? new Date(deliveredAtValue) : undefined;
  if (deliveredAtValue && Number.isNaN(deliveredAt?.getTime() ?? 0)) {
    return NextResponse.json(
      { ok: false, error: "Invalid deliveredAt" },
      { status: 400 },
    );
  }

  if (statusValue !== "DELIVERED") {
    return NextResponse.json({ ok: true, updated: false });
  }

  const result = await recordDeliveryCallback({
    tenantId,
    channel: channelValue,
    providerMessageId,
    status: "DELIVERED",
    deliveredAt,
  });

  return NextResponse.json({ ok: true, ...result });
}
