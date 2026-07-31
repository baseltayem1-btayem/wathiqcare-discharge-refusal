import { readFileSync, writeFileSync } from "fs";

const manifestPath = "./src/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

/**
 * Semantic overrides for IMC MR 1135 fields.
 * These reflect the WathiqCare data model and readiness rules.
 */
const overrides = {
  patient_name: { role: "SYSTEM", language: "BILINGUAL", required: false, applicabilityRule: "always", renderingStrategy: "TEXT" },
  mrn: { role: "SYSTEM", language: "BILINGUAL", required: false, applicabilityRule: "always", renderingStrategy: "TEXT" },
  date_of_birth: { role: "SYSTEM", language: "BILINGUAL", required: false, applicabilityRule: "always", renderingStrategy: "TEXT" },

  interpreter_required_yes: { semanticKey: "interpreter_required", role: "INTERPRETER", language: "BILINGUAL", required: false, applicabilityRule: "interpreter_decision_required", renderingStrategy: "CHECKBOX_MARK" },
  interpreter_required_no: { semanticKey: "interpreter_required_no", role: "INTERPRETER", language: "BILINGUAL", required: false, applicabilityRule: "interpreter_decision_required", renderingStrategy: "CHECKBOX_MARK" },
  interpreter_present_yes: { semanticKey: "interpreter_present", role: "INTERPRETER", language: "BILINGUAL", required: false, applicabilityRule: "interpreter_decision_required", renderingStrategy: "CHECKBOX_MARK" },
  interpreter_present_no: { semanticKey: "interpreter_present_no", role: "INTERPRETER", language: "BILINGUAL", required: false, applicabilityRule: "interpreter_decision_required", renderingStrategy: "CHECKBOX_MARK" },

  condition_description_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  condition_description_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  proposed_procedure_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  proposed_procedure_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  significant_risks_options_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  significant_risks_options_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  significant_risks_options_cont_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  significant_risks_options_cont_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  risks_without_procedure_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  risks_without_procedure_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  anaesthetic_discussed_en: { role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  anaesthetic_discussed_ar: { role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },

  info_sheet_anaesthetic: { semanticKey: "education_anaesthetic_sheet_provided", role: "READ_ONLY", language: "BILINGUAL", required: false, applicabilityRule: "education_decision_driven", renderingStrategy: "CHECKBOX_MARK" },
  info_sheet_epidural_spinal: { semanticKey: "education_epidural_spinal_sheet_provided", role: "READ_ONLY", language: "BILINGUAL", required: false, applicabilityRule: "education_decision_driven", renderingStrategy: "CHECKBOX_MARK" },
  info_sheet_amputation: { semanticKey: "education_amputation_sheet_provided", role: "READ_ONLY", language: "BILINGUAL", required: false, applicabilityRule: "education_decision_driven", renderingStrategy: "CHECKBOX_MARK" },

  consent_patient_name: { semanticKey: "consent_patient_name", role: "PATIENT", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  patient_signature_en: { semanticKey: "patient_signature", role: "PATIENT", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "SIGNATURE_IMAGE" },
  patient_signature_ar: { semanticKey: "patient_signature", role: "PATIENT", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "SIGNATURE_IMAGE" },
  consent_date: { role: "SYSTEM", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "DATE" },
  consent_time: { role: "SYSTEM", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "TIME" },

  substitute_name: { semanticKey: "substitute_name", role: "SUBSTITUTE", language: "BILINGUAL", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "TEXT" },
  substitute_signature_en: { semanticKey: "substitute_signature", role: "SUBSTITUTE", language: "EN", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "SIGNATURE_IMAGE" },
  substitute_signature_ar: { semanticKey: "substitute_signature", role: "SUBSTITUTE", language: "AR", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "SIGNATURE_IMAGE" },
  substitute_relationship: { semanticKey: "substitute_relationship", role: "SUBSTITUTE", language: "BILINGUAL", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "TEXT" },
  substitute_date: { semanticKey: "substitute_date", role: "SUBSTITUTE", language: "BILINGUAL", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "DATE" },
  substitute_time: { semanticKey: "substitute_time", role: "SUBSTITUTE", language: "BILINGUAL", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "TIME" },
  substitute_contact: { semanticKey: "substitute_contact", role: "SUBSTITUTE", language: "BILINGUAL", required: false, applicabilityRule: "substitute_decision_required", renderingStrategy: "TEXT" },

  doctor_delegate_name: { semanticKey: "physician_name", role: "PHYSICIAN", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  doctor_delegate_designation: { semanticKey: "physician_designation", role: "PHYSICIAN", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "TEXT" },
  doctor_delegate_signature_en: { semanticKey: "physician_signature", role: "PHYSICIAN", language: "EN", required: true, applicabilityRule: "always", renderingStrategy: "SIGNATURE_IMAGE" },
  doctor_delegate_signature_ar: { semanticKey: "physician_signature", role: "PHYSICIAN", language: "AR", required: true, applicabilityRule: "always", renderingStrategy: "SIGNATURE_IMAGE" },
  doctor_delegate_date: { semanticKey: "physician_signed_date", role: "SYSTEM", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "DATE" },
  doctor_delegate_time: { semanticKey: "physician_signed_time", role: "SYSTEM", language: "BILINGUAL", required: true, applicabilityRule: "always", renderingStrategy: "TIME" },
};

// Witness fields
for (let i = 1; i <= 2; i++) {
  overrides[`witness${i}_name_en`] = { semanticKey: `witness${i}_name`, role: "WITNESS", language: "EN", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "TEXT" };
  overrides[`witness${i}_name_ar`] = { semanticKey: `witness${i}_name`, role: "WITNESS", language: "AR", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "TEXT" };
  overrides[`witness${i}_signature_en`] = { semanticKey: `witness${i}_signature`, role: "WITNESS", language: "EN", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "SIGNATURE_IMAGE" };
  overrides[`witness${i}_signature_ar`] = { semanticKey: `witness${i}_signature`, role: "WITNESS", language: "AR", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "SIGNATURE_IMAGE" };
  overrides[`witness${i}_date_en`] = { semanticKey: `witness${i}_date`, role: "WITNESS", language: "EN", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "DATE" };
  overrides[`witness${i}_date_ar`] = { semanticKey: `witness${i}_date`, role: "WITNESS", language: "AR", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "DATE" };
  overrides[`witness${i}_time_en`] = { semanticKey: `witness${i}_time`, role: "WITNESS", language: "EN", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "TIME" };
  overrides[`witness${i}_time_ar`] = { semanticKey: `witness${i}_time`, role: "WITNESS", language: "AR", required: false, applicabilityRule: "conditional_witness_policy", renderingStrategy: "TIME" };
}

for (const field of manifest.fields) {
  const override = overrides[field.name];
  if (override) {
    Object.assign(field, override);
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("Semantic mapping applied to", manifestPath);
