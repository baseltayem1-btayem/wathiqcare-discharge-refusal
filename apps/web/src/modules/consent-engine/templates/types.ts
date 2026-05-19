/**
 * Dynamic Consent Template — content-rich schema (preview library).
 *
 * Used by the new content-driven legal-grade consent templates such as
 * `IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT`. Intentionally
 * permissive so individual template files can carry the full
 * legal/medico-legal payload without having to enumerate every field
 * here. The minimum contract is `templateId`; everything else is
 * documented per-template.
 *
 * This type is consumed ONLY by the internal dynamic-consent preview
 * surface. It does NOT replace `DynamicConsentTemplateDefinition`
 * (the existing experimental engine type) and it does NOT affect any
 * production informed-consent workflow.
 */

export interface DynamicConsentTemplate {
  /** Stable, human-readable template identifier (e.g. `IMC-RAD-IMG-CONSENT-001`). */
  templateId: string;
  /** Optional machine code, mirrors `templateId` for legacy lookup. */
  templateCode?: string;
  /** Semver version string. */
  version?: string;
  /** Lifecycle status (e.g. `draft_for_review`). */
  status?: string;
  /** Functional module identifier (e.g. `informed-consents`). */
  module?: string;
  /** Specialty / clinical category. */
  category?: string;
  /** Specialty sub-category. */
  subcategory?: string;
  /** Risk classification (e.g. `high`). */
  riskLevel?: string;
  /** Default rendering language. */
  defaultLanguage?: string;
  /** Permissive bag for everything else (sections, evidence rules,
   *  branding, signatures, etc.). Validated per-template. */
  [key: string]: unknown;
}
