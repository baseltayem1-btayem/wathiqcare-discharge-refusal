# 05 — OTP Verification Linkage

## Gap Identified

The public-signing OTP flow already stored:

- OTP sent time / verification time / status.
- Masked mobile number.

However, the evidence package did not explicitly link to the originating webhook
event IDs in `webhook_events`. This left a gap: an auditor could see that OTP
verification happened, but could not correlate it with the raw provider events.

## Remediation

1. Updated `apps/web/src/lib/server/evidence-package-2-service.ts`:
   - `readOtpRowsByDocument` now selects the event `id` alongside event type and
     payload.
   - `buildEvidencePackageV2` extracts `otpRequestEventId` and `otpVerifyEventId`.
   - These IDs are stored in the `EvidencePackage.metadata` and in every
     `EvidenceEvent.metadata` produced during package construction.
   - The latest signature hash is also recorded in the package metadata, binding
     the OTP verification to the signature evidence.

2. Updated `apps/web/src/lib/server/informed-consents-evidence-vault-service.ts`:
   - Added a local OTP event lookup.
   - `otpEventIds` are included in the immutable evidence-package payload and
     therefore in the package checksum.

## Files Changed

- `apps/web/src/lib/server/evidence-package-2-service.ts`
- `apps/web/src/lib/server/informed-consents-evidence-vault-service.ts`

## Verification

- `npm run build -w apps/web` — success.
- `npm run test -w apps/web` — 214 tests pass.
- The `verifyConsentEvidenceIntegrity` reconstruction function explicitly checks
  that at least one OTP event is linkable for public-signing documents.

## Notes

- Raw OTP codes continue to be stored only as HMAC-SHA256 hashes with a pepper;
  plaintext codes are never persisted.
- OTP event IDs are stored as opaque identifiers, not as sensitive payloads.
