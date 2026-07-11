import type { ConsentFieldMapping } from "@/lib/consents/field-mapping/types";
import { ADENOTONSILLECTOMY_FIELD_MAPPING } from "./adenotonsillectomy.mapping";

const CONSENT_FIELD_MAPPINGS: ConsentFieldMapping[] = [
  ADENOTONSILLECTOMY_FIELD_MAPPING,
];

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
};

export function getConsentFieldMappingByFormId(formId: string): ConsentFieldMapping | null {
  return CONSENT_FIELD_MAPPINGS.find((mapping) => mapping.formId === formId || mapping.slug === formId) ?? null;
}

export function listConsentFieldMappings(): ConsentFieldMapping[] {
  return CONSENT_FIELD_MAPPINGS;
}

export function getConsentFieldMappingReadiness(formId: string): ConsentFieldMappingReadiness {
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
    };
  }

  const requiredDoctorFields = mapping.fields.filter((field) => field.role === "PHYSICIAN_REQUIRED" && field.required);
  const requiredAnesthesiaFields = mapping.fields.filter((field) => field.role === "ANESTHESIA_REQUIRED");
  const requiredPatientFields = mapping.fields.filter((field) => field.role === "PATIENT_REQUIRED" && field.required);

  const blockers: string[] = [];

  if (mapping.verificationStatus !== "VERIFIED") {
    blockers.push("Consent field mapping is not verified.");
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
    verificationStatus: mapping.verificationStatus,
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
  };
}
