# RC1 Gate 1.3 — 03 Evidence Chain

**Scope:** Verify that every document/action can be reconstructed from the required evidence inputs: Patient, Encounter, Template Version, Knowledge Package Version, PDF Hash, Signature Hash, OTP Verification, Audit Trail, Timestamp, Actor.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

The evidence chain is **partially complete**. Template version linkage is strong, and audit timestamps/actors are generally captured. However, stable `Patient` and `Encounter` entities are missing from the web Prisma schema, PDF hashes are often metadata hashes rather than PDF-byte hashes, physician/witness signature hashes are missing, OTP verification evidence is scattered, and the Python backend's discharge-engine audit chain is in-memory only.

---

## 1. Required Evidence Chain Inputs

| Input | Required For | Current State |
|---|---|---|
| Patient | Identify the subject of consent/document | Partial — text fields only, no FK |
| Encounter | Scope events to a clinical encounter | Missing — no `Encounter` model |
| Template Version | Reconstruct the legal text in effect | Supports — `ConsentDocument.templateVersionId` + RESTRICT delete |
| Knowledge Package Version | Reconstruct the clinical knowledge used | Partial — indirect via procedure code |
| PDF Hash | Prove the generated PDF bytes | Partial — often metadata hash, not byte hash |
| Signature Hash | Prove the captured signature | Partial — only public signing stores hash |
| OTP Verification | Prove identity verification occurred | Partial — scattered across tables |
| Audit Trail | Trace every action | Partial — durable but missing DB immutability |
| Timestamp | Establish when events occurred | Supports — `createdAt`/`signedAt`/`finalizedAt` |
| Actor | Establish who performed actions | Supports — `actorId`/`userId` stored |

---

## 2. Patient Context

### EVC-01 — No `Patient` model in web Prisma schema

| Field | Details |
|---|---|
| **Description** | The web Prisma schema has no `Patient` table. Patient identity is stored as text on `Case` (`patientName`, `patientIdNumber`, `medicalRecordNo`) and `ConsentDocument` (`patientName`, `mrn`, `dob`, `gender`). |
| **Risk** | Patient identity is not stable; name/MRN changes break reconstruction. |
| **Legal Impact** | Cannot reliably prove which patient a consent belongs to if text data changes. |
| **Clinical Impact** | Wrong patient may be associated with a consent after data correction. |
| **Recommendation** | Introduce a `Patient` model with stable ID and FKs from `Case` and `ConsentDocument`. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |

### EVC-02 — Core audit tables lack `patientId`

| Field | Details |
|---|---|
| **Description** | `AuditLog` and `AuditChainEvent` do not store `patientId`; queries must join through `Case` or `ConsentDocument`. |
| **Risk** | Patient-scoped forensic queries are complex and error-prone. |
| **Legal Impact** | Slow response to legal discovery requests. |
| **Clinical Impact** | Difficult to produce a complete patient event history. |
| **Recommendation** | Add `patientId`/`mrn` columns to core audit tables where available. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 3. Encounter Context

### EVC-03 — No `Encounter` model in web Prisma schema

| Field | Details |
|---|---|
| **Description** | There is no `Encounter` table. Encounter context exists only as `ConsentEmrMapping.encounterIdentifier` (text) and `EncounterExternalReference.externalEncounterId`. |
| **Risk** | Encounter-scoped evidence is fragmented and not queryable via FK. |
| **Legal Impact** | Cannot easily reconstruct all events for a specific encounter. |
| **Clinical Impact** | Per-encounter clinical review is difficult. |
| **Recommendation** | Introduce an `Encounter` model and FKs from `ConsentDocument` and audit tables. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |

### EVC-04 — Core audit tables lack `encounterId`

| Field | Details |
|---|---|
| **Description** | `AuditLog` and `AuditChainEvent` have no `encounterId` column. |
| **Risk** | Audit queries by encounter require joining through `ConsentEmrMapping`. |
| **Legal Impact** | Encounter-level chain of custody is hard to demonstrate. |
| **Clinical Impact** | Encounter audit reports require custom joins. |
| **Recommendation** | Add `encounterId` to core audit tables. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 4. Template Version Context

### EVC-05 — Strong template version linkage

| Field | Details |
|---|---|
| **Description** | `ConsentDocument.templateVersionId` FKs to `ConsentTemplateVersion`, which has `versionLabel`, `versionNumber`, `approvedAt`, `approvedByUserId`, and `legalHash`. Delete is `RESTRICT`. |
| **Risk** | Low — approved template versions are immutable and protected. |
| **Legal Impact** | The exact legal text in effect can be reconstructed. |
| **Clinical Impact** | The consent content used is traceable. |
| **Recommendation** | Maintain current design. |
| **Priority** | — |
| **Estimated Effort** | None |

### EVC-06 — CKE `GovernanceEvent` hash is weak

