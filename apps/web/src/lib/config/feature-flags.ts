/**
 * Enterprise Feature Flag Configuration
 *
 * All feature flags are read from environment variables with safe defaults.
 * Never hardcode feature availability — gate every enterprise capability here.
 *
 * Pattern:
 *   NEXT_PUBLIC_FF_* → client-visible flags (use sparingly)
 *   FF_*             → server-only flags
 */

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}

// ---------------------------------------------------------------------------
// Signature & External Providers
// ---------------------------------------------------------------------------

/** Enable external PDF-Filler + Taqniat SMS signature orchestration */
export const ENABLE_EXTERNAL_SIGNATURES = envBool(
  "FF_ENABLE_EXTERNAL_SIGNATURES",
  false
);

/** Enable patient-facing secure signing link delivery */
export const ENABLE_SECURE_SIGNING_LINKS = envBool(
  "FF_ENABLE_SECURE_SIGNING_LINKS",
  false
);

/** Enable in-hospital tablet signature capture for informed consents */
export const ENABLE_TABLET_SIGNATURE = envBool("ENABLE_TABLET_SIGNATURE", true);

/** Enable compliance-controlled biometric verification for informed consents */
export const ENABLE_BIOMETRIC_SIGNATURE = envBool("ENABLE_BIOMETRIC_SIGNATURE", false);

// ---------------------------------------------------------------------------
// AI & Knowledge Layer
// ---------------------------------------------------------------------------

/** Enable AI-assisted consent draft generation */
export const ENABLE_AI_ASSIST = envBool("FF_ENABLE_AI_ASSIST", true);

/** Enable clinical AI physician drafting assistant for informed consents */
export const ENABLE_CLINICAL_AI_ASSISTANT = envBool("ENABLE_CLINICAL_AI_ASSISTANT", false);

/** Enable specialty-aware AI prompt engine */
export const ENABLE_SPECIALTY_PROMPTS = envBool(
  "FF_ENABLE_SPECIALTY_PROMPTS",
  true
);

/** Enable RAG/procedure knowledge base retrieval */
export const ENABLE_PROCEDURE_KNOWLEDGE_BASE = envBool(
  "FF_ENABLE_PROCEDURE_KNOWLEDGE_BASE",
  true
);

// ---------------------------------------------------------------------------
// Audit & Evidence
// ---------------------------------------------------------------------------

/** Enable immutable timeline audit events */
export const ENABLE_TIMELINE_AUDIT = envBool("FF_ENABLE_TIMELINE_AUDIT", true);

/** Enable evidentiary evidence package generation on finalize */
export const ENABLE_EVIDENCE_PACKAGES = envBool(
  "FF_ENABLE_EVIDENCE_PACKAGES",
  true
);

/** Enable audit chain cryptographic integrity */
export const ENABLE_AUDIT_CHAIN = envBool("FF_ENABLE_AUDIT_CHAIN", true);

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

/** Enable committee governance review workflow */
export const ENABLE_GOVERNANCE_WORKFLOW = envBool(
  "FF_ENABLE_GOVERNANCE_WORKFLOW",
  true
);

/** Enable prompt registry / wording repository governance */
export const ENABLE_PROMPT_GOVERNANCE = envBool(
  "FF_ENABLE_PROMPT_GOVERNANCE",
  true
);

// ---------------------------------------------------------------------------
// Procedure & Knowledge
// ---------------------------------------------------------------------------

/** Enable procedure library catalog */
export const ENABLE_PROCEDURE_LIBRARY = envBool(
  "FF_ENABLE_PROCEDURE_LIBRARY",
  true
);

/** Enable specialty risk profile engine */
export const ENABLE_RISK_ENGINE = envBool("FF_ENABLE_RISK_ENGINE", true);

// ---------------------------------------------------------------------------
// EMR & Integrations
// ---------------------------------------------------------------------------

/** Enable EMR/TrakCare adapter mapping */
export const ENABLE_EMR_MAPPING = envBool("FF_ENABLE_EMR_MAPPING", false);

/** Enable TrakCare live patient context fetch */
export const ENABLE_TRAKCARE_LIVE = envBool("FF_ENABLE_TRAKCARE_LIVE", false);

