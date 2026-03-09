import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import type { SignatureMethod } from "@/lib/server/platform/types";

export type PlatformPayload = {
  caseId?: string;
  payload: Record<string, unknown>;
  signatureMethod: SignatureMethod;
  signatureRecord?: string;
  signatureSessionId?: string;
};

const SUPPORTED_METHODS: SignatureMethod[] = ["SMS_OTP", "TABLET_SIGNATURE", "NAFATH"];

export async function parsePlatformPayload(request: NextRequest): Promise<PlatformPayload> {
  const body = (await request.json().catch(() => null)) as {
    caseId?: string;
    payload?: Record<string, unknown>;
    signatureMethod?: SignatureMethod;
    signatureRecord?: string;
    signatureSessionId?: string;
  } | null;

  if (!body?.payload || typeof body.payload !== "object") {
    throw new ApiError(400, "payload is required");
  }

  const method = body.signatureMethod;
  if (!method || !SUPPORTED_METHODS.includes(method)) {
    throw new ApiError(400, "signatureMethod must be one of SMS_OTP, TABLET_SIGNATURE, NAFATH");
  }

  if (
    (typeof body.signatureRecord !== "string" || body.signatureRecord.trim().length === 0) &&
    (typeof body.signatureSessionId !== "string" || body.signatureSessionId.trim().length === 0)
  ) {
    throw new ApiError(400, "Either signatureRecord or signatureSessionId is required");
  }

  return {
    caseId: body.caseId,
    payload: body.payload,
    signatureMethod: method,
    signatureRecord: typeof body.signatureRecord === "string" ? body.signatureRecord : undefined,
    signatureSessionId: typeof body.signatureSessionId === "string" ? body.signatureSessionId : undefined,
  };
}

export function getRequestIpAddress(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function getRequestDeviceInfo(request: NextRequest): string | null {
  return request.headers.get("user-agent") ?? null;
}
