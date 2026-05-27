# PILOT READINESS MASTER

**Program:** WathiqCare Informed Consent — Controlled Production Pilot
**Release:** `wathiqcare-informed-consent-pilot-ready-v1.0.1`
**Commit:** `74608ee`
**Production Alias:** `wathiqcare.online`
**Document Owner:** Program Operations
**Status:** APPROVED FOR PILOT
**Date Issued:** 2026-05-27

---

## 1. Pilot Scope

### 1.1 In-Scope

| Capability | Status |
|---|---|
| Patient-facing public signing workflow (`/sign/{token}/workflow`) | LIVE — v1.0.1 |
| Staged presentation: Education → Decision → OTP → Signature | LIVE |
| OTP via SMS (primary) with masked-phone delivery confirmation | LIVE |
| Consent acceptance flow | LIVE |
| Consent refusal flow (with refusal acknowledgement + refusal-signature stage) | LIVE |
| Physician consent dispatch workflow | LIVE |
| PDF generation + integrity hash | LIVE |
| Audit-chain evidence package | LIVE |
| Tenant-scoped data isolation (IMC pilot tenant) | LIVE |

### 1.2 Out-of-Scope (Future Phases)

- Biometric capture (WebAuthn, fingerprint, face) — see `SOP_SECURE_SIGNING.md` §3.
- Multi-language UI beyond Arabic / English.
- Offline-mode signing.
- Cross-tenant analytics dashboards.
- Direct EHR push (HL7 FHIR) — currently export-only.

### 1.3 Pilot Site

- **Primary Site:** International Medical Center (IMC) — designated pilot tenant.
- **Departments:** Surgical departments authorized to dispatch informed-consent procedures via the platform.
- **Pilot Physician Cohort:** Identified by IMC governance lead (initial cohort sized per Section 6).

---

## 2. Objectives

| # | Objective | Measurable Outcome |
|---|---|---|
| O1 | Validate that patients can complete a fully informed consent on a mobile device unaided. | ≥ 90% completion rate on dispatched links (excluding clinically cancelled). |
| O2 | Validate that the Education → Decision → OTP → Signature sequence is legally defensible. | 100% of executed consents have full audit-chain evidence (see §4). |
| O3 | Validate operational fit for physician dispatch workflow. | Physician median dispatch time ≤ 90 seconds. |
| O4 | Surface and triage UX / accessibility gaps before broader rollout. | Structured feedback captured for ≥ 80% of pilot encounters. |
| O5 | Confirm refusal pathway is auditable and clinically usable. | 100% of refusals carry refusal-acknowledgement + refusal-signature evidence. |
| O6 | Validate platform stability at pilot volume. | Zero P1 incidents; ≤ 2 P2 incidents during pilot window. |

---

## 3. Pilot Duration

| Phase | Window | Description |
|---|---|---|
| **Phase A — Soft Launch** | Days 1–3 | Single physician, single department. Daily standup. Live observer present. |
| **Phase B — Cohort Expansion** | Days 4–10 | Full pilot physician cohort. Daily standup. On-call ops engineer. |
| **Phase C — Steady State** | Days 11–21 | Continued operation under normal supervision. Weekly review. |
| **Phase D — Decision Gate** | Day 22 | Go / No-Go for general availability based on §4 + §5. |

Total nominal duration: **21 operating days**, extendable by ≤ 14 days if §5 criteria are not met.

---

## 4. Success Criteria (Go Criteria for GA)

All criteria below must be met to recommend graduation from pilot:

### 4.1 Functional

- [ ] Production smoke `__smoke_stabilization.cjs` returns **11/11 PASS** on the last day of pilot.
- [ ] No regressions in the 11-check smoke at any point during the pilot.
- [ ] 100% of executed consent records have a generated PDF with a verifiable hash.
- [ ] 100% of executed consent records contain a complete audit chain: `EDUCATION_VIEWED` → `CONSENT_ACCEPTED|REFUSED` → `OTP_REQUESTED` → `OTP_VERIFIED` → `SIGNATURE_CAPTURED` → `PDF_FINALIZED`.

### 4.2 Operational

- [ ] Patient completion rate ≥ 90% (of dispatched + not clinically cancelled).
- [ ] OTP delivery success rate ≥ 98% on first request.
- [ ] Physician dispatch median time ≤ 90 seconds.
- [ ] Zero P1 incidents.
- [ ] ≤ 2 P2 incidents.

### 4.3 Legal & Compliance

- [ ] Legal reviewer signoff on a randomly sampled evidence package (sample size: max(20, 10% of executed consents)).
- [ ] Compliance reviewer signoff on PDPL alignment per `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md`.
- [ ] Zero confirmed data-handling deviations.

### 4.4 Stakeholder

- [ ] Physician satisfaction (NPS-style) ≥ +30.
- [ ] Patient comprehension self-report ≥ 4.0 / 5.0.
- [ ] IMC governance lead written approval to proceed to GA.

---

## 5. Rollback Criteria (No-Go Triggers)

Any **one** of the following will trigger immediate rollback per the procedure in §5.3.

### 5.1 Hard Triggers — Immediate Rollback

| Trigger | Threshold |
|---|---|
| P1 incident (data loss, cross-tenant leak, audit-chain corruption) | 1 occurrence |
| Production smoke degrades below 11/11 | Any single check failing for ≥ 30 minutes |
| Patient-visible PII exposure | 1 occurrence |
| Legal defect in audit chain (missing OTP evidence, missing decision, missing PDF hash) on an executed consent | 1 occurrence |
| OTP delivery success drops below 90% sustained | ≥ 2 consecutive hours |
| Authentication or session boundary defect (e.g., signing without OTP, signing wrong document) | 1 occurrence |

