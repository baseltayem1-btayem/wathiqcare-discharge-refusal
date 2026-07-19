function isValueTrue(value: string | undefined): boolean {
  return value === "true";
}

function isValueFalse(value: string | undefined): boolean {
  return value === "false";
}

/**
 * Client-side mirror of the server readiness requiredWhen evaluator.
 * Supported patterns:
 * - "anesthesia_applies === true"
 * - "anesthesia_applies === false"
 *
 * Returns true when no expression is supplied (unconditional field).
 */
export function evaluateRequiredWhen(
  expression: string | undefined,
  values: Record<string, string>,
): boolean {
  if (!expression) return true;
  const normalized = expression.trim();
  const match = normalized.match(/^([a-zA-Z0-9_]+)\s*===\s*(true|false)$/);
  if (!match) return true;
  const [, key, expected] = match;
  const actual = values[key];
  if (expected === "true") return isValueTrue(actual);
  if (expected === "false") return isValueFalse(actual);
  return true;
}
