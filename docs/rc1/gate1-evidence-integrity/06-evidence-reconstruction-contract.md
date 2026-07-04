# 06 — Evidence Reconstruction Contract

## Gap Identified

There was no runtime contract that allowed an auditor or legal reviewer to:

- Rebuild the canonical evidence-package payload from persisted records.
- Recompute the package checksum and compare it with the stored value.
- Verify that PDF hash, signature hashes, version linkage, and OTP linkage are
  present and consistent.

## Remediation

Added `apps/web/src/lib/server/consent-evidence-integrity-service.ts` with a
reconstruction contract:

1. `buildEvidenceIntegritySnapshot(doc)`
   - Accepts a fully loaded consent document with signatures, audit events,
     timeline events, and template/template-version.
   - Builds a deterministic JSON object that mirrors the immutable evidence
     package payload:
     - final PDF URL and byte hash
     - wording snapshot
     - template/version snapshot
     - signed version linkage
     - patient and encounter context
     - physician snapshot
     - signatures with `id` and `signatureHash`
     - audit/timeline event ID lists and timeline body
     - OTP event IDs
     - QR verification data
     - evidence package V2 summaries
   - Ordering is fixed by the implementation, so independent re-computation yields
     the same SHA-256 digest.

2. `computeEvidencePackageChecksum(snapshot)`
   - Returns `sha256(JSON.stringify(snapshot))`.

3. `verifyConsentEvidenceIntegrity(auth, documentId)`
   - Loads the document from the database with all required relations.
   - Recomputes the package checksum from persisted records.
   - Compares it to `metadata.evidenceVault.checksumSha256`.
   - Runs a checklist:
     - document is finalized
     - PDF hash is present
     - signed version linkage is present
     - every signature has a `signatureHash`
     - recomputed package hash matches stored hash
     - at least one OTP event is linkable
   - Returns an `EvidenceIntegrityReport` with per-check status.

## Files Changed

- `apps/web/src/lib/server/consent-evidence-integrity-service.ts`
- `apps/web/src/lib/server/consent-evidence-integrity-service.test.ts`

## Verification

- `npm run test -w apps/web` — 214 tests pass, including 5 new tests for:
  - snapshot includes signature hashes and version linkage
  - checksum determinism
  - sensitivity to signature-hash tampering
  - sensitivity to PDF-hash tampering
  - sensitivity to version-linkage tampering

## Notes

- The reconstruction contract is additive; it does not modify stored evidence
  packages. Existing packages can be verified if the persisted relations are
  intact.
- The function requires the same tenant context used during creation, preserving
  tenant isolation.