| Field | Details |
|---|---|
| **Description** | `GovernanceEvent.eventHash` uses a Java-style string hash (`simpleHash`), not SHA-256, and `previousHash` is always null. |
| **Risk** | CKE governance events are not tamper-evident. |
| **Legal Impact** | Cannot prove that clinical knowledge packages were not altered after approval. |
| **Clinical Impact** | Unapproved knowledge could be used in consent generation. |
| **Recommendation** | Replace `simpleHash` with SHA-256 and populate `previousHash` to form a true chain. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 5. Knowledge Package Version Context

### EVC-07 — No direct knowledge package FK on `ConsentDocument`

| Field | Details |
|---|---|
| **Description** | `ConsentDocument` does not store the `ClinicalKnowledgePackage` ID/version used at finalization. Linkage is indirect via procedure code → `ClinicalProcedure` → effective package. |
| **Risk** | The exact knowledge package version used cannot be directly proven. |
| **Legal Impact** | Content provenance for education/risk materials is indirect. |
| **Clinical Impact** | Outdated knowledge packages may be unknowingly referenced. |
| **Recommendation** | Add `clinicalKnowledgePackageId` and `educationPackageVersionId` columns to `ConsentDocument` at finalization. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 6. PDF Hash

### EVC-08 — PDF hash is often a metadata hash, not PDF-byte hash

| Field | Details |
|---|---|
| **Description** | `ConsentDocument.immutablePdfHash` and `auditChecksum` are computed from consent reference, wording snapshot, fixed-clause checksum, `updatedAt`, and signatures — not from the actual rendered PDF bytes. `ConsentEvidencePackage.checksumHash` uses the same metadata hash. |
| **Risk** | If PDF renderer or storage is compromised, the hash cannot prove byte integrity. |
| **Legal Impact** | Cannot cryptographically prove that the saved PDF matches the finalized record. |
| **Clinical Impact** | Disputed PDFs cannot be verified against the original bytes. |
| **Recommendation** | Render final PDF to buffer, compute `SHA-256(buffer)`, store as `immutablePdfHash`, and use the hash as object-storage version key. |
| **Priority** | P0 |
| **Estimated Effort** | 3–5 days |

### EVC-09 — PDF regeneration not always versioned distinctly

| Field | Details |
|---|---|
| **Description** | While `pdf_regenerated` events exist, not all regeneration paths produce distinct version records. |
| **Risk** | Multiple PDF versions may be indistinguishable. |
| **Legal Impact** | Cannot prove which PDF was the authoritative version at a given time. |
| **Clinical Impact** | Clinicians may rely on an outdated PDF. |
| **Recommendation** | Ensure every PDF generation produces a new `Document`/`PdfDocument` version row with timestamp, actor, and hash. |
| **Priority** | P2 |
| **Estimated Effort** | 1–2 days |

---

## 7. Signature Hash

### EVC-10 — Physician/witness signature hash missing in web stack

| Field | Details |
|---|---|
| **Description** | `ConsentDocumentSignature` has no top-level `signatureHash`. Only public-signing path stores `signatureHash` inside `metadata` JSON. Physician/witness signatures via `addConsentSignature` store no hash. |
| **Risk** | Clinician signatures lack cryptographic proof. |
| **Legal Impact** | Non-repudiation of physician/witness signatures is weakened. |
| **Clinical Impact** | Clinician attestation may be challenged in disputes. |
| **Recommendation** | Add non-nullable `signatureHash` column; compute deterministic proof for every role/method (image hash + OTP hash + document hash + timestamp). |
| **Priority** | P0 |
| **Estimated Effort** | 3–4 days |

### EVC-11 — Python discharge case signature hashes exist but in mutable JSON

| Field | Details |
|---|---|
| **Description** | `DischargeCase` stores `patient_signature_hash`, `physician_signature_hash`, etc., plus `signature_context_json`. These are in mutable columns without DB-level immutability. |
| **Risk** | Signature evidence can be altered at the DB level. |
| **Legal Impact** | Tamper resistance is application-layer only. |
| **Clinical Impact** | Disputed signatures cannot be strongly proven. |
| **Recommendation** | Add DB trigger preventing updates to signature columns after finalization; store signature hashes in append-only audit table. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 8. OTP Verification

### EVC-12 — OTP evidence scattered across tables

| Field | Details |
|---|---|
| **Description** | OTP events are stored in `webhook_events`, `EvidencePackage`, `EvidenceEvent`, and `ConsentDocumentSignature.metadata`. There is no dedicated `otp_verifications` table with FK to signatures. |
| **Risk** | Reconstructing OTP evidence requires joining and parsing JSON across multiple tables. |
| **Legal Impact** | Identity verification evidence is hard to present. |
| **Clinical Impact** | Disputed signatures may lack clear OTP proof. |
| **Recommendation** | Create `otp_verifications` table with FK to `consent_document_signatures` or `consent_documents`; populate consistently. |
| **Priority** | P1 |
| **Estimated Effort** | 3–4 days |

### EVC-13 — OTP timing-safe comparison is used

