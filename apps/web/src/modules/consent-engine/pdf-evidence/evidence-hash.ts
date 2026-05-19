/**
 * Legal Evidence PDF Pipeline — Hashing
 *
 * Node `crypto` only (no browser crypto). Deterministic JSON serialization
 * (sorted keys, no undefined). Pure functions; no side effects on import.
 */

import { createHash } from "node:crypto";

/**
 * Canonicalize an arbitrary JSON-serializable value into a deterministic
 * string by sorting object keys recursively and stripping `undefined`.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort()
      .forEach((key) => {
        out[key] = canonicalize(obj[key]);
      });
    return out;
  }
  return value;
}

/**
 * Returns a hex-encoded SHA-256 digest for the given UTF-8 string.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Returns a hex-encoded SHA-256 digest for the canonical JSON form
 * of the given value.
 */
export function hashJson(value: unknown): string {
  return sha256Hex(canonicalJsonStringify(value));
}

/**
 * Generates a stable evidence identifier from input hashes.
 * Format: `EV-<14 hex chars>`
 */
export function deriveEvidenceId(...parts: string[]): string {
  const combined = parts.filter(Boolean).join("|");
  return `EV-${sha256Hex(combined).slice(0, 14).toUpperCase()}`;
}
