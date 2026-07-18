/**
 * Ontology alias helpers.
 *
 * Provides efficient matching between detected PDF text and canonical ontology
 * keys using English and Arabic aliases. Matching is deterministic, normalised,
 * and never relies on AI for the rule-based path.
 */

import { CONSENT_FIELD_ONTOLOGY, type ConsentOntologyField } from "./consent-field-ontology";

export type OntologyAliasMatch = {
  field: ConsentOntologyField;
  matchedAlias: string;
  matchedLanguage: "EN" | "AR";
  score: number;
};

function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u0640]/g, "") // remove Arabic tatweel
    .replace(/[\u060c\u061b\u061f]/g, " ") // Arabic punctuation
    .replace(/[\u064b-\u065f]/g, "") // Arabic diacritics
    .replace(/[()\[\]{}:;,.\/\\|\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAliasIndex(): Map<string, OntologyAliasMatch[]> {
  const index = new Map<string, OntologyAliasMatch[]>();

  for (const field of CONSENT_FIELD_ONTOLOGY) {
    const enAliases = [field.labelEn, ...field.aliasesEn].filter(Boolean);
    const arAliases = [field.labelAr, ...field.aliasesAr].filter(Boolean);

    for (const alias of enAliases) {
      const normalized = normalizeForMatching(alias);
      if (!normalized) continue;
      const list = index.get(normalized) ?? [];
      list.push({ field, matchedAlias: alias, matchedLanguage: "EN", score: 1.0 });
      index.set(normalized, list);
    }

    for (const alias of arAliases) {
      const normalized = normalizeForMatching(alias);
      if (!normalized) continue;
      const list = index.get(normalized) ?? [];
      list.push({ field, matchedAlias: alias, matchedLanguage: "AR", score: 1.0 });
      index.set(normalized, list);
    }
  }

  return index;
}

const ALIAS_INDEX = buildAliasIndex();

export function findExactAliasMatches(text: string): OntologyAliasMatch[] {
  const normalized = normalizeForMatching(text);
  if (!normalized) return [];
  return ALIAS_INDEX.get(normalized) ?? [];
}

export function findPartialAliasMatches(text: string, minWords = 2): OntologyAliasMatch[] {
  const normalized = normalizeForMatching(text);
  if (!normalized) return [];

  const words = normalized.split(/\s+/);
  if (words.length < minWords) return [];

  const matches: OntologyAliasMatch[] = [];
  const seen = new Set<string>();

  // Try contiguous word n-grams from longest to shortest.
  for (let length = Math.min(words.length, 6); length >= minWords; length -= 1) {
    for (let start = 0; start <= words.length - length; start += 1) {
      const ngram = words.slice(start, start + length).join(" ");
      const candidates = ALIAS_INDEX.get(ngram);
      if (!candidates) continue;

      for (const candidate of candidates) {
        const key = `${candidate.field.key}:${candidate.matchedLanguage}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({
          ...candidate,
          score: length / Math.max(words.length, candidate.matchedAlias.split(/\s+/).length),
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function findOntologyMatches(text: string): OntologyAliasMatch[] {
  const exact = findExactAliasMatches(text);
  if (exact.length > 0) return exact;
  return findPartialAliasMatches(text);
}

const FAMILY_REQUIRED_KEY_OVERRIDES: Record<string, string[]> = {};

export function getCandidateOntologyKeysForFamily(family: string): string[] {
  // Future expansion: per-family required-key sets.
  const overrides = FAMILY_REQUIRED_KEY_OVERRIDES[family];
  if (overrides && overrides.length > 0) {
    return overrides;
  }
  return CONSENT_FIELD_ONTOLOGY
    .filter((f) => f.requiredness !== "NEVER")
    .map((f) => f.key);
}
