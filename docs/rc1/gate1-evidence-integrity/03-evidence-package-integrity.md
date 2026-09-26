# 03 — Evidence Package Integrity

## Gap Identified

`buildImmutableEvidencePackage` in
`apps/web/src/lib/server/informed-consents-evidence-vault-service.ts` computed a
SHA-256 checksum over a package payload, but the payload did not explicitly include:

- The final PDF byte hash.
- Unique IDs of audit events / timeline events.
- Signature evidence hashes.
- The signed version-linkage snapshot.
- OTP event IDs.

Consequently, tampering with an audit event row or removing an OTP event could leave
the package checksum unchanged.

## Remediation

1. Extended the package payload in `buildImmutableEvidencePackage`:
   - `finalPdfHash`: the byte-level `immutablePdfHash`.
   - `signedVersionLinkage`: snapshot captured at finalization.
   - `auditEventIds`: stable IDs of all `ConsentDocumentAuditEvent` rows.
   - `timelineEventIds`: stable IDs of all `ConsentDocumentTimelineEvent` rows.
   - `otpEventIds`: IDs from `webhook_events` for the OTP flow.
   - `signatures[].id` and `signatures[].signatureHash`: per-signature integrity.
   - `auditTimeline[].id`: per-timeline-event identity.

2. Added a local `readOtpRowsByDocument` helper in the vault service to retrieve
   OTP webhook event IDs without adding a new service dependency.

3. The package checksum is still `sha256(packagePayload)`; because the payload now
   contains the above fields, any mutation of those records changes the checksum.

## Files Changed

- `apps/web/src/lib/server/informed-consents-evidence-vault-service.ts`

## Verification

- `npm run build -w apps/web` — success.
- `npm run test -w apps/web` — 214 tests pass.
- New unit tests verify that the evidence integrity snapshot (which mirrors the
  package payload) is deterministic and sensitive to PDF hash, signature hash, and
  version-linkage changes.

## Notes

- Existing finalized documents keep their old checksums; only newly created evidence
  packages use the expanded payload. Reconstruction of old packages is still possible
  using the same stored payload shape.