### 5.2 Soft Triggers — Pause & Review (Decision in ≤ 4 hours)

| Trigger | Threshold |
|---|---|
| P2 incident count | > 2 within rolling 24h |
| Patient completion rate | < 70% over rolling 24h with ≥ 5 dispatched |
| Physician dispatch median time | > 180s sustained |
| Stakeholder block (clinical, legal, compliance) | 1 occurrence |

### 5.3 Rollback Procedure

1. **Notify:** Program Operations + IMC governance lead + on-call ops engineer (channels in §6.3).
2. **Halt:** Disable new dispatches at tenant level (operations toggle).
3. **Revert:** Re-alias `wathiqcare.online` to the previous production deployment (target: `wathiqcare-discharge-refusal-691qpznq0-...` — v1.0).
4. **Verify:** Run `__smoke_stabilization.cjs` against the production alias — expect 11/11 PASS on v1.0.
5. **Preserve evidence:** Snapshot logs, audit tables, and any open signing sessions for forensic review.
6. **Decide:** Schedule root-cause review within 24h. No re-promotion of v1.0.1 (or any successor) until the trigger root cause is documented and the corresponding gate is added to the smoke harness.

---

## 6. Stakeholders

### 6.1 RACI

| Role | Function | R | A | C | I |
|---|---|:-:|:-:|:-:|:-:|
| IMC Governance Lead | Site authority, Go/No-Go vote | | X | | |
| Pilot Clinical Lead | Physician cohort, clinical fit | X | | X | |
| Program Operations | Execution, daily standup, escalation | X | | X | |
| Engineering On-Call | Incident response, smoke harness | X | | X | |
| Legal Reviewer | Evidence sampling, defensibility | | | X | X |
| Compliance Reviewer (PDPL) | Data handling, retention | | | X | X |
| Security Officer | Incident containment, PII | | | X | X |
| Communications Lead | Stakeholder updates | | | | X |

### 6.2 Decision Authority

- **Go/No-Go for GA:** IMC Governance Lead, with binding input from Legal + Compliance.
- **Rollback execution (§5.3):** Engineering On-Call may execute unilaterally; must notify all RACI parties within 15 minutes.
- **Scope change to pilot:** Program Operations + IMC Governance Lead jointly.

### 6.3 Communication Channels

- **P1/P2 incidents:** Pager rotation + signed incident channel.
- **Daily standup:** Phases A and B — synchronous; Phase C — async written summary.
- **Weekly review:** Program Operations chairs; legal + compliance + clinical attend.
- **Patient/physician feedback intake:** `PILOT_FEEDBACK_TEMPLATE.md` forms routed to Program Operations.

---

## 7. Governance Controls

### 7.1 Production Change Guardrails (active during pilot)

- **Rule 1 — Freeze:** No new features merged to the production branch during the pilot window.
- **Rule 2 — Critical-defect patches only:** Allowed only with IMC Governance Lead written approval AND a smoke-harness gate added for the underlying defect.
- **Rule 3 — Dual review:** Any patch requires engineering + legal review for evidence-chain impact.
- **Rule 4 — Tagged releases only:** Production may only be aliased to an annotated tag (`wathiqcare-informed-consent-pilot-ready-vX.Y.Z`).
- **Rule 5 — Rollback ready:** A known-good rollback target is documented before each promotion.

### 7.2 Evidence Controls

- Every executed consent must produce an evidence package validated by `LEGAL_EVIDENCE_SPECIFICATION.md`.
- Daily evidence-chain integrity verification (sample of 5 consents per active day).
- Tamper detection: PDF hash + audit-row append-only verification on the sampled set.

### 7.3 Data Handling

- Tenant isolation enforced at the Prisma query layer; cross-tenant queries forbidden by design.
- PII (full mobile number, full national ID, DOB) never logged at INFO; masking required.
- Retention per `LEGAL_EVIDENCE_SPECIFICATION.md` §9.

### 7.4 Access Controls

- Pilot physicians provisioned individually with named accounts.
- No shared accounts. No service-account dispatch.
- Read-only legal/compliance accounts for evidence review.

### 7.5 Audit

- Append-only audit log per consent.
- Production database in continuous backup mode.
- Pilot operations log maintained in `/pilot-evidence/` (daily entries).

---

## 8. Pilot Artifacts (this package)

| Document | Audience | Path |
|---|---|---|
| `PILOT_READINESS_MASTER.md` | All stakeholders | `/pilot-package/` |
| `PILOT_USER_GUIDE_PATIENT.md` | Patient-facing comms | `/pilot-package/` |
| `PILOT_USER_GUIDE_PHYSICIAN.md` | Pilot physicians | `/pilot-package/` |
| `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` | Legal + compliance | `/pilot-package/` |
| `SOP_SECURE_SIGNING.md` | Operations + engineering | `/pilot-sops/` |
| `PILOT_TEST_SCENARIOS.md` | QA + operations | `/pilot-scenarios/` |
| `PILOT_FEEDBACK_TEMPLATE.md` | All reviewers | `/pilot-package/` |
| `LEGAL_EVIDENCE_SPECIFICATION.md` | Legal + engineering | `/pilot-package/` |

---

## 9. Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| IMC Governance Lead | | | |
| Pilot Clinical Lead | | | |
| Program Operations | | | |
| Legal Reviewer | | | |
| Compliance Reviewer (PDPL) | | | |
| Security Officer | | | |
| Engineering Lead | | | |
