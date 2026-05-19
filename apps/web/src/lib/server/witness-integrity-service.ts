import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { asRecord, readBoolean, readString } from "@/lib/server/compliance-utils";

export type WitnessRoleCategory = "clinical" | "non_clinical";
export type WitnessSignatureType = "DIGITAL_SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";

export type LegalWitnessRecord = {
  witness_id: string;
  full_name: string;
  role: string;
  role_category: WitnessRoleCategory;
  id_type: string;
  id_number: string;
  mobile_number: string;
  identity_hash: string;
  attestation_confirmed: boolean;
  attested_at: string | null;
  attestation_language: "en" | "ar";
  attestation_version: string;
  signature_type: WitnessSignatureType;
  signature_hash: string;
  otp_reference: string | null;
  verification_status: "VERIFIED" | "PENDING" | "FAILED";
  manual_fallback_used: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  locked: boolean;
  edit_history: Array<{
    edited_at: string;
    edited_by: string;
    reason: string;
  }>;
};

export type WitnessIntegrityResult = {
  witnessCount: number;
  minimumWitnessesMet: boolean;
  identityVerified: boolean;
  roleCompositionValid: boolean;
  attestationComplete: boolean;
  hasDuplicates: boolean;
  blockers: string[];
  fields: Record<string, string>;
};

const SAUDI_MOBILE_REGEX = /^(\+9665\d{8}|05\d{8})$/;
const ALNUM_MIN_5 = /^[A-Za-z0-9-]{5,}$/;

const CLINICAL_ROLE_TOKENS = [
  "doctor",
  "physician",
  "consultant",
  "nurse",
  "clinical",
  "medical",
  "Ø·Ø¨ÙŠØ¨",
  "Ù…Ù…Ø±Ø¶",
  "Ø³Ø±ÙŠØ±ÙŠ",
  "Ø§Ø³ØªØ´Ø§Ø±ÙŠ",
];

function normalizeString(value: string | null | undefined): string {
  return (value || "").trim();
}

function normalizeMobile(value: string): string {
  const trimmed = normalizeString(value).replace(/\s+/g, "");
  if (trimmed.startsWith("+966")) {
    return trimmed;
  }
  if (trimmed.startsWith("05") && trimmed.length === 10) {
    return `+966${trimmed.slice(1)}`;
  }
  return trimmed;
}

function inferRoleCategory(role: string): WitnessRoleCategory {
  const lowered = role.toLowerCase();
  return CLINICAL_ROLE_TOKENS.some((token) => lowered.includes(token)) ? "clinical" : "non_clinical";
}

export function buildWitnessIdentityHash(idType: string, idNumber: string, mobileNumber: string): string {
  const payload = `${normalizeString(idType).toLowerCase()}|${normalizeString(idNumber).toUpperCase()}|${normalizeMobile(mobileNumber)}`;
  return createHash("sha256").update(payload).digest("hex");
}

function parseRoleCategory(value: string | null | undefined, fallbackRole: string): WitnessRoleCategory {
  return value === "clinical" || value === "non_clinical" ? value : inferRoleCategory(fallbackRole);
}

