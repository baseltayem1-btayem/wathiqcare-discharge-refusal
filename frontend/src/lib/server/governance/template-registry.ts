export type TemplateSeed = {
  code: string;
  name: string;
  category: string;
  formNumber: string;
};

export const GOVERNANCE_TEMPLATE_SEEDS: TemplateSeed[] = [
  { code: "GENERAL_TREATMENT", name: "General Treatment Consent", category: "consent", formNumber: "IMC-GTC-001" },
  { code: "ADMISSION", name: "Admission Consent", category: "consent", formNumber: "IMC-ADM-001" },
  { code: "SURGERY_INVASIVE", name: "Surgery / Invasive Procedure Consent", category: "consent", formNumber: "IMC-SRG-001" },
  { code: "SEDATION_ANESTHESIA", name: "Sedation / Anesthesia Consent", category: "consent", formNumber: "IMC-ANS-001" },
  { code: "BLOOD_TRANSFUSION", name: "Blood / Blood Product Transfusion Consent", category: "consent", formNumber: "IMC-BLD-001" },
  { code: "SPECIAL_PROCEDURE", name: "Special Procedure Consent", category: "consent", formNumber: "IMC-SPC-001" },
  { code: "HOME_HEALTHCARE", name: "Home Health Care Consent", category: "agreement", formNumber: "IMC-HHC-001" },
  { code: "ROI_AUTH", name: "Release of Information Authorization", category: "authorization", formNumber: "IMC-ROI-001" },
  { code: "POST_DISCHARGE_REFUSAL_LINK", name: "Refusal / Liability / Post-discharge Agreements", category: "link-only", formNumber: "IMC-DRL-001" },
];
