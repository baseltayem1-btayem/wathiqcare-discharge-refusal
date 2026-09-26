import crypto from "node:crypto";
import { logRuntimeEvent } from "@/lib/server/runtime-observability";

function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "[REDACTED_PHONE]";
  }
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

type AcknowledgmentOtpTelemetry = {
  tenantId: string;
  caseId: string;
  sessionId: string;
  documentType: string;
  acknowledgmentMethod: string;
  challengeId?: string | null;
  deliveryStatus?: string | null;
  provider?: string | null;
  stubMode?: boolean | null;
  phoneNumberMasked?: string | null;
};

type AcknowledgmentOtpVerifyTelemetry = AcknowledgmentOtpTelemetry & {
  outcome: "verified" | "failed";
};

function normalizeString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildPayload(payload: AcknowledgmentOtpTelemetry) {
  return {
    timestamp: new Date().toISOString(),
    tenantId: `t_${hashIdentifier(payload.tenantId)}`,
    caseId: `c_${hashIdentifier(payload.caseId)}`,
    sessionId: `s_${hashIdentifier(payload.sessionId)}`,
    documentType: payload.documentType,
    acknowledgmentMethod: payload.acknowledgmentMethod,
    challengeId: normalizeString(payload.challengeId),
    deliveryStatus: normalizeString(payload.deliveryStatus),
    provider: normalizeString(payload.provider),
    stubMode: payload.stubMode ?? null,
    phoneNumberMasked: payload.phoneNumberMasked ? maskPhone(payload.phoneNumberMasked) : null,
  };
}

export function logAcknowledgmentOtpDispatch(payload: AcknowledgmentOtpTelemetry): void {
  logRuntimeEvent({
    module: "acknowledgment",
    event: "ACKNOWLEDGMENT_OTP_DISPATCH",
    severity: "info",
    tenantId: payload.tenantId,
    details: buildPayload(payload),
  });
}

export function logAcknowledgmentOtpVerify(payload: AcknowledgmentOtpVerifyTelemetry): void {
  logRuntimeEvent({
    module: "acknowledgment",
    event: "ACKNOWLEDGMENT_OTP_VERIFY",
    severity: payload.outcome === "verified" ? "info" : "warn",
    tenantId: payload.tenantId,
    details: {
      ...buildPayload(payload),
      outcome: payload.outcome,
    },
  });
}
