/**
 * Guardrails for agentic outputs.
 *
 * Validates that LLM responses are safe JSON, contain only expected keys,
 * reference real field names, and do not mutate protected ontology fields.
 */

export type GuardrailResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function safeJsonParse<T>(text: string): GuardrailResult<T> {
  try {
    // Strip markdown fences if present.
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    return { ok: true, data: JSON.parse(cleaned) as T };
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${(err as Error).message}` };
  }
}

export function validateAgentMatches(
  response: unknown,
  allowedFieldNames: Set<string>,
  allowedOntologyKeys: Set<string>,
): GuardrailResult<{ ontologyKey: string; fieldName: string; reason: string; confidence: number }[]> {
  if (!response || typeof response !== "object") {
    return { ok: false, error: "Response is not an object" };
  }

  const obj = response as Record<string, unknown>;
  const matches = obj.matches;
  if (!Array.isArray(matches)) {
    return { ok: false, error: "Missing matches array" };
  }

  const validated: { ontologyKey: string; fieldName: string; reason: string; confidence: number }[] = [];
  for (const m of matches) {
    if (!m || typeof m !== "object") continue;
    const { ontologyKey, fieldName, reason, confidence } = m as Record<string, unknown>;
    if (typeof ontologyKey !== "string" || typeof fieldName !== "string") continue;
    if (!allowedOntologyKeys.has(ontologyKey)) {
      return { ok: false, error: `Disallowed ontologyKey: ${ontologyKey}` };
    }
    if (!allowedFieldNames.has(fieldName)) {
      return { ok: false, error: `Disallowed fieldName: ${fieldName}` };
    }
    validated.push({
      ontologyKey,
      fieldName,
      reason: typeof reason === "string" ? reason : "",
      confidence: typeof confidence === "number" && !isNaN(confidence)
        ? Math.max(0, Math.min(1, confidence))
        : 0.5,
    });
  }

  return { ok: true, data: validated };
}

export function validateAgentReview(
  response: unknown,
): GuardrailResult<{ ontologyKey: string; severity: "error" | "warning" | "info"; message: string }[]> {
  if (!response || typeof response !== "object") {
    return { ok: false, error: "Response is not an object" };
  }

  const obj = response as Record<string, unknown>;
  const review = obj.review;
  if (!Array.isArray(review)) {
    return { ok: false, error: "Missing review array" };
  }

  const allowedSeverities = new Set(["error", "warning", "info"]);
  const validated: { ontologyKey: string; severity: "error" | "warning" | "info"; message: string }[] = [];
  for (const r of review) {
    if (!r || typeof r !== "object") continue;
    const { ontologyKey, severity, message } = r as Record<string, unknown>;
    if (typeof ontologyKey !== "string" || typeof message !== "string") continue;
    if (!allowedSeverities.has(String(severity))) continue;
    validated.push({
      ontologyKey,
      severity: severity as "error" | "warning" | "info",
      message,
    });
  }

  return { ok: true, data: validated };
}
