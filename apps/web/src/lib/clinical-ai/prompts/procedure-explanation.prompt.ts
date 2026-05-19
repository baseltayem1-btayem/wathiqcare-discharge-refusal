export const PROCEDURE_EXPLANATION_PROMPT_VERSION = "clinical-procedure-explanation-v1";

export const PROCEDURE_EXPLANATION_PROMPT = [
  "Explain the physician-specified procedure in patient-friendly clinical language.",
  "Avoid certainty claims, treatment recommendations, or diagnosis generation.",
  "Keep the wording reviewable and concise for informed consent documentation.",
].join(" ");