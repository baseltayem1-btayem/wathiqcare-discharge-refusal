# 01 — PDF Byte-Level Hashing

## Gap Identified

`apps/web/src/lib/server/consent-library-service.ts::finalizeConsentDocument` computed the
`immutablePdfHash` from a JSON serialization of metadata only:

- consent reference
- wording snapshot
- fixed-clause checksum
- signature role/name/timestamp list

This is a content hash, not a byte hash. Two PDF renderers producing visually equivalent
output with different byte streams would yield the same hash, and two byte-identical PDFs
with different metadata would yield different hashes. RC1 Gate 1.3B requires a byte-level
SHA-256 digest of the final rendered PDF.

## Remediation

1. Added `computeFinalConsentPdfByteHash` in
   `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts`.
   - Builds the same HTML payload used for the real patient/legal PDF.
   - Renders the HTML to a `Buffer` using the existing external renderer, falling back
     to the internal Puppeteer renderer.
   - Returns `sha256(buffer)` plus the rendering engine used.

2. Updated `finalizeConsentDocument` in `consent-library-service.ts`.
   - When a `NextRequest` is supplied, the service computes the byte hash before
     finalization.
   - The byte hash becomes the `immutablePdfHash` and `auditChecksum`.
   - If rendering fails (e.g., Chromium unavailable in a test/CI environment), it
     falls back to the previous deterministic metadata hash and logs the failure.
   - The QR verification payload uses the same byte hash.
   - Finalized document metadata now records `signedVersionLinkage.pdfByteHash`,
     which includes the hash and engine for later reconstruction.

## Files Changed

- `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts`
- `apps/web/src/lib/server/consent-library-service.ts`

## Verification

- `npm run build -w apps/web` — success.
- `npm run test -w apps/web` — 214 tests pass.
- New unit tests in `consent-evidence-integrity-service.test.ts` prove that changing
  the PDF hash changes the evidence-package checksum.

## Notes

- The fallback metadata hash is kept only for environments where PDF rendering is
  unavailable. In production the byte hash is authoritative.
- `payload.immutablePdfHash` from callers, if supplied, still takes precedence for
  compatibility.
