import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { ConsentFieldMapping, ConsentFieldDefinition } from "@/lib/consents/field-mapping/types";
import { ApiError } from "@/lib/server/http";
import { ADENOTONSILLECTOMY_FIELD_MAPPING } from "./adenotonsillectomy.mapping";
import { ARTHROGRAM_FIELD_MAPPING } from "./arthrogram.mapping";

const CONSENT_FIELD_MAPPINGS: ConsentFieldMapping[] = [
  ADENOTONSILLECTOMY_FIELD_MAPPING,
  ARTHROGRAM_FIELD_MAPPING,
];

const IMC_APPROVED_FORM_ID_PREFIX = "imc-approved-";

function toTitleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createGenericImcApprovedFieldMapping(formId: string): ConsentFieldMapping | null {
  if (!formId.startsWith(IMC_APPROVED_FORM_ID_PREFIX)) {
    return null;
  }

  const slug = formId.slice(IMC_APPROVED_FORM_ID_PREFIX.length);

  return {
    formId,
    slug,
    titleEn: toTitleCaseFromSlug(slug),
    layoutFamily: "IMC_GENERIC_APPROVED_CONSENT",
    version: "0.1.0",
    verificationStatus: "DRAFT",
    requiresDoctorCompletion: true,
    supportsAnesthesiaWorkflow: false,
    blocksPatientDispatchUntilVerified: true,
    fields: [
      {
        key: "condition_and_treatment",
        section: "B",
        labelEn: "Condition and treatment",
        role: "PHYSICIAN_REQUIRED",
        type: "MULTILINE_TEXT",
        required: true,
        maxLength: 1200,
        multiline: true,
        placeholderEn: "Document the patient condition, indication, and clinical context.",
        coordinates: {
          coordinateMode: "NORMALIZED",
          page: 1,
          x: 0.085,
          y: 0.285,
          width: 0.39,
          height: 0.03,
        },
      },
      {
        key: "procedure_site_side",
        section: "B",
        labelEn: "Procedure, site and/or side",
        role: "PHYSICIAN_REQUIRED",
        type: "MULTILINE_TEXT",
        required: true,
        maxLength: 800,
        multiline: true,
        placeholderEn: "Document the procedure, site, side, or laterality where applicable.",
        coordinates: {
          coordinateMode: "NORMALIZED",
          page: 1,
          x: 0.085,
          y: 0.391,
          width: 0.39,
          height: 0.03,
        },
      },
      {
        key: "treating_physician_signature",
        labelEn: "Treating physician signature",
        role: "PHYSICIAN_REQUIRED",
        type: "SIGNATURE",
        required: true,
        coordinates: {
          coordinateMode: "NORMALIZED",
          page: 2,
          x: 0.145,
          y: 0.468,
          width: 0.3,
          height: 0.026,
        },
      },
      {
        key: "patient_signature",
        labelEn: "Patient / guardian signature",
        role: "PATIENT_REQUIRED",
        type: "SIGNATURE",
        required: true,
      },
      {
        key: "signed_at",
        labelEn: "Signed date and time",
        role: "SYSTEM_AUTO",
        type: "DATETIME",
        required: true,
      },
    ],
  };
}

export type PersistedFieldMappingVerification = {
  status: "VERIFIED" | "STALE" | "DEPRECATED";
  approvedAt: string;
  approvedByUserId: string | null;
  mappingHash: string;
  formVersion?: string;
};

