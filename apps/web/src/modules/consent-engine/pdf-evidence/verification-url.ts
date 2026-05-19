/**
 * Legal Evidence PDF Pipeline — Verification URL generator
 *
 * NOTE: The public verification page does NOT exist yet. This module
 * only generates the canonical URL pattern that a future verification
 * portal will resolve.
 */

const DEFAULT_VERIFICATION_BASE = "https://wathiqcare.online";

/**
 * Build the canonical verification URL for an evidence identifier.
 *
 * Pattern: `https://wathiqcare.online/verify/{evidenceId}`
 */
export function buildVerificationUrl(
  evidenceId: string,
  options?: { baseUrl?: string },
): string {
  const base = (options?.baseUrl ?? DEFAULT_VERIFICATION_BASE).replace(/\/+$/, "");
  const safeId = encodeURIComponent(evidenceId);
  return `${base}/verify/${safeId}`;
}
