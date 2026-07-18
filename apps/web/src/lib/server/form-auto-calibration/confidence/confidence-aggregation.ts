/**
 * Confidence aggregation.
 *
 * Combines deterministic + agentic signals into a per-field and per-candidate
 * confidence score. Scores are conservative by default; errors reduce confidence.
 */

export type FieldConfidence = {
  key: string;
  deterministic: number; // 0..1
  agentic: number; // 0..1
  final: number; // 0..1
  signals: Array<{ source: string; score: number; reason: string }>;
};

export type CandidateConfidence = {
  candidateId: string;
  overall: number;
  byField: FieldConfidence[];
  weakestFields: string[];
};

const DEFAULT_AGENTIC = 0.5;

export function aggregateFieldConfidence(
  key: string,
  deterministicScore: number,
  agenticScore?: number,
  signals: FieldConfidence["signals"] = [],
): FieldConfidence {
  const agentic = agenticScore ?? DEFAULT_AGENTIC;
  // Weight deterministic more heavily to keep scores conservative.
  const final = Math.max(0, Math.min(1, deterministicScore * 0.7 + agentic * 0.3));
  return {
    key,
    deterministic: Math.max(0, Math.min(1, deterministicScore)),
    agentic: Math.max(0, Math.min(1, agentic)),
    final,
    signals,
  };
}

export function aggregateCandidateConfidence(
  candidateId: string,
  fieldConfidences: FieldConfidence[],
): CandidateConfidence {
  const overall =
    fieldConfidences.length === 0
      ? 0
      : fieldConfidences.reduce((sum, f) => sum + f.final, 0) / fieldConfidences.length;

  const sorted = [...fieldConfidences].sort((a, b) => a.final - b.final);
  const weakestFields = sorted.slice(0, Math.min(5, sorted.length)).map((f) => f.key);

  return {
    candidateId,
    overall: Math.round(overall * 1000) / 1000,
    byField: fieldConfidences,
    weakestFields,
  };
}