export type ConsentFieldMappingReadiness = {
  formId: string;
  slug?: string;
  hasMapping: boolean;
  verificationStatus: string;
  sendBlocked: boolean;
  blockers: string[];
  requiredDoctorFields: Array<{
    key: string;
    labelEn: string;
    section?: string;
    type: string;
  }>;
  requiredAnesthesiaFields: Array<{
    key: string;
    labelEn: string;
    section?: string;
    type: string;
    requiredWhen?: string;
  }>;
  requiredPatientFields: Array<{
    key: string;
    labelEn: string;
    type: string;
  }>;
  mapping?: ConsentFieldMapping;
  persistedVerification?: PersistedFieldMappingVerification | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function canonicalizeCoordinate(coordinates?: ConsentFieldDefinition["coordinates"]) {
  if (!coordinates) return undefined;
  return {
    coordinateMode: coordinates.coordinateMode,
    page: coordinates.page,
    x: coordinates.x,
    y: coordinates.y,
    width: coordinates.width,
    height: coordinates.height,
  };
}

/**
 * Compute a deterministic hash of the canonical, clinician-legally relevant
 * mapping shape. Transient display text (labels, placeholders) is excluded so
 * that typo fixes do not invalidate an already-verified mapping.
 */
export function computeConsentFieldMappingHash(mapping: ConsentFieldMapping): string {
  const canonical = {
    formId: mapping.formId,
    slug: mapping.slug,
    version: mapping.version,
    layoutFamily: mapping.layoutFamily,
    requiresDoctorCompletion: mapping.requiresDoctorCompletion,
    supportsAnesthesiaWorkflow: mapping.supportsAnesthesiaWorkflow,
    blocksPatientDispatchUntilVerified: mapping.blocksPatientDispatchUntilVerified,
    fields: mapping.fields
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((field) => ({
        key: field.key,
        role: field.role,
        type: field.type,
        required: field.required,
        requiredWhen: field.requiredWhen,
        section: field.section,
        sourcePath: field.sourcePath,
        coordinates: canonicalizeCoordinate(field.coordinates),
        arabicCoordinates: canonicalizeCoordinate(field.arabicCoordinates),
      })),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function extractFieldMappingVerification(metadata: unknown): PersistedFieldMappingVerification | null {
  const record = asRecord(metadata);
  if (!record) return null;
  const verification = asRecord(record.fieldMappingVerification);
  if (!verification) return null;

  const status = String(verification.status || "");
  if (status !== "VERIFIED" && status !== "STALE" && status !== "DEPRECATED") {
    return null;
  }

  const mappingHash = String(verification.mappingHash || "");
  if (!mappingHash) return null;

  return {
    status,
    approvedAt: String(verification.approvedAt || ""),
    approvedByUserId: typeof verification.approvedByUserId === "string" ? verification.approvedByUserId : null,
    mappingHash,
    formVersion: typeof verification.formVersion === "string" ? verification.formVersion : undefined,
  };
}

export function resolveEffectiveVerificationStatus(
  mapping: ConsentFieldMapping,
  persistedVerification?: PersistedFieldMappingVerification | null,
): { status: string; stale: boolean } {
  if (!persistedVerification) {
    return { status: mapping.verificationStatus, stale: false };
  }

  const currentHash = computeConsentFieldMappingHash(mapping);
  if (persistedVerification.mappingHash !== currentHash) {
    return { status: "STALE", stale: true };
  }

  return { status: persistedVerification.status, stale: false };
}

export async function persistFieldMappingVerification(args: {
  tenantId: string;
  formId: string;
  approvedByUserId: string;
  prisma: PrismaClient;
}): Promise<ConsentFieldMappingReadiness> {
  const { tenantId, formId, approvedByUserId, prisma } = args;

  const form = await prisma.consentForm.findFirst({
    where: { id: formId, tenantId },
    select: { id: true, metadata: true, version: true },
  });

  if (!form) {
    throw new ApiError(404, "Consent form not found");
  }

  const mapping = getConsentFieldMappingByFormId(formId);
  if (!mapping) {
    throw new ApiError(404, "Consent field mapping not found for this form");
  }

  const mappingHash = computeConsentFieldMappingHash(mapping);
  const verification: PersistedFieldMappingVerification = {
    status: "VERIFIED",
    approvedAt: new Date().toISOString(),
    approvedByUserId,
    mappingHash,
    formVersion: mapping.version,
  };

  const existingMetadata = asRecord(form.metadata) || {};
  await prisma.consentForm.update({
    where: { id: formId, tenantId },
    data: {
      metadata: {
        ...existingMetadata,
        fieldMappingVerification: verification,
      },
    },
  });

  return getConsentFieldMappingReadiness(formId, verification);
}

export function getConsentFieldMappingByFormId(formId: string): ConsentFieldMapping | null {
  const specificMapping = CONSENT_FIELD_MAPPINGS.find((mapping) => mapping.formId === formId || mapping.slug === formId);
  if (specificMapping) return specificMapping;

  return createGenericImcApprovedFieldMapping(formId);
}

export function listConsentFieldMappings(): ConsentFieldMapping[] {
  return CONSENT_FIELD_MAPPINGS;
}

export function getConsentFieldMappingReadiness(
  formId: string,
  persistedVerification?: PersistedFieldMappingVerification | null,
): ConsentFieldMappingReadiness {
  const mapping = getConsentFieldMappingByFormId(formId);

  if (!mapping) {
    return {
      formId,
      hasMapping: false,
      verificationStatus: "MISSING",
      sendBlocked: true,
      blockers: ["No consent field mapping found for this form."],
      requiredDoctorFields: [],
      requiredAnesthesiaFields: [],
      requiredPatientFields: [],
      persistedVerification: persistedVerification ?? null,
    };
  }

  const requiredDoctorFields = mapping.fields.filter((field) => field.role === "PHYSICIAN_REQUIRED" && field.required);
  const requiredAnesthesiaFields = mapping.fields.filter((field) => field.role === "ANESTHESIA_REQUIRED");
  const requiredPatientFields = mapping.fields.filter((field) => field.role === "PATIENT_REQUIRED" && field.required);

  const { status: effectiveStatus, stale } = resolveEffectiveVerificationStatus(mapping, persistedVerification);

  const blockers: string[] = [];

  if (effectiveStatus !== "VERIFIED") {
    blockers.push("Consent field mapping is not verified.");
  }

  if (stale) {
    blockers.push("Consent field mapping verification is stale; re-verification is required.");
  }

  if (requiredDoctorFields.length > 0) {
    blockers.push("Physician completion fields must be completed before patient dispatch.");
  }

  if (requiredPatientFields.length === 0) {
    blockers.push("Patient signature field is not mapped.");
  }

  return {
    formId: mapping.formId,
    slug: mapping.slug,
    hasMapping: true,
    verificationStatus: effectiveStatus,
    sendBlocked: mapping.blocksPatientDispatchUntilVerified && blockers.length > 0,
    blockers,
    requiredDoctorFields: requiredDoctorFields.map((field) => ({
      key: field.key,
      labelEn: field.labelEn,
      section: field.section,
      type: field.type,
    })),
    requiredAnesthesiaFields: requiredAnesthesiaFields.map((field) => ({
      key: field.key,
      labelEn: field.labelEn,
      section: field.section,
      type: field.type,
      requiredWhen: field.requiredWhen,
    })),
    requiredPatientFields: requiredPatientFields.map((field) => ({
      key: field.key,
      labelEn: field.labelEn,
      type: field.type,
    })),
    mapping,
    persistedVerification: persistedVerification ?? null,
  };
}
