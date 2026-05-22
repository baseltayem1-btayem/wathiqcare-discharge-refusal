/**
 * AI Core — Enterprise AI Generation Service
 *
 * Centralized AI orchestration for ALL platform modules.
 * Enforces: never-auto-finalize, physician-approval-required,
 * prompt versioning, specialty context, metadata tagging.
 *
 * Do NOT call OpenAI directly from module services.
 * All AI generation flows through this core.
 */

import { AI_CONFIG, LEGAL_CONFIG } from "@/lib/config/platform-config";
import { ENABLE_AI_ASSIST } from "@/lib/config/feature-flags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiGenerationStatus =
  | "draft"         // AI produced a draft — not yet physician-reviewed
  | "reviewed"      // Physician has reviewed
  | "approved"      // Physician approved
  | "rejected";     // Physician rejected; must be regenerated or rewritten

export interface AiGenerationContext {
  specialty?: string;
  procedureName?: string;
  procedureCode?: string;
  patientAge?: number;
  patientGender?: "M" | "F";
  diagnosisCode?: string;
  diagnosisFreeText?: string;
  consentType?: string;
  existingContent?: string;
  language?: "ar" | "en" | "bilingual";
}

export interface AiGenerationRequest {
  /** Which prompt registry key to use (looked up dynamically) */
  promptKey: string;
  /** Specialty for prompt selection */
  specialty?: string;
  /** Free-form context injected into the prompt */
  context: AiGenerationContext;
  /** Override system prompt (governance-approved text only) */
  systemPromptOverride?: string;
  /** Override model (feature-flagged) */
  modelOverride?: string;
  /** Tenant ID for prompt scoping */
  tenantId: string;
  /** Actor ID for audit */
  actorId: string;
}

export interface AiGenerationResult {
  /** Generated content */
  content: string;
  /** Arabic translation if bilingual */
  contentAr?: string;
  /** Which model produced this output */
  model: string;
  /** Prompt version used */
  promptVersion: string;
  /** Timestamp of generation */
  generatedAt: string;
  /** Always pending — never auto-approve */
  status: "draft";
  /** Required disclaimer to display to physician */
  disclaimer: string;
  /** Disclaimer in Arabic */
  disclaimerAr: string;
  /** Specialty used */
  specialty?: string;
}

export interface AiGenerationMetadata {
  model: string;
  promptVersion: string;
  generatedAt: string;
  specialty?: string;
  status: AiGenerationStatus;
}

// ---------------------------------------------------------------------------
// Prompt Building
// ---------------------------------------------------------------------------

/**
 * Build a full system prompt for consent draft generation.
 * Uses governance-approved preamble + specialty context.
 */
export function buildConsentSystemPrompt(specialty?: string): string {
  const specialtyContext = specialty
    ? `You are specializing in ${specialty} medico-legal consent documentation.`
    : "You are a general medico-legal consent drafting assistant.";

  return [
    AI_CONFIG.systemPrefix,
    specialtyContext,
    "Structure your output as clear sections: Introduction, Procedure Description, Risks, Alternatives, Refusal Consequences, Patient Declaration.",
    "Use bilingual output only when explicitly requested. Arabic text must use formal Modern Standard Arabic.",
    "Do not fabricate medical facts. If uncertain, use placeholder markers like [PHYSICIAN_TO_REVIEW].",
    `Jurisdiction: ${LEGAL_CONFIG.jurisdiction}.`,
    LEGAL_CONFIG.disclaimerEn,
  ].join(" ");
}

/**
 * Inject patient/procedure context into a prompt template.
 * Template variables: {{SPECIALTY}}, {{PROCEDURE}}, {{PATIENT_AGE}}, etc.
 */
export function interpolatePromptTemplate(
  template: string,
  ctx: AiGenerationContext
): string {
  return template
    .replace(/\{\{SPECIALTY\}\}/g, ctx.specialty ?? "General")
    .replace(/\{\{PROCEDURE\}\}/g, ctx.procedureName ?? "procedure")
    .replace(/\{\{PROCEDURE_CODE\}\}/g, ctx.procedureCode ?? "")
    .replace(/\{\{PATIENT_AGE\}\}/g, String(ctx.patientAge ?? ""))
    .replace(/\{\{PATIENT_GENDER\}\}/g, ctx.patientGender ?? "")
    .replace(/\{\{DIAGNOSIS\}\}/g, ctx.diagnosisFreeText ?? ctx.diagnosisCode ?? "")
    .replace(/\{\{CONSENT_TYPE\}\}/g, ctx.consentType ?? "informed consent")
    .replace(/\{\{EXISTING_CONTENT\}\}/g, ctx.existingContent ?? "");
}

// ---------------------------------------------------------------------------
// Generation Guard
// ---------------------------------------------------------------------------

/**
 * Check whether AI assist is available.
 * Returns a typed error if disabled so callers can surface a user-friendly message.
 */
export function assertAiEnabled(): void {
  if (!ENABLE_AI_ASSIST) {
    throw new AiDisabledError("AI assist is disabled by feature flag FF_ENABLE_AI_ASSIST.");
  }
}

