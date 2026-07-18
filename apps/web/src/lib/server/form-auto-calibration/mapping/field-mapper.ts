/**
 * Simple field-name to ontology matcher.
 *
 * Wraps the deterministic ontology alias index so callers can score a PDF field
 * name or label against a canonical ontology key.
 */

import { findOntologyMatches, findExactAliasMatches } from "../ontology/ontology-aliases";

export function matchFieldName(fieldName: string, label?: string): number {
  const text = [fieldName, label].filter(Boolean).join(" ");
  const exact = findExactAliasMatches(text);
  if (exact.length > 0) return 1.0;

  const partial = findOntologyMatches(text);
  return partial.length > 0 ? partial[0].score : 0;
}

export function matchFieldNameToKey(fieldName: string, label?: string): string | null {
  const text = [fieldName, label].filter(Boolean).join(" ");
  const matches = findOntologyMatches(text);
  return matches.length > 0 ? matches[0].field.key : null;
}
