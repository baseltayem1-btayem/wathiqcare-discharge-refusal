import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SMOKE_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ ok: false, error: "Smoke harness disabled" }, { status: 503 });
  }

  const provided = request.headers.get("x-smoke-secret")?.trim() || "";
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = String(body.token || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "token is required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe<Array<{ raw_payload: unknown; received_at: string }>>(
    `SELECT raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = 'public_signing_otp'
       AND event_type = 'OTP_REQUESTED'
       AND raw_payload ->> 'tokenHash' = $1
     ORDER BY received_at DESC
     LIMIT 1`,
    tokenHash(token),
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "No OTP request found for token" }, { status: 404 });
  }

  const payload = (row.raw_payload || {}) as Record<string, unknown>;
  const otpHash = String(payload.otpHash || "");
  if (!otpHash) {
    return NextResponse.json({ ok: false, error: "OTP hash missing" }, { status: 500 });
  }

  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim();
  if (!pepper) {
    return NextResponse.json({ ok: false, error: "OTP pepper missing" }, { status: 500 });
  }

  let code: string | null = null;
  for (let i = 0; i < 1_000_000; i++) {
    const candidate = i.toString().padStart(6, "0");
    const hash = crypto.createHmac("sha256", pepper).update(candidate).digest("hex");
    if (hash === otpHash) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "Unable to derive OTP" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code, requestedAt: row.received_at });
}