function parseSignatureType(value: string | null | undefined): WitnessSignatureType {
  if (value === "OTP" || value === "MANUAL_CONFIRMATION" || value === "DIGITAL_SIGNATURE") {
    return value;
  }
  return "DIGITAL_SIGNATURE";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function fromLegacyWitness(metadata: Record<string, unknown>): LegalWitnessRecord[] {
  const witness = asRecord(metadata.witness);
  if (!witness) {
    return [];
  }

  const fullName = normalizeString(readString(witness, "witness_name", "full_name"));
  if (!fullName) {
    return [];
  }

  const role = normalizeString(readString(witness, "witness_role", "role"));
  const idType = normalizeString(readString(witness, "id_type")) || "NATIONAL_ID";
  const idNumber = normalizeString(readString(witness, "id_number"));
  const mobile = normalizeMobile(readString(witness, "mobile_number") || "");
  const identityHash =
    normalizeString(readString(witness, "identity_hash")) ||
    (idNumber || mobile ? buildWitnessIdentityHash(idType, idNumber, mobile) : "");

  return [
    {
      witness_id: normalizeString(readString(witness, "witness_id")) || "legacy-witness-1",
      full_name: fullName,
      role,
      role_category: parseRoleCategory(readString(witness, "role_category"), role),
      id_type: idType,
      id_number: idNumber,
      mobile_number: mobile,
      identity_hash: identityHash,
      attestation_confirmed: Boolean(readBoolean(witness, "attestation_confirmed")),
      attested_at: normalizeString(readString(witness, "attested_at", "recorded_at")) || null,
      attestation_language: readString(witness, "attestation_language") === "ar" ? "ar" : "en",
      attestation_version: normalizeString(readString(witness, "attestation_version")) || "1.0",
      signature_type: parseSignatureType(readString(witness, "signature_type")),
      signature_hash: normalizeString(readString(witness, "signature_hash", "signature")),
      otp_reference: normalizeString(readString(witness, "otp_reference")) || null,
      verification_status: (readString(witness, "verification_status") as LegalWitnessRecord["verification_status"]) ||
        "PENDING",
      manual_fallback_used: Boolean(readBoolean(witness, "manual_fallback_used")),
      created_at: normalizeString(readString(witness, "created_at", "recorded_at")) || new Date().toISOString(),
      created_by: normalizeString(readString(witness, "created_by")) || "system",
      updated_at: normalizeString(readString(witness, "updated_at", "recorded_at")) || new Date().toISOString(),
      updated_by: normalizeString(readString(witness, "updated_by")) || "system",
      ip_address: normalizeString(readString(witness, "ip_address")) || null,
      device_fingerprint: normalizeString(readString(witness, "device_fingerprint")) || null,
      locked: Boolean(readBoolean(witness, "locked")),
      edit_history: [],
    },
  ];
}

export function extractWitnessesFromMetadata(metadataJson: Prisma.JsonValue | null | undefined): LegalWitnessRecord[] {
  const metadata = asRecord(metadataJson);
  const witnesses = asArray(metadata?.witnesses)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry, index) => {
      const fullName = normalizeString(readString(entry, "full_name", "witness_name"));
      const role = normalizeString(readString(entry, "role", "witness_role"));
      const idType = normalizeString(readString(entry, "id_type")) || "NATIONAL_ID";
      const idNumber = normalizeString(readString(entry, "id_number"));
      const mobile = normalizeMobile(readString(entry, "mobile_number") || "");
      const identityHash =
        normalizeString(readString(entry, "identity_hash")) ||
        (idNumber || mobile ? buildWitnessIdentityHash(idType, idNumber, mobile) : "");
      const verificationStatus = normalizeString(readString(entry, "verification_status")).toUpperCase();

      return {
        witness_id: normalizeString(readString(entry, "witness_id")) || `witness-${index + 1}`,
        full_name: fullName,
        role,
        role_category: parseRoleCategory(readString(entry, "role_category"), role),
        id_type: idType,
        id_number: idNumber,
        mobile_number: mobile,
        identity_hash: identityHash,
        attestation_confirmed: Boolean(readBoolean(entry, "attestation_confirmed")),
        attested_at: normalizeString(readString(entry, "attested_at")) || null,
        attestation_language: readString(entry, "attestation_language") === "ar" ? "ar" : "en",
        attestation_version: normalizeString(readString(entry, "attestation_version")) || "1.0",
        signature_type: parseSignatureType(readString(entry, "signature_type")),
        signature_hash: normalizeString(readString(entry, "signature_hash")),
        otp_reference: normalizeString(readString(entry, "otp_reference")) || null,
        verification_status:
          verificationStatus === "VERIFIED" || verificationStatus === "FAILED"
            ? (verificationStatus as LegalWitnessRecord["verification_status"])
            : "PENDING",
        manual_fallback_used: Boolean(readBoolean(entry, "manual_fallback_used")),
        created_at: normalizeString(readString(entry, "created_at")) || new Date().toISOString(),
        created_by: normalizeString(readString(entry, "created_by")) || "system",
        updated_at: normalizeString(readString(entry, "updated_at")) || new Date().toISOString(),
        updated_by: normalizeString(readString(entry, "updated_by")) || "system",
        ip_address: normalizeString(readString(entry, "ip_address")) || null,
        device_fingerprint: normalizeString(readString(entry, "device_fingerprint")) || null,
        locked: Boolean(readBoolean(entry, "locked")),
        edit_history: [],
      } satisfies LegalWitnessRecord;
    });

  if (witnesses.length > 0) {
    return witnesses;
  }

  return metadata ? fromLegacyWitness(metadata) : [];
}

