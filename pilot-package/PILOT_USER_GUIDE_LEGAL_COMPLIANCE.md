# LEGAL & COMPLIANCE REVIEWER GUIDE

**Audience:** Legal counsel, in-house compliance, and PDPL data-protection reviewers.
**Release:** v1.0.1
**Scope:** Pilot evidence review, defensibility validation, PDPL alignment.

---

## 1. What you are validating

For every consent (or refusal) executed during the pilot, the platform must produce evidence sufficient to:

1. Demonstrate the patient was **informed** (education materials viewed).
2. Demonstrate the patient made a **free decision** (Accept or Refuse, with timestamp).
3. Demonstrate the **identity-binding** to the phone number on record (OTP).
4. Demonstrate **intent to sign** (signature, captured after OTP verification).
5. Demonstrate **document integrity** (PDF hash, append-only audit chain).
6. Demonstrate compliance with **PDPL** for data collection, processing, and retention.

The complete machine-readable specification lives in `LEGAL_EVIDENCE_SPECIFICATION.md`. This document is the reviewer's procedure.

---

## 2. Evidence Package Contents (per consent)

| Artifact | Source | Required Fields |
|---|---|---|
| Audit chain | Append-only audit table | Ordered events with UTC timestamps, actor, IP, user-agent (masked). |
| Decision record | Decision table | `status`, `decidedAt`, link to audit event. |
| OTP record | Signing-session record | `requestedAt`, `verifiedAt`, `maskedPhone`, `deliveryStatus`. |
| Signature artifact | Signature capture | `capturedAt`, image hash, link to OTP record. |
| Final PDF | Document store | PDF bytes, SHA-256 hash, generation timestamp. |
| Education evidence | Education record | Template + version actually rendered, `viewedAt`. |
| Consent template version | Template registry | `templateId`, `version`, locale. |
| Device / network metadata | Signing session | User-agent (truncated), IP class (not full IP if retention policy says so — see §7). |

All fields must be present. **Missing any required field invalidates the package.**

---

## 3. Audit Evidence Review — Procedure

For each sampled consent (sample size: `max(20, 10% of executed consents)` per pilot week):

1. Open the Evidence View for the consent.
2. Confirm the **audit chain order** is:
   `DISPATCHED` → `EDUCATION_VIEWED` → `DECISION_*` → `OTP_REQUESTED` → `OTP_VERIFIED` → `SIGNATURE_CAPTURED` → `PDF_FINALIZED`.
3. Confirm **no out-of-order events**, no skipped events, no duplicate `OTP_VERIFIED` without a preceding `OTP_REQUESTED`, etc.
4. Confirm **timestamps are monotonic** and within plausible deltas (e.g., signature within OTP TTL).
5. Confirm the **PDF hash** stored in the audit row matches a fresh hash recomputed from the stored PDF bytes.
6. Confirm the **template version** referenced in the audit row matches the bytes inside the PDF (header / footer / appendix).
7. Confirm **education evidence** references an approved package.

Record results in `/pilot-evidence/<date>-evidence-review.md`.

---

## 4. Evidence Package Validation — Pass/Fail

A package **passes** only if **all** of the following are true:

- [ ] All required artifacts present (§2).
- [ ] Audit chain ordered, monotonic, complete (§3.2–§3.4).
- [ ] PDF hash matches stored bytes (§3.5).
- [ ] Template version concordance (§3.6).
- [ ] OTP `verifiedAt` precedes `SIGNATURE_CAPTURED`.
- [ ] Decision `decidedAt` precedes `OTP_REQUESTED`.
- [ ] Education `viewedAt` precedes Decision.
- [ ] No PII leakage in evidence view (no full phone, no full national ID).
- [ ] Tenant ID matches IMC pilot tenant.

A **fail** on any item is a Rollback §5.1 candidate per `PILOT_READINESS_MASTER.md`.

---

## 5. Consent Defensibility Review

Defensibility rests on five pillars. The reviewer confirms each.

| Pillar | What to verify |
|---|---|
| **Informed** | Education materials were rendered before decision; materials were on the approved registry; patient had access to the consent preview. |
| **Voluntary** | No "Sign" button is reachable without a prior explicit decision; refusal pathway is offered with equal prominence; no coercive UI patterns. |
| **Identified** | OTP issued to the registered mobile; OTP verified before signature; identity binding logged. |
| **Documented** | Final PDF immutable, hashed, and stored. Audit chain append-only. |
| **Auditable** | Every state transition is timestamped and attributable; evidence is independently reproducible from raw audit data. |

