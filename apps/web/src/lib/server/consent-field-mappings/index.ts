import type { ConsentFieldMapping } from "@/lib/consents/field-mapping/types";
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
    coordinateMode: "NORMALIZED",
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
          page: 1,
          x: 0.085,
          y: 0.285,
          size: 8,
          maxWidth: 0.39,
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
          page: 1,
          x: 0.085,
          y: 0.391,
          size: 8,
          maxWidth: 0.39,
        },
      },
      {
        key: "treating_physician_signature",
        labelEn: "Treating physician signature",
        role: "PHYSICIAN_REQUIRED",
        type: "SIGNATURE",
        required: true,
        coordinates: {
          page: 2,
          x: 0.145,
          y: 0.468,
          size: 8,
          maxWidth: 0.30,
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
  const specificMapping = CONSENT_FIELD_MAPPINGS.find((mapping) => mapping.formId === formId || mapping.slug === formId);
  if (specificMapping) return specificMapping;

  return createGenericImcApprovedFieldMapping(formId);
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