export class AiDisabledError extends Error {
  readonly code = "AI_DISABLED" as const;
  constructor(message: string) {
    super(message);
    this.name = "AiDisabledError";
  }
}

export class AiGenerationError extends Error {
  readonly code = "AI_GENERATION_FAILED" as const;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AiGenerationError";
  }
}

// ---------------------------------------------------------------------------
// Result Wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap raw AI output in a standardized result envelope.
 * Always marks status as "draft" — never approved.
 */
export function wrapAiResult(
  content: string,
  model: string,
  promptVersion: string,
  specialty?: string,
  contentAr?: string
): AiGenerationResult {
  return {
    content,
    contentAr,
    model,
    promptVersion,
    generatedAt: new Date().toISOString(),
    status: "draft",
    disclaimer: AI_CONFIG.generatedLabel,
    disclaimerAr: AI_CONFIG.generatedLabelAr,
    specialty,
  };
}

/**
 * Extract AI metadata from a result for storage in document fields.
 */
export function extractAiMetadata(result: AiGenerationResult): AiGenerationMetadata {
  return {
    model: result.model,
    promptVersion: result.promptVersion,
    generatedAt: result.generatedAt,
    specialty: result.specialty,
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// Specialty → Prompt Key Mapping
// ---------------------------------------------------------------------------

const SPECIALTY_PROMPT_MAP: Record<string, string> = {
  Surgery: "consent.surgery.general",
  ENT: "consent.ent.general",
  Gastroenterology: "consent.gastroenterology.general",
  Cardiology: "consent.cardiology.general",
  Orthopedics: "consent.orthopedics.general",
  Oncology: "consent.oncology.general",
  ICU: "consent.icu.general",
  Radiology: "consent.radiology.general",
  OBGYN: "consent.obgyn.general",
  Pediatrics: "consent.pediatrics.general",
  Dental: "consent.dental.general",
  Anesthesia: "consent.anesthesia.general",
  "Emergency Medicine": "consent.emergency.general",
};

export function resolveSpecialtyPromptKey(specialty: string): string {
  return SPECIALTY_PROMPT_MAP[specialty] ?? "consent.general";
}

export const ALL_SUPPORTED_SPECIALTIES = Object.keys(SPECIALTY_PROMPT_MAP);

// ---------------------------------------------------------------------------
// Wording Repository Integration
// ---------------------------------------------------------------------------

/**
 * CRITICAL: Validate that AI-generated content does NOT modify fixed legal clauses.
 * 
 * AI can ONLY populate designated DYNAMIC FIELDS:
 * - diagnosis
 * - procedureName
 * - expectedBenefits
 * - commonRisks
 * - uncommonRisks
 * - seriousRisks
 * - treatmentAlternatives
 * - refusalRisks
 * - postCareInstructions
 * - physicianNotes
 * - medicationsUsed
 * - procedureSite
 * - procedureOrgan
 * 
 * AI MUST NEVER attempt to modify:
 * - Fixed legal clauses (core consent, physician certification, no guarantee, etc.)
 * - System-populated fields (physicianName, consentDateTime, license number)
 * - Bilingual structure or language templates
 * 
 * Violations result in rejection of the entire AI output.
 */
export interface AiDynamicFieldsOutput {
  diagnosis?: string;
  procedureName?: string;
  expectedBenefits?: string;
  commonRisks?: string;
  uncommonRisks?: string;
  seriousRisks?: string;
  treatmentAlternatives?: string;
  refusalRisks?: string;
  postCareInstructions?: string;
  physicianNotes?: string;
  medicationsUsed?: string[];
  procedureSite?: string;
  procedureOrgan?: string;
}

/**
 * Validate that AI output respects the wording repository's fixed legal clauses.
 * Throws AiLegalClauseViolationError if AI attempts to modify fixed text.
 * 
 * @throws AiLegalClauseViolationError if fixed clauses are modified
 */
export function validateAiOutputAgainstWordingRepository(
  aiContent: AiDynamicFieldsOutput
): void {
  const allowedDynamicFields = [
    'diagnosis',
    'procedureName',
    'expectedBenefits',
    'commonRisks',
    'uncommonRisks',
    'seriousRisks',
    'treatmentAlternatives',
    'refusalRisks',
    'postCareInstructions',
    'physicianNotes',
    'medicationsUsed',
    'procedureSite',
    'procedureOrgan',
  ];

  // Check for any fields that are NOT in the allowed list
  const prohibited = Object.keys(aiContent).filter(
    (fieldKey) => !allowedDynamicFields.includes(fieldKey)
  );

  if (prohibited.length > 0) {
    throw new AiLegalClauseViolationError(
      `AI attempted to populate prohibited fields: ${prohibited.join(', ')}. ` +
      `AI can only populate designated dynamic fields. ` +
      `Fixed legal clauses are protected and cannot be modified by AI.`
    );
  }
}

export class AiLegalClauseViolationError extends Error {
  readonly code = "AI_LEGAL_CLAUSE_VIOLATION" as const;
  constructor(message: string) {
    super(message);
    this.name = "AiLegalClauseViolationError";
  }
}
