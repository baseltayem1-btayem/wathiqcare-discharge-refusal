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
    tenantId: payload.tenantId,
    caseId: payload.caseId,
    sessionId: payload.sessionId,
    documentType: payload.documentType,
    acknowledgmentMethod: payload.acknowledgmentMethod,
    challengeId: normalizeString(payload.challengeId),
    deliveryStatus: normalizeString(payload.deliveryStatus),
    provider: normalizeString(payload.provider),
    stubMode: payload.stubMode ?? null,
    phoneNumberMasked: normalizeString(payload.phoneNumberMasked),
  };
}

export function logAcknowledgmentOtpDispatch(payload: AcknowledgmentOtpTelemetry): void {
  console.info("ACKNOWLEDGMENT_OTP_DISPATCH", buildPayload(payload));
}

export function logAcknowledgmentOtpVerify(payload: AcknowledgmentOtpVerifyTelemetry): void {
  const log = payload.outcome === "verified" ? console.info : console.warn;
  log("ACKNOWLEDGMENT_OTP_VERIFY", {
    ...buildPayload(payload),
    outcome: payload.outcome,
  });
}