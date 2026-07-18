/**
 * Authoritative readiness adapter for AcroForm-backed approved consent templates.
 *
 * This is the single source of truth that combines:
 * - the canonical template identity (resolves aliases to one formId)
 * - the verified AcroForm manifest state
 * - the existing consent-field mapping readiness
 *
 * It exposes semantic, legally meaningful aggregates (physician fields, signature
 * targets, interpreter/anesthesia/education/substitute/witness applicability)
 * without creating a second independent readiness model.
 */

import type { ConsentFieldDefinition, ConsentFieldMapping } from "@/lib/consents/field-mapping/types";
import {
  getConsentFieldMappingByFormId,
  type ConsentFieldMappingReadiness,
  type PersistedFieldMappingVerification,
} from "@/lib/server/consent-field-mappings";
import { getAcroFormTemplateDiagnostics, type AcroFormTemplateDiagnostics } from "./acroform-diagnostics-service";
import { resolveCanonicalAcroFormTemplateId } from "./acroform-template-identity";

export type AcroFormSemanticField = {
  key: string;
  labelEn: string;
  labelAr?: string;
  section?: string;
  type: string;
  required: boolean;
  requiredWhen?: string;
  role: string;
};

export type AcroFormSignatureTarget = {
  key: string;
  labelEn: string;
  labelAr?: string;
  role: string;
};

export type AcroFormManifestState = {
  present: boolean;
  hashMatches: boolean;
  hash: string | null;
  status: "READY" | "NOT_READY";
  blockers: string[];
};

export type AcroFormReadinessAdapter = {
  /** Canonical template identity that all consumers must use. */
  canonicalTemplateIdentity: {
    formId: string;
    slug: string;
    titleEn: string;
    titleAr?: string;
    templateCode?: string;
    layoutFamily: string;
  };
  /** Verified/current manifest state derived from the canonical identity. */
  manifestState: AcroFormManifestState;
  /** Semantic physician fields required for doctor completion. */
  semanticPhysicianFields: AcroFormSemanticField[];
  /** Patient signature targets (e.g. patient signature, consent name). */
  patientSignatureTargets: AcroFormSignatureTarget[];
  /** Physician signature targets (e.g. treating physician signature). */
  physicianSignatureTargets: AcroFormSignatureTarget[];
  /** Whether this template exposes interpreter applicability decisions. */
  interpreterApplicable: boolean;
  /** Whether anesthesia content applies to this template. */
  anesthesiaApplicable: boolean;
  /** Whether patient education material choices are part of this template. */
  educationRequired: boolean;
  /** Whether substitute decision-maker fields are applicable. */
  substituteDecisionMakerApplicable: boolean;
  /** Whether witness fields are applicable. */
  witnessApplicable: boolean;
  /** Raw AcroForm diagnostics for API consumers. */
  acroFormDiagnostics: AcroFormTemplateDiagnostics;
  /** Underlying consent-field mapping for this canonical form. */
  mapping: ConsentFieldMapping | null;
};

function toSemanticField(field: ConsentFieldDefinition): AcroFormSemanticField {
  return {
    key: field.key,
    labelEn: field.labelEn,
    labelAr: field.labelAr,
    section: field.section,
    type: field.type,
    required: field.required,
    requiredWhen: field.requiredWhen,
    role: field.role,
  };
}

function toSignatureTarget(field: ConsentFieldDefinition): AcroFormSignatureTarget | null {
  if (field.type !== "SIGNATURE") return null;
  return {
    key: field.key,
    labelEn: field.labelEn,
    labelAr: field.labelAr,
    role: field.role,
  };
}

/**
 * Build the authoritative AcroForm readiness adapter for the supplied form
 * identifier. If the identifier is not an AcroForm-backed template, returns
 * null so callers can fall back to ordinary mapping readiness.
 */
