# RC1 Gate 1.3 — 04 Tamper Resistance

**Scope:** Determine whether audit records can be edited or deleted, whether hashes are generated, and whether evidence integrity exists.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

Tamper resistance is **application-layer only** and **incomplete**. The Next.js `AuditChainEvent` table implements a SHA-256 linked hash chain, but there are no database-level append-only triggers, no immutability constraints, and several audit tables can be updated or deleted. The Python backend's hash-chained `AuditLogger` is in-memory only and lost on restart. Several evidence tables use `ON DELETE CASCADE`, allowing parent deletion to erase child evidence.

---

## 1. Can Audit Records Be Edited?

### TAMP-01 — Prisma/PostgreSQL audit tables allow UPDATE

| Field | Details |
|---|---|
| **Description** | `AuditLog`, `AuditChainEvent`, `ConsentAuditEvent`, `ConsentTimelineEvent`, `EvidenceEvent`, `webhook_events`, and Python `audit_logs`/`workflow_audit_logs` have no DB triggers or permissions preventing `UPDATE`. |
| **Risk** | A privileged user or compromised DB account can modify audit rows without detection. |
| **Legal Impact** | Evidence chain can be falsified; non-repudiation is broken. |
| **Clinical Impact** | Clinical decisions may rely on altered audit records. |
| **Recommendation** | Add PostgreSQL `BEFORE UPDATE` triggers that raise exceptions on all audit/evidence tables. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |

### TAMP-02 — Mutable JSON columns contain audit evidence

| Field | Details |
|---|---|
| **Description** | `DischargeCase.legal_payload_json` contains an in-JSON audit chain, but the column itself is mutable. `ConsentDocumentSignature.metadata` and `ConsentDocument.metadata` also contain hash/signature evidence inside mutable JSON. |
| **Risk** | Evidence stored in JSON columns can be modified. |
| **Legal Impact** | Tamper-evidence claims are weakened. |
| **Clinical Impact** | Signature/OTP evidence can be altered. |
| **Recommendation** | Move hash/signature/OTP evidence to dedicated, immutable columns or tables covered by append-only triggers. |
| **Priority** | P1 |
| **Estimated Effort** | 3–4 days |

### TAMP-03 — `ConsentDocument` is mutable until finalized and even then has `updatedAt`

| Field | Details |
|---|---|
| **Description** | `ConsentDocument` has no DB-level immutability after `FINALIZED`. The `updatedAt` field remains present and updateable. |
| **Risk** | Finalized documents can be altered at the DB level. |
| **Legal Impact** | Legal validity of finalized consent is threatened. |
| **Clinical Impact** | Approved consent content could be changed post-finalization. |
| **Recommendation** | Add a DB trigger that rejects updates to `ConsentDocument` and related tables when status is `FINALIZED`. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |

---

## 2. Can Audit Records Be Deleted?

### TAMP-04 — No DB-level delete protection on audit tables

| Field | Details |
|---|---|
| **Description** | None of the audit tables have `INSTEAD OF DELETE` triggers or row-level security policies preventing deletion. |
| **Risk** | Audit records can be deleted, breaking the evidence chain. |
| **Legal Impact** | Complete sections of the audit trail can be erased. |
| **Clinical Impact** | Clinical actions may appear to have never occurred. |
| **Recommendation** | Add `INSTEAD OF DELETE` triggers that reject deletion on all audit/evidence tables; archive instead. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |

### TAMP-05 — Cascade deletion destroys signature and evidence records

| Field | Details |
|---|---|
| **Description** | `consent_document_signatures.consentDocumentId` and `consent_evidence_packages.consentDocumentId` use `ON DELETE CASCADE`. |
| **Risk** | Deleting a consent document deletes its signatures and evidence packages. |
| **Legal Impact** | Legal evidence can be destroyed by removing the parent document. |
| **Clinical Impact** | Proof of patient consent can be erased. |
| **Recommendation** | Change FK behavior to `ON DELETE SET NULL` or `RESTRICT`; implement legal-hold before deletion. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### TAMP-06 — Soft-delete not used for audit tables

