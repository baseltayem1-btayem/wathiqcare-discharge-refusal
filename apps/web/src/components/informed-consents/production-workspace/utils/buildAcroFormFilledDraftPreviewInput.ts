import type { AcroFormFilledDraftPreviewInput } from "../lib/api";
import type { ProductionPatient, ProductionEncounter, PhysicianContext } from "../types";
import { normalizePatientDob } from "./normalizePatientDob";

export function isAmputationForm(formId: string): boolean {
  return formId === "imc-approved-amputation";
}

export function withAmputationDoctorCompletionValues(
  formId: string,
  values: Record<string, string>,
): Record<string, string> {
  if (!isAmputationForm(formId)) return values;
  return {
    ...values,
    education_amputation_sheet_provided: "true",
  };
}

/**
 * Build the exact payload the production physician workspace sends to the
 * draft-pdf endpoint. This is the single place where workspace-specific
 * defaults (amputation information sheet) and normalizations (patient DOB)
 * are applied, so the request shape is testable independent of React state.
 */
export function buildAcroFormFilledDraftPreviewInput(args: {
  formId: string;
  approvedPdfUrl: string;
  manifestHash: string;
  patient: ProductionPatient;
  encounter: ProductionEncounter;
  physician: PhysicianContext;
  doctorCompletionValues: Record<string, string>;
  physicianSignatureDataUrl?: string;
  physicianSignedAt?: string;
  correlationId?: string;
}): AcroFormFilledDraftPreviewInput {
  return {
    formId: args.formId,
    approvedPdfUrl: args.approvedPdfUrl,
    manifestHash: args.manifestHash,
    doctorCompletionValues: withAmputationDoctorCompletionValues(
      args.formId,
      args.doctorCompletionValues,
    ),
    patientDisplay: {
      name: args.patient.name,
      mrn: args.patient.mrn,
      dob: normalizePatientDob(args.patient.dateOfBirth),
    },
    physicianContext: {
      name: args.physician.name,
      designation: args.physician.specialty || args.encounter.physicianSpecialty || undefined,
      designationEn: args.physician.specialtyEn || args.encounter.physicianSpecialtyEn || undefined,
      designationAr: args.physician.specialtyAr || args.encounter.physicianSpecialtyAr || undefined,
    },
    encounterReference: {
      id: args.encounter.id,
      encounterId: args.encounter.encounterId,
    },
    physicianSignatureDataUrl: args.physicianSignatureDataUrl,
    physicianSignedAt: args.physicianSignedAt,
    correlationId: args.correlationId,
  };
}