export function buildAcroFormReadinessAdapter(formId: string): AcroFormReadinessAdapter | null {
  const canonical = resolveCanonicalAcroFormTemplateId(formId);
  if (!canonical) return null;

  const mapping = getConsentFieldMappingByFormId(canonical.canonicalFormId);
  const acroFormDiagnostics = getAcroFormTemplateDiagnostics(canonical.canonicalFormId);

  const manifestState: AcroFormManifestState = {
    present: acroFormDiagnostics.manifestPresent,
    hashMatches: acroFormDiagnostics.manifestHashMatches,
    hash: acroFormDiagnostics.manifestHash,
    status: acroFormDiagnostics.status,
    blockers: acroFormDiagnostics.blockers,
  };

  const fields = mapping?.fields ?? [];

  const semanticPhysicianFields = fields
    .filter((field) => field.role === "PHYSICIAN_REQUIRED")
    .map(toSemanticField);

  const patientSignatureTargets = fields
    .filter((field) => field.role === "PATIENT_REQUIRED" && field.type === "SIGNATURE")
    .map(toSignatureTarget)
    .filter((target): target is AcroFormSignatureTarget => target !== null);

  const physicianSignatureTargets = fields
    .filter((field) => field.role === "PHYSICIAN_REQUIRED" && field.type === "SIGNATURE")
    .map(toSignatureTarget)
    .filter((target): target is AcroFormSignatureTarget => target !== null);

  const interpreterApplicable = fields.some((field) => field.role === "INTERPRETER_CONDITIONAL");
  const anesthesiaApplicable = fields.some((field) => field.role === "ANESTHESIA_REQUIRED");
  const educationRequired = fields.some((field) => field.role === "READ_ONLY" && field.key.startsWith("education_"));
  const substituteDecisionMakerApplicable = fields.some((field) => field.role === "GUARDIAN_CONDITIONAL");
  const witnessApplicable = fields.some((field) => field.role === "WITNESS_CONDITIONAL");

  return {
    canonicalTemplateIdentity: {
      formId: canonical.canonicalFormId,
      slug: canonical.slug,
      titleEn: canonical.titleEn,
      titleAr: canonical.titleAr,
      templateCode: canonical.templateCode,
      layoutFamily: canonical.layoutFamily,
    },
    manifestState,
    semanticPhysicianFields,
    patientSignatureTargets,
    physicianSignatureTargets,
    interpreterApplicable,
    anesthesiaApplicable,
    educationRequired,
    substituteDecisionMakerApplicable,
    witnessApplicable,
    acroFormDiagnostics,
    mapping: mapping ?? null,
  };
}

/**
 * Merge AcroForm-specific readiness into the existing consent-field mapping
 * readiness object. This keeps the API contract stable while guaranteeing that
 * the mapping, diagnostics, and canonical identity all agree.
 */
export function mergeAcroFormReadinessIntoFieldMappingReadiness(
  base: ConsentFieldMappingReadiness,
  persistedVerification?: PersistedFieldMappingVerification | null,
): ConsentFieldMappingReadiness & { acroForm: AcroFormReadinessAdapter | null } {
  const adapter = buildAcroFormReadinessAdapter(base.formId);
  if (!adapter) {
    return { ...base, acroForm: null };
  }

  const effectiveMapping = adapter.mapping ?? base.mapping;
  const effectiveFormId = adapter.canonicalTemplateIdentity.formId;
  const effectiveSlug = adapter.canonicalTemplateIdentity.slug;

  const requiredDoctorFields = effectiveMapping
    ? effectiveMapping.fields
        .filter(
          (field) =>
            (field.role === "PHYSICIAN_REQUIRED" && field.required) ||
            field.role === "INTERPRETER_CONDITIONAL",
        )
        .map((field) => ({
          key: field.key,
          labelEn: field.labelEn,
          section: field.section,
          type: field.type,
        }))
    : base.requiredDoctorFields;

  const requiredAnesthesiaFields = effectiveMapping
    ? effectiveMapping.fields
        .filter((field) => field.role === "ANESTHESIA_REQUIRED")
        .map((field) => ({
          key: field.key,
          labelEn: field.labelEn,
          section: field.section,
          type: field.type,
          requiredWhen: field.requiredWhen,
        }))
    : base.requiredAnesthesiaFields;

  const requiredPatientFields = effectiveMapping
    ? effectiveMapping.fields
        .filter((field) => field.role === "PATIENT_REQUIRED" && field.required)
        .map((field) => ({
          key: field.key,
          labelEn: field.labelEn,
          type: field.type,
        }))
    : base.requiredPatientFields;

  const effectiveHasMapping = Boolean(effectiveMapping);
  const effectiveVerificationStatus = effectiveHasMapping && effectiveMapping
    ? effectiveMapping.verificationStatus
    : base.verificationStatus;

  return {
    ...base,
    formId: effectiveFormId,
    slug: effectiveSlug,
    hasMapping: effectiveHasMapping,
    verificationStatus: effectiveVerificationStatus,
    mapping: effectiveMapping,
    persistedVerification: persistedVerification ?? base.persistedVerification ?? null,
    requiredDoctorFields,
    requiredAnesthesiaFields,
    requiredPatientFields,
    acroForm: adapter,
  } as ConsentFieldMappingReadiness & { acroForm: AcroFormReadinessAdapter | null };
}
