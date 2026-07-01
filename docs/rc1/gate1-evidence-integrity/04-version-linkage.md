# 04 — Template and Clinical Knowledge Package Version Linkage

## Gap Identified

Finalized consent documents did not persist a structured snapshot linking the signed
content to:

- The consent template version used.
- The Clinical Knowledge Package (CKP) / assembly that produced the content.
- The consent form, education materials, risk disclosures, and decision rules that
  were active at the moment of signing.

Without this snapshot, a future dispute could not prove which clinical-knowledge
assets were authoritative when the patient signed.

## Remediation

1. During `finalizeConsentDocument`, the service now builds a `signedVersionLinkage`
   object and stores it inside the consent document's `metadata`.

2. The snapshot includes:
   - **Template version**: id, version label, version number, approval timestamp,
     legal hash.
   - **Clinical knowledge package**: package id, package version, procedure id/code.
   - **Consent form**: id, version, code (from `metadata.clinicalKnowledgeAssembly`).
   - **Education materials**: id, version, code list.
   - **Risk disclosures**: id, version, code list.
   - **Decision rules**: id, code list.
   - **Document version** and `fixedClauseChecksum`.
   - **PDF byte hash** engine and value.
   - **Finalization timestamp**.

3. `buildImmutableEvidencePackage` copies `signedVersionLinkage` into the evidence
   package payload, so it participates in the package checksum.

## Files Changed

- `apps/web/src/lib/server/consent-library-service.ts`
- `apps/web/src/lib/server/informed-consents-evidence-vault-service.ts`

## Verification

- `npm run build -w apps/web` — success.
- `npm run test -w apps/web` — 214 tests pass.
- New integrity tests prove that modifying the version linkage changes the package
  checksum.

## Notes

- The linkage is additive metadata; no schema change was required.
- If a document is finalized without a `clinicalKnowledgeAssembly` in metadata, the
  clinical-knowledge section is stored as `null`, but the template version and PDF
  hash are still recorded.
