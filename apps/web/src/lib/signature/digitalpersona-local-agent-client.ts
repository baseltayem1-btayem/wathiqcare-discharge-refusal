import type { DigitalPersonaEvidenceResult } from "@/lib/signature/signature-types";

export const DIGITALPERSONA_LOCAL_AGENT_ENDPOINT = "http://localhost:8787/biometric/verify";
const DIGITALPERSONA_PROVIDER = "HID DigitalPersona";
const DIGITALPERSONA_MODEL = "DigitalPersona 4500";
const RAW_BIOMETRIC_FIELDS = [
  "rawFingerprintImage",
  "rawFingerprintTemplate",
  "fingerprintTemplate",
  "biometricSample",
  "minutiaeData",
] as const;

function rejectRawBiometricPayload(payload: Record<string, unknown>) {
  const forbidden = RAW_BIOMETRIC_FIELDS.filter((field) => payload[field] !== undefined);
  if (forbidden.length > 0) {
    throw new Error(`Raw biometric payload is not allowed: ${forbidden.join(", ")}`);
  }
}

async function hashPayload(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildDigitalPersonaEvidenceResult(
  payload: Partial<DigitalPersonaEvidenceResult>,
): Promise<DigitalPersonaEvidenceResult> {
  const timestamp = typeof payload.timestamp === "string" && payload.timestamp.trim().length > 0
    ? payload.timestamp
    : new Date().toISOString();
  const transactionId = typeof payload.transactionId === "string" && payload.transactionId.trim().length > 0
    ? payload.transactionId.trim()
    : `DP-UAT-${crypto.randomUUID()}`;
  const method = payload.method === "combined-biometric-and-otp"
    ? "combined-biometric-and-otp"
    : "biometric-fingerprint";
  const deviceReference = typeof payload.deviceReference === "string" && payload.deviceReference.trim().length > 0
    ? payload.deviceReference.trim()
    : `${DIGITALPERSONA_MODEL}-LOCAL`;
  const verified = payload.verified === true;
  const verificationHash = typeof payload.verificationHash === "string" && payload.verificationHash.trim().length > 0
    ? payload.verificationHash.trim()
    : await hashPayload({ deviceReference, method, timestamp, transactionId, verified });

  return {
    verified,
    deviceReference,
    transactionId,
    timestamp,
    verificationHash,
    method,
    sdkProvider: DIGITALPERSONA_PROVIDER,
    deviceModel: DIGITALPERSONA_MODEL,
  };
}

export async function detectDigitalPersona4500(options?: {
  endpoint?: string;
  mockMode?: boolean;
}): Promise<{ available: boolean; deviceModel: "DigitalPersona 4500"; sdkProvider: "HID DigitalPersona" }> {
  const endpoint = options?.endpoint || DIGITALPERSONA_LOCAL_AGENT_ENDPOINT;
  const mockMode = options?.mockMode ?? true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detect", deviceModel: DIGITALPERSONA_MODEL }),
      cache: "no-store",
    });

    if (response.ok) {
      return {
        available: true,
        deviceModel: DIGITALPERSONA_MODEL,
        sdkProvider: DIGITALPERSONA_PROVIDER,
      };
    }
  } catch {
    // Fall through to UAT mock mode when the local agent is not installed yet.
  }

  return {
    available: mockMode,
    deviceModel: DIGITALPERSONA_MODEL,
    sdkProvider: DIGITALPERSONA_PROVIDER,
  };
}

export async function captureFingerprintVerification(options?: {
  endpoint?: string;
  method?: DigitalPersonaEvidenceResult["method"];
  mockMode?: boolean;
}): Promise<DigitalPersonaEvidenceResult> {
  const endpoint = options?.endpoint || DIGITALPERSONA_LOCAL_AGENT_ENDPOINT;
  const method = options?.method || "biometric-fingerprint";
  const mockMode = options?.mockMode ?? true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", deviceModel: DIGITALPERSONA_MODEL, method }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Local biometric agent failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    rejectRawBiometricPayload(payload);
    return buildDigitalPersonaEvidenceResult(payload as Partial<DigitalPersonaEvidenceResult>);
  } catch (error) {
    if (!mockMode) {
      throw error;
    }

    return buildDigitalPersonaEvidenceResult({
      verified: true,
      method,
      deviceReference: `${DIGITALPERSONA_MODEL}-UAT-MOCK`,
      transactionId: `DP-UAT-${crypto.randomUUID()}`,
    });
  }
}