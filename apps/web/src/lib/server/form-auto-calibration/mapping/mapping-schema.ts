/**
 * Zod schemas for agent and deterministic outputs.
 *
 * All agent outputs must validate against these schemas. No free-form output
 * may directly mutate a manifest.
 */

import { z } from "zod";

export const normalizedRectangleSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const layoutAnchorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("LABEL"),
    page: z.number().int().min(1),
    text: z.string(),
    matchedOntologyKey: z.string(),
    confidence: z.number().min(0).max(1),
    language: z.enum(["EN", "AR"]),
  }),
  z.object({
    kind: z.literal("SECTION_HEADING"),
    page: z.number().int().min(1),
    text: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("BLANK_LINE"),
    page: z.number().int().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    xNorm: z.number().min(0).max(1),
    yNorm: z.number().min(0).max(1),
    widthNorm: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("CHECKBOX"),
    page: z.number().int().min(1),
    x: z.number(),
    y: z.number(),
    size: z.number(),
    xNorm: z.number().min(0).max(1),
    yNorm: z.number().min(0).max(1),
    sizeNorm: z.number().min(0).max(1),
    labelText: z.string().optional(),
  }),
  z.object({
    kind: z.literal("SIGNATURE_LINE"),
    page: z.number().int().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    xNorm: z.number().min(0).max(1),
    yNorm: z.number().min(0).max(1),
    widthNorm: z.number().min(0).max(1),
    labelText: z.string().optional(),
  }),
]);

export const anchorRelativeRectangleSchema = z.object({
  page: z.number().int().min(1),
  absolute: normalizedRectangleSchema,
  anchor: layoutAnchorSchema,
  relativeOffsets: z.object({
    deltaX: z.number(),
    deltaY: z.number(),
  }),
  column: z.enum(["LEFT", "RIGHT", "FULL"]).nullable(),
  direction: z.enum(["LTR", "RTL"]),
  maxLines: z.number().int().min(1),
  minFontSize: z.number().min(4).max(72),
  padding: z.object({
    horizontal: z.number().min(0),
    vertical: z.number().min(0),
  }),
  protectedRegions: z.array(normalizedRectangleSchema),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});

export const semanticFieldProposalSchema = z.object({
  ontologyKey: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  requiresHumanConfirmation: z.boolean(),
});

export const anchorProposalSchema = z.object({
  ontologyKey: z.string(),
  anchorKind: z.enum(["LABEL", "SECTION_HEADING", "BLANK_LINE", "CHECKBOX", "SIGNATURE_LINE"]),
  anchorText: z.string(),
  page: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});

export const geometryConstraintProposalSchema = z.object({
  ontologyKey: z.string(),
  page: z.number().int().min(1),
  anchorText: z.string(),
  column: z.enum(["LEFT", "RIGHT", "FULL"]),
  maxLines: z.number().int().min(1),
  minFontSize: z.number().min(4).max(72),
  evidence: z.string(),
});

export const visualQaFindingSchema = z.object({
  severity: z.enum(["INFO", "WARNING", "ERROR"]),
  field: z.string(),
  page: z.number().int().min(1),
  issue: z.string(),
  suggestion: z.string().optional(),
});

export const calibrationCorrectionActionSchema = z.object({
  action: z.enum([
    "MOVE_UP",
    "MOVE_DOWN",
    "MOVE_LEFT",
    "MOVE_RIGHT",
    "SHRINK",
    "EXPAND",
    "CHANGE_ANCHOR",
    "SPLIT_BILINGUAL",
    "REDUCE_MAX_LINES",
    "MARK_UNMAPPED",
    "ESCALATE",
  ]),
  ontologyKey: z.string(),
  amount: z.number().optional(),
  reason: z.string(),
});

export const calibrationCandidateSchema = z.object({
  candidateId: z.string(),
  jobId: z.string(),
  iteration: z.number().int().min(0),
  status: z.enum(["DRAFT", "VALIDATING", "NEEDS_REVIEW", "APPROVED", "REJECTED"]),
  sourceDocumentHash: z.string(),
  layoutFamily: z.string(),
  mappings: z.array(
    z.object({
      ontologyKey: z.string(),
      confidence: z.number().min(0).max(1),
      rectangles: z.array(anchorRelativeRectangleSchema),
      status: z.enum(["MAPPED", "PARTIAL", "UNMAPPED"]),
      evidence: z.string(),
    }),
  ),
  qualityReportId: z.string().optional(),
});

export const calibrationQualityReportSchema = z.object({
  reportId: z.string(),
  candidateId: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["AUTO_REVIEW_CANDIDATE", "ASSISTED_REVIEW", "MANUAL_CALIBRATION_REQUIRED"]),
  findings: z.array(
    z.object({
      check: z.string(),
      passed: z.boolean(),
      message: z.string(),
    }),
  ),
});

export type NormalizedRectangle = z.infer<typeof normalizedRectangleSchema>;
export type LayoutAnchor = z.infer<typeof layoutAnchorSchema>;
export type AnchorRelativeRectangle = z.infer<typeof anchorRelativeRectangleSchema>;
export type SemanticFieldProposal = z.infer<typeof semanticFieldProposalSchema>;
export type AnchorProposal = z.infer<typeof anchorProposalSchema>;
export type GeometryConstraintProposal = z.infer<typeof geometryConstraintProposalSchema>;
export type VisualQaFinding = z.infer<typeof visualQaFindingSchema>;
export type CalibrationCorrectionAction = z.infer<typeof calibrationCorrectionActionSchema>;
export type CalibrationCandidate = z.infer<typeof calibrationCandidateSchema>;
export type CalibrationQualityReport = z.infer<typeof calibrationQualityReportSchema>;