| Field | Details |
|---|---|
| **Description** | Audit tables do not have `deletedAt` columns, which is good, but this also means there is no recovery path if a row is hard-deleted. |
| **Risk** | Hard deletion is permanent. |
| **Legal Impact** | Accidental or malicious deletion is irreversible. |
| **Clinical Impact** | Evidence loss is permanent. |
| **Recommendation** | Combined with delete triggers, add logical deletion via status/archive tables if purge is ever required. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |

---

## 3. Are Hashes Generated?

### TAMP-07 — Next.js `AuditChainEvent` uses SHA-256 linked hash chain

| Field | Details |
|---|---|
| **Description** | `audit-chain-service.ts` computes `currentHash` over `previousHash`, `tenantId`, `caseId`, `eventType`, `actorId`, `actorRole`, `occurredAt`, `payloadSummary`, `documentVersion`, and `metadataJson`. |
| **Risk** | Hash input excludes `sourceIp`, `deviceInfo`, `sessionInfo`, and row `id`. |
| **Legal Impact** | Tampering of excluded fields is undetectable. |
| **Clinical Impact** | Source/device evidence can be altered. |
| **Recommendation** | Include all persisted fields in the hash input. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### TAMP-08 — `currentHash` unique constraint prevents duplicate hashes

| Field | Details |
|---|---|
| **Description** | `AuditChainEvent.currentHash` has a `@unique` constraint, preventing identical hash insertion. |
| **Risk** | Low. |
| **Legal Impact** | Prevents simple hash collision/replay insertion. |
| **Clinical Impact** | Supports audit uniqueness. |
| **Recommendation** | Maintain. |
| **Priority** | — |
| **Estimated Effort** | None |

### TAMP-09 — `GovernanceEvent` hash is weak

| Field | Details |
|---|---|
| **Description** | CKE `GovernanceEvent.eventHash` uses a Java-style `simpleHash`, not a cryptographic hash, and `previousHash` is always null. |
| **Risk** | CKE governance events are not tamper-evident. |
| **Legal Impact** | Approved clinical knowledge packages cannot be cryptographically proven. |
| **Clinical Impact** | Unapproved knowledge could be used. |
| **Recommendation** | Replace with SHA-256 and populate `previousHash` to form a true chain. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

### TAMP-10 — PDF hashes are metadata hashes, not byte hashes

| Field | Details |
|---|---|
| **Description** | `immutablePdfHash`/`auditChecksum` are computed from consent reference, wording snapshot, checksum, and signatures — not from rendered PDF bytes. |
| **Risk** | Cannot prove the saved PDF matches the finalized record. |
| **Legal Impact** | PDF integrity cannot be cryptographically demonstrated. |
| **Clinical Impact** | Disputed PDFs cannot be verified. |
| **Recommendation** | Compute SHA-256 of the actual PDF buffer at finalization. |
| **Priority** | P0 |
| **Estimated Effort** | 3–5 days |

### TAMP-11 — Signature hashes are inconsistent

| Field | Details |
|---|---|
| **Description** | Public signing stores `signatureHash` in metadata JSON. Physician/witness signatures in the web stack store no hash. Python discharge case stores signature hashes in mutable columns. |
| **Risk** | Signature non-repudiation is incomplete. |
| **Legal Impact** | Clinician signatures may be challengeable. |
| **Clinical Impact** | Attestation evidence is weak. |
| **Recommendation** | Add mandatory `signatureHash` to `ConsentDocumentSignature` and compute deterministically for all roles. |
| **Priority** | P0 |
| **Estimated Effort** | 3–4 days |

### TAMP-12 — Secure-link token hashing is correct

| Field | Details |
|---|---|
| **Description** | Raw secure-link tokens are never persisted; only `HMAC-SHA256(token, PUBLIC_LINK_TOKEN_PEPPER)` is stored. |
| **Risk** | Low. |
| **Legal Impact** | Supports token confidentiality. |
| **Clinical Impact** | Protects patient access links. |
| **Recommendation** | Maintain. |
| **Priority** | — |
| **Estimated Effort** | None |