function validateWitnessFields(witnesses: LegalWitnessRecord[]): Record<string, string> {
  const fields: Record<string, string> = {};

  witnesses.forEach((witness, index) => {
    const prefix = `witnesses.${index}`;

    if (!witness.full_name) {
      fields[`${prefix}.full_name`] = "Witness full name is required";
    }
    if (!witness.role) {
      fields[`${prefix}.role`] = "Witness role is required";
    }
    if (!witness.id_number || !ALNUM_MIN_5.test(witness.id_number)) {
      fields[`${prefix}.id_number`] = "Witness ID number must be alphanumeric and at least 5 characters";
    }
    if (!witness.mobile_number || !SAUDI_MOBILE_REGEX.test(witness.mobile_number)) {
      fields[`${prefix}.mobile_number`] = "Witness mobile number must be a valid Saudi number";
    }
    if (!witness.attestation_confirmed || !witness.attested_at) {
      fields[`${prefix}.attestation`] = "Witness attestation must be confirmed";
    }
    if (!witness.signature_hash) {
      fields[`${prefix}.signature_hash`] = "Witness signature evidence is required";
    }
    if (witness.signature_type === "OTP" && !witness.otp_reference) {
      fields[`${prefix}.otp_reference`] = "OTP reference is required when OTP verification is used";
    }
    if (witness.verification_status !== "VERIFIED") {
      fields[`${prefix}.verification_status`] = "Witness identity verification must be VERIFIED";
    }

    const updatedAt = witness.updated_at ? Date.parse(witness.updated_at) : Number.NaN;
    const attestedAt = witness.attested_at ? Date.parse(witness.attested_at) : Number.NaN;
    if (!Number.isNaN(updatedAt) && !Number.isNaN(attestedAt) && updatedAt > attestedAt) {
      fields[`${prefix}.tamper`] = "Witness was modified after attestation and must be re-attested";
    }
  });

  return fields;
}

export function evaluateWitnessIntegrity(metadataJson: Prisma.JsonValue | null | undefined): WitnessIntegrityResult {
  const witnesses = extractWitnessesFromMetadata(metadataJson);
  const fields = validateWitnessFields(witnesses);

  const byIdentity = new Set<string>();
  let hasDuplicates = false;
  let hasClinical = false;
  let hasNonClinical = false;

  for (let index = 0; index < witnesses.length; index += 1) {
    const witness = witnesses[index];
    const identityKey = (witness.identity_hash || `${witness.id_number}|${witness.mobile_number}`).toLowerCase();
    if (identityKey && byIdentity.has(identityKey)) {
      hasDuplicates = true;
      fields[`witnesses.${index}.duplicate`] = "Duplicate witness identity is not allowed";
    }
    byIdentity.add(identityKey);

    if (witness.role_category === "clinical") {
      hasClinical = true;
    }
    if (witness.role_category === "non_clinical") {
      hasNonClinical = true;
    }
  }

  const minimumWitnessesMet = witnesses.length >= 2;
  const identityVerified = Object.keys(fields).every((key) => !key.includes("id_number") && !key.includes("mobile_number") && !key.includes("verification_status") && !key.includes("duplicate"));
  const roleCompositionValid = hasClinical && hasNonClinical;
  const attestationComplete = Object.keys(fields).every((key) => !key.includes("attestation") && !key.includes("signature_hash") && !key.includes("otp_reference") && !key.includes("tamper"));

  const blockers: string[] = [];
  if (!minimumWitnessesMet) {
    blockers.push("Minimum witnesses requirement not met");
  }
  if (!identityVerified || hasDuplicates) {
    blockers.push("Witness identity not verified");
  }
  if (!roleCompositionValid) {
    blockers.push("Witness roles not compliant");
  }
  if (!attestationComplete) {
    blockers.push("Witness attestation incomplete");
  }

  return {
    witnessCount: witnesses.length,
    minimumWitnessesMet,
    identityVerified: identityVerified && !hasDuplicates,
    roleCompositionValid,
    attestationComplete,
    hasDuplicates,
    blockers,
    fields,
  };
}

export function assertWitnessIntegrityOrThrow(metadataJson: Prisma.JsonValue | null | undefined): WitnessIntegrityResult {
  const integrity = evaluateWitnessIntegrity(metadataJson);
  if (integrity.blockers.length === 0) {
    return integrity;
  }

  const primary = integrity.blockers[0];
  let code = "WITNESS_INTEGRITY_FAILED";
  if (primary === "Minimum witnesses requirement not met") {
    code = "MIN_WITNESSES_REQUIRED";
  } else if (primary === "Witness identity not verified") {
    code = "WITNESS_IDENTITY_NOT_VERIFIED";
  } else if (primary === "Witness roles not compliant") {
    code = "INVALID_WITNESS_COMPOSITION";
  } else if (primary === "Witness attestation incomplete") {
    code = "WITNESS_ATTESTATION_INCOMPLETE";
  }

  throw new ApiError(400, primary, {
    code,
    fields: integrity.fields,
  });
}

export function toWitnessesMetadataValue(witnesses: LegalWitnessRecord[]): JsonInputValue {
  return witnesses as unknown as JsonInputValue;
}
