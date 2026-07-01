/**
 * SMS Gateway Proxy — Safe Logging Utilities
 *
 * Rules:
 * - Mask mobile numbers (show last 4 digits only).
 * - Never log bearer tokens.
 * - Never log full OTP codes.
 * - Log correlationId and provider status only.
 */

const MOBILE_MASK_LENGTH = 4;

export function maskMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= MOBILE_MASK_LENGTH) {
    return "***";
  }
  const prefix = digits.slice(0, -MOBILE_MASK_LENGTH).replace(/./g, "*");
  const suffix = digits.slice(-MOBILE_MASK_LENGTH);
  return `${prefix}${suffix}`;
}

export function redactSensitiveHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower === "authorization" || lower === "x-wathiqcare-sms-secret") {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeLogMessage(message: string): string {
  // Remove potential bearer tokens from log messages
  return message
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/g, "Bearer [REDACTED]")
    .replace(/\b\d{4,6}\b/g, "[OTP_REDACTED]");
}
