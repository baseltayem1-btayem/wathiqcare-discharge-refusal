# 02 — Signature Evidence Hashing

## Gap Identified

`ConsentDocumentSignature` rows captured for physician, witness, and interpreter roles
did not store a cryptographic hash of the signature evidence. The patient/guardian
public-signing path already hashed the captured signature image (`signatureHash`), but
that value was only persisted in the JSON `metadata` column and not in a typed column.

This made it impossible to:

- Independently verify that a signature record had not been altered.
- Include signature evidence hashes in the immutable evidence-package checksum.
- Reconstruct the consent evidence chain with integrity guarantees.

## Remediation

1. Schema change (non-destructive):
   - Added `signatureHash String? @map("signature_hash")` to
     `ConsentDocumentSignature` in `apps/web/prisma/schema.prisma`.
   - Added migration `apps/web/prisma/migrations/0028_signature_evidence_hash.sql`
     using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
   - Ran `npm run prisma:generate -w apps/web`.

2. `apps/web/src/lib/server/consent-library-service.ts`:
   - Added `computeSignatureEvidenceHash` helper.
   - If the caller supplies a signature image data URL (`signatureImageDataUrl` or
     `signatureDataUrl` in metadata), the helper hashes the raw image bytes.
   - If no image is supplied, it hashes a canonical record of the signature fields
     (role, signer name, ID/license, method, timestamp, IP, user-agent).
   - `addConsentSignature` now writes `signatureHash` to both the typed column and
     the metadata object.

3. `apps/web/src/lib/server/public-signing-service.ts`:
   - Patient/guardian signatures already computed `signatureHash` from the data URL.
   - The value is now also written to the typed `signatureHash` column on the
     `consentDocumentSignature.create` call.

## Files Changed

- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/0028_signature_evidence_hash.sql`
- `apps/web/src/lib/server/consent-library-service.ts`
- `apps/web/src/lib/server/public-signing-service.ts`

## Verification

- `npm run prisma:generate -w apps/web` — client regenerated without error.
- `npm run build -w apps/web` — success.
- `npm run test -w apps/web` — 214 tests pass.
- New integrity tests prove that changing a signature hash changes the package
  checksum.

## Notes

- The column is optional, so existing rows remain valid and can be back-filled by
  a future data-migration script if required.
- Hashing the raw data URL bytes (including the base64 payload) provides byte-level
  integrity for the captured image.