/** Enable provider webhook processing (signature, delivery callbacks) */
export const ENABLE_WEBHOOKS = envBool("FF_ENABLE_WEBHOOKS", true);

/** Enable tenant/module usage analytics ingestion and reporting */
export const ENABLE_ANALYTICS = envBool("FF_ENABLE_ANALYTICS", true);

/** Enable tenant/module scoped background jobs */
export const ENABLE_BACKGROUND_JOBS = envBool("FF_ENABLE_BACKGROUND_JOBS", true);

// ---------------------------------------------------------------------------
// PDF & Document Pipeline
// ---------------------------------------------------------------------------

/** Enable QR code embedding in generated PDFs */
export const ENABLE_PDF_QR_CODE = envBool("FF_ENABLE_PDF_QR_CODE", true);

/** Enable evidentiary watermark on PDFs */
export const ENABLE_PDF_WATERMARK = envBool("FF_ENABLE_PDF_WATERMARK", true);

/** Enable bilingual (AR+EN) PDF rendering */
export const ENABLE_BILINGUAL_PDF = envBool("FF_ENABLE_BILINGUAL_PDF", true);

/** Enable the experimental dynamic smart consent engine adapter */
export const ENABLE_DYNAMIC_CONSENT_ENGINE = envBool(
  "ENABLE_DYNAMIC_CONSENT_ENGINE",
  false
);

/** Enable the Content Mapping Engine for procedure → consent form + education material resolution */
export const ENABLE_CONTENT_MAPPING_ENGINE = envBool(
  "FF_ENABLE_CONTENT_MAPPING_ENGINE",
  false
);

// ---------------------------------------------------------------------------
// Legal & Compliance
// ---------------------------------------------------------------------------

/** Enable PDPL / personal data protection notices */
export const ENABLE_PDPL_NOTICES = envBool("FF_ENABLE_PDPL_NOTICES", true);

/** Enable legal hold capability on documents */
export const ENABLE_LEGAL_HOLD = envBool("FF_ENABLE_LEGAL_HOLD", true);

/** Enable retention policy enforcement */
export const ENABLE_RETENTION_POLICY = envBool(
  "FF_ENABLE_RETENTION_POLICY",
  false
);

/** Enable strict subscriber/module service isolation checks */
export const ENABLE_MODULE_SERVICE_ISOLATION = envBool(
  "ENABLE_MODULE_SERVICE_ISOLATION",
  false
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const FEATURE_FLAGS = {
  ENABLE_EXTERNAL_SIGNATURES,
  ENABLE_SECURE_SIGNING_LINKS,
  ENABLE_TABLET_SIGNATURE,
  ENABLE_BIOMETRIC_SIGNATURE,
  ENABLE_AI_ASSIST,
  ENABLE_CLINICAL_AI_ASSISTANT,
  ENABLE_SPECIALTY_PROMPTS,
  ENABLE_PROCEDURE_KNOWLEDGE_BASE,
  ENABLE_TIMELINE_AUDIT,
  ENABLE_EVIDENCE_PACKAGES,
  ENABLE_AUDIT_CHAIN,
  ENABLE_GOVERNANCE_WORKFLOW,
  ENABLE_PROMPT_GOVERNANCE,
  ENABLE_PROCEDURE_LIBRARY,
  ENABLE_RISK_ENGINE,
  ENABLE_EMR_MAPPING,
  ENABLE_TRAKCARE_LIVE,
  ENABLE_WEBHOOKS,
  ENABLE_ANALYTICS,
  ENABLE_BACKGROUND_JOBS,
  ENABLE_PDF_QR_CODE,
  ENABLE_PDF_WATERMARK,
  ENABLE_BILINGUAL_PDF,
  ENABLE_DYNAMIC_CONSENT_ENGINE,
  ENABLE_CONTENT_MAPPING_ENGINE,
  ENABLE_PDPL_NOTICES,
  ENABLE_LEGAL_HOLD,
  ENABLE_RETENTION_POLICY,
  ENABLE_MODULE_SERVICE_ISOLATION,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
