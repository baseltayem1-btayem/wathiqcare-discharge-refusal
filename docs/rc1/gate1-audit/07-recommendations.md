# RC1 Gate 1.3 — 07 Recommendations

**Scope:** Consolidated, prioritized recommendations for RC1 Gate 1.3 Audit Integrity & Evidence Chain.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## How to Read This Document

Each recommendation includes:

- **ID** — unique identifier
- **Description**
- **Risk**
- **Legal Impact**
- **Clinical Impact**
- **Recommendation**
- **Priority**
- **Estimated Effort**
- **Owner** — suggested responsible team

Priorities:

- **P0** — Blocker for RC1; must be fixed before release.
- **P1** — High; strongly recommended before RC1 final.
- **P2** — Medium; can be addressed in post-RC1 hardening.
- **P3** — Low; backlog or polish.

---

## P0 — Blockers for RC1

### REC-P0-01 — Persist Python in-memory `AuditLogger` to database

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/audit/audit_logger.py` stores hash-chained audit entries only in memory; all evidence is lost on process restart. |
| **Risk** | Discharge-engine audit trail disappears on every deploy/restart. |
| **Legal Impact** | Critical evidence for refusal/discharge workflows cannot be reconstructed. |
| **Clinical Impact** | Clinical decisions made via Python engine lack durable evidence. |
| **Recommendation** | Persist every `AuditLogger` entry to PostgreSQL `AuditLog` or a dedicated chain table on every log call; alternatively, replace the in-memory logger with the existing persisted `AuditLog`/`WorkflowAuditLog`. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |
| **Owner** | Backend Engineering |

### REC-P0-02 — Compute and store true PDF-byte hashes

| Field | Details |
|---|---|
| **Description** | `ConsentDocument.immutablePdfHash` and `auditChecksum` are metadata hashes, not hashes of the rendered PDF bytes. |
| **Risk** | Cannot prove the saved PDF matches the finalized record. |
| **Legal Impact** | PDF integrity cannot be cryptographically demonstrated in disputes. |
| **Clinical Impact** | Disputed PDFs cannot be verified against original bytes. |
| **Recommendation** | Render final PDF to buffer, compute `SHA-256(buffer)`, store as `immutablePdfHash`, and use the hash as object-storage version key. Recompute `ConsentEvidencePackage.checksumHash` from actual file bytes. |
| **Priority** | P0 |
| **Estimated Effort** | 3–5 days |
| **Owner** | Backend / PDF Engineering |

### REC-P0-03 — Add mandatory signature hash for all signature roles

| Field | Details |
|---|---|
| **Description** | `ConsentDocumentSignature` has no top-level `signatureHash`; only public-signing path stores a hash in metadata JSON. Physician/witness signatures store none. |
| **Risk** | Clinician signatures lack cryptographic proof. |
| **Legal Impact** | Non-repudiation of physician/witness signatures is weakened. |
| **Clinical Impact** | Clinician attestation may be challenged. |
| **Recommendation** | Add non-nullable `signatureHash` column to `consent_document_signatures`; compute deterministic proof for every role/method (image hash + OTP hash + document hash + timestamp). |
| **Priority** | P0 |
| **Estimated Effort** | 3–4 days |
| **Owner** | Backend / Consent Engineering |

### REC-P0-04 — Add DB-level append-only triggers to audit/evidence tables

| Field | Details |
|---|---|
| **Description** | Audit and evidence tables have no database triggers preventing `UPDATE` or `DELETE`. |
| **Risk** | Privileged users or compromised DB accounts can alter or erase evidence. |
| **Legal Impact** | Entire evidence chain can be invalidated by insider tampering. |
| **Clinical Impact** | Clinical decisions may rely on falsified records. |
| **Recommendation** | Create PostgreSQL `BEFORE UPDATE` and `INSTEAD OF DELETE` triggers that raise exceptions on: `audit_logs`, `audit_chain_events`, `consent_audit_events`, `consent_timeline_events`, `consent_document_signatures`, `consent_evidence_packages`, `evidence_events`, `evidence_packages`, `webhook_events`, and Python `audit_logs`/`workflow_audit_logs`. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |
| **Owner** | Database / Backend Engineering |

### REC-P0-05 — Remove silent swallowing of audit-chain append failures

| Field | Details |
|---|---|
| **Description** | Multiple Next.js paths use `.catch(() => undefined)` around `appendAuditChainEvent`. |
| **Risk** | Hash-chain gaps occur silently. |
| **Legal Impact** | Tamper-evident chain becomes non-demonstrable. |
| **Clinical Impact** | Signature/OTP/refusal evidence may be missing from the chain. |
| **Recommendation** | Replace silent catches with retry logic and ultimately fail the user request if the chain event cannot be durably persisted. Emit a critical alert on failure. |
| **Priority** | P0 |
| **Estimated Effort** | Medium |
| **Owner** | Backend Engineering |

### REC-P0-06 — Make Next.js business + audit writes atomic or fail-closed

| Field | Details |
|---|---|
| **Description** | Primary business writes and audit writes are separate, non-transactional operations. |
| **Risk** | Legal records can exist without audit evidence. |
| **Legal Impact** | Incomplete evidence chain undermines consent validity. |
| **Clinical Impact** | Clinical actions may be unaudited. |
| **Recommendation** | Wrap business + audit writes in a Prisma `$transaction` or implement an audit outbox table with worker retry; never return success if audit persistence fails. |
| **Priority** | P0 |
| **Estimated Effort** | Large |
| **Owner** | Architecture / Backend Engineering |

### REC-P0-07 — Stop logging PHI/PII in plaintext

| Field | Details |
|---|---|
| **Description** | Login route, consent builder, email router, secure-link service, notification service, and Graph response body logs contain plaintext PII/PHI. |
| **Risk** | Patient/clinician data exposed in logs retained by operators and aggregators. |
| **Legal Impact** | Violates PDPL and HIPAA minimum-necessary principles. |
| **Clinical Impact** | Patient privacy breach. |
| **Recommendation** | Immediately mask/redact emails, phones, names, MRNs, diagnoses, and message bodies in all log paths. Route all logging through redacting helpers. |
| **Priority** | P0 |
| **Estimated Effort** | 1–2 sprints |
| **Owner** | Security / Engineering |

---

## P1 — Strongly Recommended Before RC1 Final

### REC-P1-01 — Introduce `Patient` and `Encounter` models with FKs

| Field | Details |
|---|---|
| **Description** | Web Prisma schema has no `Patient` or `Encounter` tables; patient/encounter context is text only. |
| **Risk** | Reconstruction is brittle; name/MRN changes break linkage. |
| **Legal Impact** | Cannot reliably prove which patient/encounter a consent belongs to. |
| **Clinical Impact** | Wrong patient/encounter may be associated with a consent. |
| **Recommendation** | Add `Patient` and `Encounter` models; add `patientId` and `encounterId` FKs to `Case`, `ConsentDocument`, and core audit tables. |
| **Priority** | P1 |
| **Estimated Effort** | 5–8 days |
| **Owner** | Backend / Data Engineering |

### REC-P1-02 — Add `patientId`, `encounterId`, and `correlationId` to core audit tables

| Field | Details |
|---|---|
| **Description** | `AuditLog` and `AuditChainEvent` lack explicit patient, encounter, and correlation context. |
| **Risk** | Patient/encounter-scoped forensic queries require complex joins; end-to-end tracing is impossible. |
| **Legal Impact** | Slow response to legal discovery; cannot correlate events across systems. |
| **Clinical Impact** | Difficult to produce complete patient/encounter event history. |
| **Recommendation** | Add `patientId`, `encounterId`, and `correlationId` columns; propagate `x-request-id`/`x-correlation-id` across Next.js and Python. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |
| **Owner** | Backend Engineering |

### REC-P1-03 — Create dedicated `otp_verifications` table

| Field | Details |
|---|---|
| **Description** | OTP evidence is scattered across `webhook_events`, `EvidencePackage`, `EvidenceEvent`, and metadata JSON. |
| **Risk** | Reconstructing OTP proof requires joining/parsing multiple tables. |
| **Legal Impact** | Identity verification evidence is hard to present. |
| **Clinical Impact** | Disputed signatures may lack clear OTP proof. |
| **Recommendation** | Create `otp_verifications` table with FK to `consent_document_signatures` or `consent_documents`; populate consistently across all OTP flows. |
| **Priority** | P1 |
| **Estimated Effort** | 3–4 days |
| **Owner** | Backend Engineering |

### REC-P1-04 — Strengthen CKE `GovernanceEvent` hash

| Field | Details |
|---|---|
| **Description** | `GovernanceEvent.eventHash` uses weak `simpleHash` and `previousHash` is always null. |
| **Risk** | CKE governance events are not tamper-evident. |
| **Legal Impact** | Approved clinical knowledge packages cannot be cryptographically proven. |
| **Clinical Impact** | Unapproved knowledge could be used in consent generation. |
| **Recommendation** | Replace `simpleHash` with SHA-256 and populate `previousHash` to form a true chain. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |
| **Owner** | CKE Engineering |

### REC-P1-05 — Change cascade deletes to SET NULL/RESTRICT for evidence

| Field | Details |
|---|---|
| **Description** | `consent_document_signatures` and `consent_evidence_packages` use `ON DELETE CASCADE` from `ConsentDocument`. |
| **Risk** | Deleting a consent document destroys signatures and evidence copies. |
| **Legal Impact** | Legal evidence can be destroyed by deleting the parent document. |
| **Clinical Impact** | Proof of patient consent can be erased. |
| **Recommendation** | Change FK behavior to `ON DELETE SET NULL` or `RESTRICT`; implement legal-hold before deletion. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |
| **Owner** | Database / Backend Engineering |

### REC-P1-06 — Add correlation/request ID propagation across stack

| Field | Details |
|---|---|
| **Description** | No `middleware.ts`; Python middleware does not read correlation headers. |
| **Risk** | Cannot trace a single action across browser → Next.js → Python backend. |
| **Legal Impact** | Forensic reconstruction is fragmented. |
| **Clinical Impact** | Incident investigation is slow/error-prone. |
| **Recommendation** | Add Next.js `middleware.ts` to inject/propagate `x-request-id`/`x-runtime-correlation-id`; add Python logging filter to attach IDs to all records. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |
| **Owner** | Platform Engineering |

### REC-P1-07 — Add alerting integration for audit failures

| Field | Details |
|---|---|
| **Description** | `runtime-observability.ts` and Python log to stdout only; Sentry is referenced but not initialized. |
| **Risk** | Audit subsystem degradation goes unnoticed. |
| **Legal Impact** | Delayed remediation of evidence-chain gaps. |
| **Clinical Impact** | Prolonged audit outages. |
| **Recommendation** | Initialize Sentry (or equivalent) and route `AUDIT_FAILURE`, `DB_FAILURE`, and `unhandled_exception` to on-call. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |
| **Owner** | DevOps / Platform Engineering |

### REC-P1-08 — Persist Python login events to `AuditLog`

| Field | Details |
|---|---|
| **Description** | Python auth router logs login attempts only to stdout and tracks failures in memory. |
| **Risk** | No durable record of authentication events. |
| **Legal Impact** | Cannot forensically investigate account compromise. |
| **Clinical Impact** | Brute-force attempts may not be discoverable. |
| **Recommendation** | Write login success/failure to `AuditLog` with masked email, IP, UA, and outcome. |
| **Priority** | P1 |
| **Estimated Effort** | 1 day |
| **Owner** | Backend Engineering |

### REC-P1-09 — Add audit events for missing lifecycle actions

| Field | Details |
|---|---|
| **Description** | Logout, session timeout, password reset/change, signup, consent withdrawal, patient viewed consent, PDF download, and administrative changes are missing or inconsistently audited. |
| **Risk** | Legally significant actions are not traceable. |
| **Legal Impact** | Weakens non-repudiation and compliance. |
| **Clinical Impact** | Important clinical/security events are invisible. |
| **Recommendation** | Add dedicated audit events for each missing action (see `02-missing-events.md`). |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 sprints |
| **Owner** | Engineering |

### REC-P1-10 — Add retry logic to audit writes

| Field | Details |
|---|---|
| **Description** | Audit writes in both runtimes are single-shot with no retry. |
| **Risk** | Transient DB errors cause audit gaps or service denial. |
| **Legal Impact** | Unreliable audit durability. |
| **Clinical Impact** | Evidence loss during temporary issues. |
| **Recommendation** | Use `runDbOperation` (Next.js) and retry decorator (Python) for all audit writes; implement audit outbox for guaranteed delivery. |
| **Priority** | P1 |
| **Estimated Effort** | Medium |
| **Owner** | Backend Engineering |

---

## P2 — Post-RC1 Hardening

### REC-P2-01 — Standardize feature-flag override audit

| Field | Details |
|---|---|
| **Description** | Feature flags and pilot overrides can enable experimental flows without audit. |
| **Risk** | Non-approved flows used without trace. |
| **Legal Impact** | Cannot demonstrate compliance with approved feature set. |
| **Clinical Impact** | Patients may be exposed to unvalidated workflows. |
| **Recommendation** | Add `feature_flag_override` event whenever a non-default flag is evaluated in production. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |
| **Owner** | Engineering |

### REC-P2-02 — Standardize and migrate to structured logging in Next.js

| Field | Details |
|---|---|
| **Description** | ~70+ raw `console.*` calls remain in `apps/web/src/`. |
| **Risk** | Unstructured, unredacted logs. |
| **Legal Impact** | Ongoing PII/PHI leak risk. |
| **Clinical Impact** | Poor observability. |
| **Recommendation** | Migrate all logging to `runtime-observability` helpers or adopt `pino`/`winston`; add lint rule banning `console.*` in production code. |
| **Priority** | P2 |
| **Estimated Effort** | 1–2 sprints |
| **Owner** | Engineering |

### REC-P2-03 — Add DB indexes for forensic queries

| Field | Details |
|---|---|
| **Description** | Audit tables lack indexes on `actor_id`/`actor_user_id`, `case_id`, and patient identifiers. |
| **Risk** | Slow forensic and legal-discovery queries. |
| **Legal Impact** | Delayed incident response. |
| **Clinical Impact** | Slow clinical audit reports. |
| **Recommendation** | Add indexes on actor, case, patient, encounter, and event type/time. |
| **Priority** | P2 |
| **Estimated Effort** | 1–2 days |
| **Owner** | Database Engineering |

### REC-P2-04 — Verify evidence bundle timestamp/signature configuration

| Field | Details |
|---|---|
| **Description** | Evidence bundles support RFC3161 timestamp and detached signature, but production configuration status is unclear. |
| **Risk** | Bundles may lack independent time-stamping. |
| **Legal Impact** | Legal admissibility may be challenged. |
| **Clinical Impact** | Evidence packages may be insufficient for legal proceedings. |
| **Recommendation** | Verify and document production TSA and signing-key configuration; add automated bundle verification. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |
| **Owner** | Security / Legal Engineering |

### REC-P2-05 — Add audit events for security incident actions

| Field | Details |
|---|---|
| **Description** | Security incident response actions may not be fully audited. |
| **Risk** | Incident handling is not traceable. |
| **Legal Impact** | Cannot demonstrate timely response. |
| **Clinical Impact** | Security events may be mishandled. |
| **Recommendation** | Add `security_incident_acknowledged`, `escalated`, `resolved` events. |
| **Priority** | P2 |
| **Estimated Effort** | 1 day |
| **Owner** | Security Engineering |

---

## P3 — Backlog / Polish

### REC-P3-01 — Document print telemetry

| Field | Details |
|---|---|
| **Description** | Browser print actions are not captured. |
| **Risk** | Hard copies produced without record. |
| **Legal Impact** | Cannot track physical document distribution. |
| **Clinical Impact** | Printed consents may be lost. |
| **Recommendation** | Add client-side `beforeprint` telemetry or rely on download event as proxy; document limitation. |
| **Priority** | P3 |
| **Estimated Effort** | 1–2 days |
| **Owner** | Frontend Engineering |

### REC-P3-02 — Remove experimental `cpus: 1` from Next.js config

| Field | Details |
|---|---|
| **Description** | `experimental.cpus: 1` in `next.config.ts` is unrelated to audit but was noted as experimental debt. |
| **Risk** | Minor build instability. |
| **Legal Impact** | None. |
| **Clinical Impact** | None. |
| **Recommendation** | Remove unless required for a known build bug. |
| **Priority** | P3 |
| **Estimated Effort** | 15 min |
| **Owner** | Platform Engineering |

---

## Implementation Roadmap

| Phase | Timeframe | Recommendations |
|---|---|---|
| **Pre-RC1 critical** | 2–3 weeks | REC-P0-01 through REC-P0-07 |
| **Pre-RC1 final** | 1–2 weeks | REC-P1-01 through REC-P1-10 |
| **Post-RC1 hardening** | 2–4 weeks | REC-P2-01 through REC-P2-05 |
| **Backlog** | Ongoing | REC-P3-01, REC-P3-02 |

---

## Success Criteria

After implementing P0/P1 recommendations:

1. Every legally significant action produces a durable, queryable audit record.
2. Audit records cannot be updated or deleted at the DB level.
3. Hash chain covers all critical event fields and is verified on demand.
4. PDFs, signatures, and OTP verifications have cryptographic proofs.
5. No PHI/PII is logged in plaintext.
6. Correlation IDs propagate across the full stack.
7. Audit failures surface alerts to operators.
8. Business writes and audit writes are atomic or fail-closed.
