import crypto from "node:crypto";

export type OtpChallengePayload = {
  challengeId: string;
  tokenHash: string;
  otpHash: string;
  phoneNumber: string;
  maskedPhone: string;
  expiresAt: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
};

export function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

export function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function maskPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function otpHash(otpCode: string): string {
  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim();
  if (!pepper) {
    throw new Error("PUBLIC_SIGNING_OTP_PEPPER is required for OTP hashing.");
  }
  return crypto.createHmac("sha256", pepper).update(otpCode).digest("hex");
}

export function generateOtpCode(): string {
  const number = crypto.randomInt(0, 1_000_000);
  return number.toString().padStart(6, "0");
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseOtpPayload(raw: unknown): OtpChallengePayload | null {
  if (!raw) return null;
  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as Partial<OtpChallengePayload>;
  if (!payload.challengeId || !payload.tokenHash || !payload.otpHash || !payload.expiresAt) {
    return null;
  }

  return {
    challengeId: String(payload.challengeId),
    tokenHash: String(payload.tokenHash),
    otpHash: String(payload.otpHash),
    phoneNumber: String(payload.phoneNumber || ""),
    maskedPhone: String(payload.maskedPhone || ""),
    expiresAt: String(payload.expiresAt),
    sessionId: String(payload.sessionId || ""),
    documentId: String(payload.documentId || ""),
    moduleType: String(payload.moduleType || ""),
  };
}

export function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online";

  const stripped = raw.replace(/\/$/, "");
  if (stripped.startsWith("http://") && process.env.VERCEL_ENV === "production") {
    return "https://wathiqcare.online";
  }
  return stripped;
}