| Field | Details |
|---|---|
| **Description** | OTP verification uses `crypto.timingSafeEqual`, preventing timing attacks. |
| **Risk** | Low. |
| **Legal Impact** | Supports integrity of identity verification. |
| **Clinical Impact** | Protects against credential brute-forcing. |
| **Recommendation** | Maintain current implementation. |
| **Priority** | — |
| **Estimated Effort** | None |

---

## 9. Audit Trail

### EVC-14 — Hash chain exists but has gaps

| Field | Details |
|---|---|
| **Description** | `AuditChainEvent` uses SHA-256 per `(tenantId, caseId)` but hash input excludes `sourceIp`, `deviceInfo`, `sessionInfo`, and row `id`. Silent `.catch(() => undefined)` swallowing around appends means events can be lost. |
| **Risk** | Tampering of excluded fields is undetectable; chain can have silent gaps. |
| **Legal Impact** | Tamper-evidence claim is weaker than required. |
| **Clinical Impact** | Forensic reconstruction may be incomplete. |
| **Recommendation** | Include all persisted fields in hash input; remove silent swallowing; add alerting on chain failures. |
| **Priority** | P0 |
| **Estimated Effort** | 3–4 days |

### EVC-15 — DB-level append-only triggers missing

| Field | Details |
|---|---|
| **Description** | No PostgreSQL triggers prevent `UPDATE`/`DELETE` on `audit_logs`, `audit_chain_events`, `consent_audit_events`, etc. |
| **Risk** | Privileged users can alter or delete audit records. |
| **Legal Impact** | Entire evidence chain can be invalidated by insider tampering. |
| **Clinical Impact** | Clinical decisions may rely on falsified audit records. |
| **Recommendation** | Add `BEFORE UPDATE` / `INSTEAD OF DELETE` triggers to all audit/evidence tables. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |

### EVC-16 — Cascade deletion destroys child evidence

| Field | Details |
|---|---|
| **Description** | `consent_document_signatures.consentDocumentId` and `consent_evidence_packages.consentDocumentId` use `ON DELETE CASCADE`. |
| **Risk** | Deleting a consent document removes signatures and evidence copies. |
| **Legal Impact** | Legal evidence can be destroyed by deleting the parent document. |
| **Clinical Impact** | Accidental or malicious deletion destroys proof of consent. |
| **Recommendation** | Change to `ON DELETE SET NULL` or `RESTRICT`; rely on legal-hold/retention policy. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

---

## 10. Timestamp & Actor

### EVC-17 — Timestamps are generally captured

| Field | Details |
|---|---|
| **Description** | `createdAt`, `signedAt`, `finalizedAt`, `approvedAt`, and event timestamps are present across audit tables. |
| **Risk** | Low. |
| **Legal Impact** | Supports chronology of events. |
| **Clinical Impact** | Supports clinical timeline reconstruction. |
| **Recommendation** | Ensure all timestamps use DB `now()` or trusted server time; avoid client-provided times for audit. |
| **Priority** | — |
| **Estimated Effort** | None |

### EVC-18 — Actor identification is generally captured

| Field | Details |
|---|---|
| **Description** | `userId`, `actorId`, `actorUserId`, `actorRole` are stored in most audit tables. |
| **Risk** | Low. |
| **Legal Impact** | Supports non-repudiation. |
| **Clinical Impact** | Supports accountability. |
| **Recommendation** | Ensure service/system actions use a non-null `system` actor and role. |
| **Priority** | — |
| **Estimated Effort** | None |

---

## 11. Evidence Chain Completeness Matrix

| Evidence Input | Status | Gap | Priority |
|---|---|---|---|
| Patient | Partial | No `Patient` model / no `patientId` in audit tables | P1 |
| Encounter | Missing | No `Encounter` model / no `encounterId` in audit tables | P1 |
| Template Version | Supports | — | — |
| Knowledge Package Version | Partial | No direct FK on `ConsentDocument` | P1 |
| PDF Hash | Partial | Metadata hash, not PDF-byte hash | P0 |
| Signature Hash | Partial | Physician/witness hash missing in web stack | P0 |
| OTP Verification | Partial | No dedicated table; scattered evidence | P1 |
| Audit Trail | Partial | No DB immutability; chain hash scope gaps | P0 |
| Timestamp | Supports | — | — |
| Actor | Supports | — | — |

---

## 12. Recommendations Summary

1. Introduce `Patient` and `Encounter` models with FKs into `Case`, `ConsentDocument`, and audit tables.
2. Add `patientId`, `encounterId`, and `correlationId` columns to `AuditLog` and `AuditChainEvent`.
3. Compute and store true PDF-byte hashes at finalization.
4. Add mandatory `signatureHash` to `ConsentDocumentSignature` for all roles/methods.
5. Create a dedicated `otp_verifications` table linked to signatures/documents.
6. Strengthen `GovernanceEvent` hash to SHA-256 with `previousHash` chain.
7. Add DB-level append-only triggers to all audit/evidence tables.
8. Remove cascade deletion of signatures/evidence packages.
9. Include all audit event fields in `AuditChainEvent` hash input and remove silent failure swallowing.
