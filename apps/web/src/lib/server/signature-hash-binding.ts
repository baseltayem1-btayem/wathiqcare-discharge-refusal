import { computeFixedClauseChecksum } from "@/lib/server/consent-library-service";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function resolveTrustedDocumentHash(
  document: {
    immutablePdfHash?: string | null;
    auditChecksum?: string | null;
  } & Record<string, unknown>,
): string {
  return (
    document.immutablePdfHash
    || document.auditChecksum
    || computeFixedClauseChecksum(document)
  );
}

/**
 * Determine whether a captured signature is bound to an outdated document hash.
 * Signatures that were captured before hash-binding was introduced (no
 * documentHash in metadata) are accepted so existing finalized documents keep
 * working. When a hash is present, it must match the current trusted hash.
 */
export function isSignatureHashStale(
  signature: { metadata: unknown },
  document: {
    immutablePdfHash?: string | null;
    auditChecksum?: string | null;
  } & Record<string, unknown>,
): boolean {
  const metadata = asRecord(signature.metadata);
  if (!metadata) return false;

  const storedHash = typeof metadata.documentHash === "string" ? metadata.documentHash : "";
  if (!storedHash) {
    // Legacy signature without a recorded hash: accept (do not fail closed).
    return false;
  }

  return storedHash !== resolveTrustedDocumentHash(document);
}
