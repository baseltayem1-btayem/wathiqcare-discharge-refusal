import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_REQUESTS_PER_TOKEN = 5;
export const MAX_REQUESTS_PER_IP = 20;

function getClientIpAddress(request?: NextRequest): string | null {
  return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

function genericRateLimitError(): ApiError {
  return new ApiError(
    429,
    "Too many OTP requests. Please wait before trying again.",
    { code: "OTP_RATE_LIMITED" },
  );
}

export async function checkPublicSigningOtpRateLimit(args: {
  token: string;
  request?: NextRequest;
  prisma?: PrismaClient;
}): Promise<void> {
  const prisma = args.prisma ?? getPrisma();
  const tokenHash = hashToken(args.token);
  const ipAddress = getClientIpAddress(args.request);
  const threshold = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const tokenResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int AS count
    FROM webhook_events
    WHERE provider_key = ${OTP_PROVIDER_KEY}
      AND event_type = ${OTP_REQUESTED_EVENT}
      AND raw_payload ->> 'tokenHash' = ${tokenHash}
      AND received_at > ${threshold}::timestamptz
  `;

  const tokenCount = Number(tokenResult[0]?.count ?? 0);
  if (tokenCount >= MAX_REQUESTS_PER_TOKEN) {
    throw genericRateLimitError();
  }

  if (ipAddress) {
    const ipResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int AS count
      FROM webhook_events
      WHERE provider_key = ${OTP_PROVIDER_KEY}
        AND event_type = ${OTP_REQUESTED_EVENT}
        AND raw_payload ->> 'ipAddress' = ${ipAddress}
        AND received_at > ${threshold}::timestamptz
    `;

    const ipCount = Number(ipResult[0]?.count ?? 0);
    if (ipCount >= MAX_REQUESTS_PER_IP) {
      throw genericRateLimitError();
    }
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
