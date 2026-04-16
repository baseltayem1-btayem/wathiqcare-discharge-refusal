# WathiqCare Evidence Bundle Quality and Verification Spec

## Scope
This specification covers:
- Phase 2 operational tamper-evident evidence packaging.
- Phase 3 foundation for external trust integration (TSA + detached signatures).

This system is currently an internal tamper-evident package and is not yet a fully external legal-grade cryptographic evidence system.

## Versioning
- Manifest schema: `wathiqcare.evidence_bundle.manifest.v2`
- Court index schema: `wathiqcare.evidence_bundle.court_admissible.v1`
- Signing metadata schema: `wathiqcare.evidence_bundle.signing.v1`
- Cover sheet schema: `wathiqcare.evidence_bundle.cover_sheet.v1`

## Required ZIP Structure
Minimum required files for validation:
- `00_evidence_cover_certificate.pdf`
- `case_summary.json`
- `audit_logs.json`
- `signatures.json`
- `chain_of_custody.json`
- `timestamps.json`
- `court_admissible_index.json`
- `manifest.json`

Phase 3 foundation files:
- `signing_metadata.json` (always expected by verifier as Phase 3 status source)
- `manifest.sig` (present only when detached signing is configured and successful)
- `tsa_token.tsr` (present only when TSA is configured and token issuance succeeds)
- `evidence_cover_sheet.json` (structured legal index/cover foundation)

## Hash Calculation Rules
### File digests
- Hash algorithm: `SHA-256`.
- For each item in `manifest.files`, hash is computed over raw file bytes.

### Bundle root hash (deterministic)
- Construct sorted list by file name from `manifest.files`.
- Build string: `name:sha256` joined by `|`.
- Compute `SHA-256` of that UTF-8 string.
- Store as `manifest.bundle_root_hash`.

### Audit and custody hash chains
For each chain (`audit_logs.json.entries`, `chain_of_custody.json.events`):
- Initial `previous_hash = SHA-256(seed)`.
- Each entry includes sequential `sequence` starting at `1`.
- Entry hash input is: `previous_hash + canonical_json(entry_without_entry_hash)`.
- Canonical JSON format: sorted keys, compact separators.
- Each entry stores:
	- `previous_hash`
	- `entry_hash`
- Final entry hash must equal the chain root declared in the file.

## Timestamp Rules
- All bundle timestamps must be UTC ISO-8601 with timezone offset.
- `timestamps.json.assertions[*].timestamp_utc` must parse as UTC-aware datetime.
- Phase 2 uses internal UTC assertions.
- Phase 3 adds TSA metadata in manifest and optional `tsa_token.tsr` when external TSA succeeds.

## PDF Integrity Rules
For each PDF listed in `manifest.files`:
- Corresponding profile must exist in `manifest.integrity.pdf_profiles`.
- Required profile fields:
	- `file_name`
	- `sha256`
	- `file_size_bytes`
	- `structure_checks.has_valid_pdf_header` (bool)
	- `structure_checks.has_eof_marker` (bool)
	- `structure_checks.has_cross_reference` (bool)
- Profile hash must match `manifest.files` hash for the same PDF.

## Verification Procedure
1. Ensure required files exist in ZIP.
2. Parse `manifest.json` and validate structure.
3. Recompute each `manifest.files[*].sha256` and compare.
4. Recompute deterministic bundle root hash and compare to manifest.
5. Validate audit chain continuity and root.
6. Validate chain-of-custody continuity and root.
7. Validate timestamp assertion structure and UTC ISO-8601 compliance.
8. Validate PDF profile completeness and consistency.
9. Evaluate TSA metadata and token status:
	 - `enabled` + missing `tsa_token.tsr` is invalid.
	 - `unavailable` or `fallback_internal` is valid with warning.
10. Evaluate detached signature metadata and artifact status:
	 - `signed` + missing `manifest.sig` is invalid.
	 - `not_configured` or `unavailable` is valid with warning.

## Structured Verification Result
Verifier response includes:
- `valid` (bool)
- `errors` (array)
- `warnings` (array)
- `computed_root_hash`
- `manifest_root_hash`
- `tsa` status block
- `detached_signature` status block

## Failure Cases
- Missing required artifact file.
- File hash mismatch against manifest.
- Bundle root hash mismatch.
- Broken audit chain continuity.
- Broken custody chain continuity.
- Malformed UTC timestamp.
- Invalid PDF profile field types.
- TSA marked enabled but token missing.
- Signature marked signed but detached signature file missing.

## Legal Significance by Artifact
- `case_summary.json`: factual case context snapshot.
- `audit_logs.json`: chronological operational record with tamper-evident linkage.
- `signatures.json`: signature/verification state snapshot for generated documents.
- `chain_of_custody.json`: custody event chronology with hash continuity.
- `timestamps.json`: machine-time assertions for event timing.
- `manifest.json`: integrity anchor and deterministic root hash declaration.
- `00_evidence_cover_certificate.pdf`: bilingual legal certificate cover page for judicial review packaging.
- `evidence_cover_sheet.json`: structured legal index and chain statement for presentation.
- `signing_metadata.json` and `manifest.sig`: detached signature foundation.
- `tsa_token.tsr`: external timestamp authority proof when configured.

## Phase 3 Status
Implemented foundations:
- RFC3161 timestamp service abstraction with config-driven enablement and fallback behavior.
- Detached manifest signature abstraction with explicit not-configured/unavailable states.
- Verifier extension to report TSA/signature presence, configuration, and current verification readiness.
- Structured cover-sheet/index artifact.

Remaining for full external legal-grade verification:
- Full RFC3161 timestamp query/response compliance parsing and cryptographic verification.
- Cryptographic verification of detached signatures against trust anchors.
- Optional whole-bundle detached signature and trust-chain validation.
- Legal policy and jurisdictional validation workflow integration.

## KSA Legal Metadata
`manifest.json.legal_metadata` records:
- Jurisdiction: Kingdom of Saudi Arabia
- Applicable laws:
	- Saudi Evidence Law
	- Electronic Transactions Law
	- Personal Data Protection Law (PDPL)
- System type: tamper-evident clinical-legal documentation system
- Admissibility level: internal integrity ensured; external verification pending
