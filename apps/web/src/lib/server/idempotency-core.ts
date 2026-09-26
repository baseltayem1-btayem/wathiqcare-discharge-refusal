import crypto from "node:crypto";

export type IdempotencyOperation =
  | "CONSENT_DOCUMENT_CREATE"
  | "SIGNING_SESSION_CREATE"
  | "PATIENT_MESSAGE_SMS"
  | "PATIENT_MESSAGE_EMAIL"
  | "WITNESS_REQUIREMENT_CREATE"
  | "WITNESS_SIGNATURE_CAPTURE";

export type RootOperationKeyInput = {
  tenantId: string;
  patientId?: string | null;
  encounterId?: string | null;
  consentFormKey: string;
  consentFormVersion: string;
  payloadFingerprint: string;
};

const IDEMPOTENCY_KEY_MAX_LENGTH = 255;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]+$/;

function sortedStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(v).sort()) {
        sorted[key] = v[key];
      }
      return sorted;
    }
    return v;
  });
}

/**
 * Canonicalize a payload into a deterministic JSON string.
 * Object keys are sorted; arrays are preserved in input order because
 * their positional semantics are usually meaningful (e.g. risk lists).
 */
export function canonicalizePayload(payload: unknown): string {
  return sortedStringify(payload);
}

/**
 * Compute a SHA-256 fingerprint of the medically relevant payload.
 */
export function computePayloadFingerprint(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonicalizePayload(payload), "utf8")
    .digest("hex");
}

/**
 * Derive a stable root operation key for an approved consent draft.
 * The key survives component remount and browser refresh because it is
 * deterministic from tenant, patient, encounter, form/version and payload.
 */
export function deriveRootOperationKey(input: RootOperationKeyInput): string {
  const normalized = {
    tenantId: input.tenantId,
    patientId: input.patientId ?? null,
    encounterId: input.encounterId ?? null,
    consentFormKey: input.consentFormKey,
    consentFormVersion: input.consentFormVersion,
    payloadFingerprint: input.payloadFingerprint,
  };
  return crypto
    .createHash("sha256")
    .update(canonicalizePayload(normalized), "utf8")
    .digest("hex");
}

/**
 * Derive a deterministic child idempotency key from a root key.
 * Each operation type (document create, session create, SMS, email)
 * gets a distinct, deterministic key.
 */
export function deriveChildIdempotencyKey(
  rootKey: string,
  operation: IdempotencyOperation | string,
): string {
  const hmac = crypto.createHmac(
    "sha256",
    `wathiqcare_idempotency_v1:${operation}`,
  );
  hmac.update(rootKey, "utf8");
  return hmac.digest("hex");
}

export function validateIdempotencyKey(key: string | undefined | null): void {
  if (!key || typeof key !== "string") {
    throw new Error("Idempotency-Key is required");
  }
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new Error(
      `Idempotency-Key must not exceed ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
    );
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new Error(
      "Idempotency-Key must contain only ASCII letters, digits, underscore, period, colon or hyphen",
    );
  }
}

export function isValidIdempotencyKey(key: string | undefined | null): boolean {
  try {
    validateIdempotencyKey(key);
    return true;
  } catch {
    return false;
  }
}

export type HashRecipientOptions = {
  tenantId: string;
  pepper?: string;
};

/**
 * Compute a tenant-scoped, keyed HMAC-SHA256 hash of a recipient address.
 * The global RECIPIENT_HASH_PEPPER env var is mandatory; the function fails
 * closed if it is missing. Never store plaintext recipients in logs/audit.
 */
export function hashRecipient(
  value: string,
  options: HashRecipientOptions,
): string {
  const pepper = options.pepper ?? process.env.RECIPIENT_HASH_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "RECIPIENT_HASH_PEPPER is required and must be at least 16 characters",
    );
  }
  return crypto
    .createHmac("sha256", `${pepper}:${options.tenantId}`)
    .update(value.trim().toLowerCase())
    .digest("hex");
}
