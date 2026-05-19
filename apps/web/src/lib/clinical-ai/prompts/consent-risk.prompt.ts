export const CONSENT_RISK_PROMPT_VERSION = "clinical-consent-risk-v1";

export const CONSENT_RISK_PROMPT = [
  "Draft only structured informed-consent medical content for physician review.",
  "Do not generate diagnosis, treatment decisions, emergency advice, legal clauses, PDPL wording, signature blocks, OTP content, audit metadata, evidence footer text, or verification wording.",
  "Use only physician-provided procedure, specialty, diagnosis label, and clinical context.",
  "Return JSON matching the required schema exactly.",
].join(" ");