If any pillar cannot be confirmed for a sampled case, escalate per `PILOT_READINESS_MASTER.md` §5.

---

## 6. Refusal Defensibility (separately reviewed)

A valid refusal must show:

- Decision `DECISION_REFUSED` with timestamp.
- Refusal acknowledgement event recorded.
- Refusal signature captured **after** OTP verification.
- Refusal PDF finalized and hashed.
- The refusal is filed in the patient record and does not silently revert to an "incomplete" state.

Refusals are sampled at the same rate as positive consents.

---

## 7. PDPL Considerations

The pilot must align with the Kingdom of Saudi Arabia Personal Data Protection Law (PDPL). Reviewer checks:

### 7.1 Lawful basis
- Consent processing for medical informed consent has a clinical lawful basis under PDPL. The act of using the platform itself is performed in the context of the patient-physician relationship.
- The OTP-protected signature serves as the patient's authentication, **not** as an additional PDPL consent for unrelated processing.

### 7.2 Data minimization
- Only data necessary for informed-consent execution is collected.
- Display surfaces masked PII (e.g., phone shown as `+966 5•• ••• •772`).
- Logs do not contain full PII at INFO level.

### 7.3 Purpose limitation
- Evidence data is used only for legal defensibility, audit, and statutory disclosure.
- No marketing, no analytics enrichment of patient PII.

### 7.4 Storage & retention
- Storage in-Kingdom or per IMC's approved data-residency profile.
- Retention per §9 below.

### 7.5 Cross-border transfers
- None contemplated during pilot.

### 7.6 Patient rights
- Right to access: patient can be supplied a copy of their consent PDF on request.
- Right to rectification: corrections to demographic data flow through the EHR demographic process; immutable consent records are not retroactively edited — corrections produce **new** records linked to the original.
- Right to erasure: balanced against statutory retention of medical records; defer to IMC medical-records policy.

### 7.7 Security
- Transport: HTTPS, modern TLS only.
- Storage: encryption at rest at the platform layer.
- Access: named accounts, role-based, audited.

### 7.8 Breach response
- Any suspected PII exposure is a P1 incident — `PILOT_READINESS_MASTER.md` §5.1.

---

## 8. PDPL Reviewer Sign-off (per pilot week)

| Check | Yes / No / N/A | Notes |
|---|---|---|
| Sample evidence packages reviewed (count: ___) | | |
| All sampled packages pass §4 | | |
| Masking observed correctly in UI | | |
| Masking observed correctly in logs | | |
| Retention configuration verified (§9) | | |
| No cross-border transfers | | |
| No purpose-creep detected | | |
| Breach register reviewed | | |
| **Overall PDPL alignment this week:** | | |

Reviewer signature, name, date.

---

## 9. Retention Policy (pilot baseline)

| Data class | Retention | Notes |
|---|---|---|
| Final consent PDF + hash | Per IMC medical-records retention policy (typically 15 years or per statutory minimum). | Immutable. |
| Audit chain | Same as PDF. | Append-only. |
| OTP records (codes themselves) | 24 hours then code purged; verification fact + timestamp retained as part of audit chain. | Codes never stored in plaintext beyond TTL. |
| Signing-session cookies | Session lifetime only. | Not persisted. |
| IP addresses | Truncated to network class after 30 days; full retention only within the audit row at the time of signing. | Reviewable. |
| User-agent strings | Truncated form retained alongside audit row. | |
| Backups | Per IMC backup policy. | Encrypted. |

Any deviation must be documented and approved by the Compliance Reviewer before go-live for GA.

---

## 10. Reviewer Workflow Summary

1. Receive weekly sample list from Program Operations.
2. Execute §3 procedure on each sampled case.
3. Record results in `/pilot-evidence/<date>-evidence-review.md`.
4. Execute §8 weekly sign-off.
5. Escalate any §4 failure within 1 business hour to Program Operations.
6. At Phase D, deliver final defensibility opinion (Go / No-Go) per `PILOT_READINESS_MASTER.md` §4.3.