### TAMP-13 — OTP hash uses timing-safe comparison

| Field | Details |
|---|---|
| **Description** | OTP codes are hashed and compared with `crypto.timingSafeEqual`. |
| **Risk** | Low. |
| **Legal Impact** | Supports identity verification integrity. |
| **Clinical Impact** | Prevents credential brute-force. |
| **Recommendation** | Maintain. |
| **Priority** | — |
| **Estimated Effort** | None |

---

## 4. Evidence Integrity Mechanisms

### TAMP-14 — Evidence bundle integrity is strong but configuration-dependent

| Field | Details |
|---|---|
| **Description** | `legal/evidence_bundle.py` creates a zip with SHA-256 manifest, hash chain, detached signature, and optional RFC3161 timestamp. `evidence_bundle_verifier.py` can verify the bundle. |
| **Risk** | Timestamp/signature services may not be configured in production. |
| **Legal Impact** | Legal admissibility depends on TSA/signing key configuration. |
| **Clinical Impact** | Evidence packages may lack independent time-stamping. |
| **Recommendation** | Verify production configuration of RFC3161 TSA and detached signing key; add automated verification. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

### TAMP-15 — `immutable_lock` boolean is not enforced by DB

| Field | Details |
|---|---|
| **Description** | Python `DischargeCase.immutable_lock` blocks application-layer updates but has no DB trigger. |
| **Risk** | Direct DB update can bypass the lock. |
| **Legal Impact** | Finalized cases can be altered. |
| **Clinical Impact** | Disputed refusal decisions cannot be strongly proven. |
| **Recommendation** | Add DB trigger enforcing immutability after lock. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 5. Tamper Resistance Verdict by Component

| Component | Editable? | Deletable? | Hashed? | Tamper-Evident? | Priority |
|---|---|---|---|---|---|
| `AuditLog` (Prisma) | Yes | Yes | No | No | P0 |
| `AuditChainEvent` (Prisma) | Yes | Yes | Yes (partial) | Partial | P0 |
| `ConsentAuditEvent` | Yes | Yes | No | No | P0 |
| `ConsentTimelineEvent` | Yes | Yes | No | No | P0 |
| `ConsentDocumentSignature` | Yes | Yes (cascade) | Partial (metadata only) | No | P0 |
| `ConsentDocument` (after finalize) | Yes | Yes | Partial (metadata hash) | No | P0 |
| `ConsentEvidencePackage` | Yes | Yes (cascade) | Partial | No | P0 |
| `GovernanceEvent` | Yes | Yes | Weak | No | P1 |
| Python `AuditLogger` | N/A (in-memory) | Lost on restart | Yes | No | P0 |
| Python `AuditLog` table | Yes | Yes | No | No | P0 |
| Python `WorkflowAuditLog` | Yes | Yes | No | No | P0 |
| Python `DischargeCase` (locked) | Yes (DB bypass) | Yes | Yes (mutable columns) | No | P1 |
| Evidence bundle (zip) | No (if signed/TSA) | No (if archived) | Yes | Yes (if configured) | P1 |

---

## 6. Recommendations Summary

1. Add DB-level append-only triggers to all audit/evidence tables.
2. Add delete-protection triggers to all audit/evidence tables.
3. Change cascade deletes to `SET NULL`/`RESTRICT` for signatures/evidence packages.
4. Include all persisted fields in `AuditChainEvent` hash input.
5. Replace `GovernanceEvent.simpleHash` with SHA-256 and chain `previousHash`.
6. Compute true PDF-byte hashes and store in `immutablePdfHash`.
7. Add mandatory `signatureHash` to `ConsentDocumentSignature` for all roles.
8. Enforce `immutable_lock` at the DB level.
9. Persist Python `AuditLogger` to PostgreSQL or replace with persisted `AuditLog`.
10. Verify and document production TSA/signing-key configuration for evidence bundles.
