# WathiqCare Informed Consents — Enterprise UAT and Governance Package

## 1) Enterprise UAT Checklist

Use this checklist for controlled UAT execution and signoff.

- [ ] Patient lookup validates correct patient identity and prevents cross-patient mismatch.
- [ ] Consent workflow supports create, review, issue, and close states without stage bypass.
- [ ] Medical explanation validation confirms explanation text is mandatory and clinically meaningful.
- [ ] Signature capture records signer identity, method, and timestamp.
- [ ] Witness flow enforces required witness capture when policy requires witness attestation.
- [ ] Interpreter flow enforces interpreter details when language/understanding support is needed.
- [ ] OTP verification validates successful challenge/response and blocks expired/invalid OTP reuse.
- [ ] Draft PDF generation produces bilingual draft output with correct case metadata.
- [ ] Final immutable legal PDF generation locks final output and preserves legal evidence integrity.
- [ ] Audit log generation records all critical lifecycle actions with actor, time, and event trail.
- [ ] Archive workflow completes archival state transition and preserves retrieval capability.
- [ ] Role-based access enforces allow/deny behavior for permitted and non-permitted roles.
- [ ] RTL/Arabic rendering validates right-to-left layout, labels, and legal text integrity.
- [ ] Mobile/tablet responsiveness validates usability and form completion on tablet/mobile breakpoints.

## 2) Legal Affairs Validation Checklist

- [ ] PDPL compliance validation confirms consent capture and processing purpose alignment.
- [ ] Audit admissibility validation confirms event chain is legally traceable and reviewable.
- [ ] Timestamp integrity validation confirms trusted timestamp consistency across workflow events.
- [ ] Signature traceability validation confirms signer identity and signature evidence continuity.
- [ ] Legal package completeness validation confirms all required legal artifacts are present.
- [ ] Immutable PDF controls validation confirms final legal PDF cannot be altered post-finalization.
- [ ] Access restriction validation confirms unauthorized roles cannot view or execute legal actions.
- [ ] Version history validation confirms template/version traceability for generated legal outputs.

## 3) Compliance/Quality Checklist

- [ ] Mandatory field enforcement prevents progression when required consent fields are missing.
- [ ] Workflow escalation triggers correctly when compliance/legal escalation conditions are met.
- [ ] Missing signature prevention blocks finalization when required signatures are absent.
- [ ] Refusal documentation completeness ensures refusal context and rationale are fully recorded.
- [ ] Capacity verification workflow ensures consent capacity checks are documented before completion.

## 4) Rollout Phases

### Phase 1 — Controlled Pilot Users

- Legal Affairs
- Selected physicians
- Compliance

Exit criteria:

- UAT signoff completed for all checklists above
- No critical blocker in OTP, signature, PDF, or audit flows
- Access control validations passed

### Phase 2 — Clinical Expansion

- Surgery department
- ER department
- High-risk procedures

Exit criteria:

- Operational stability maintained during monitored usage window
- No unresolved high-severity legal/compliance defects
- Stakeholder confirmation from Legal Affairs, Medical Director, and Compliance

### Phase 3 — Hospital-wide Rollout

- Hospital-wide rollout

Exit criteria:

- Governance signoff completed
- Technical and legal controls confirmed stable
- Executive approval recorded

## 5) Rollback Strategy

If a controlled rollout issue requires rollback:

1. Disable feature flag (`ENABLE_INFORMED_CONSENTS=false`).
2. Return users to legacy workflow paths.
3. Preserve generated PDFs and audit logs for legal continuity and evidence retention.

## 6) Executive Summary by Stakeholder

### CEO Office

- Controlled release model reduces enterprise deployment risk while preserving legal evidence continuity.
- Phased rollout and rollback controls are defined and auditable.

### Legal Affairs

- Legal readiness checkpoints cover PDPL, signature traceability, timestamp integrity, and admissible audit evidence.
- Immutable final PDF and legal package completeness controls are included in UAT/governance gates.

### Medical Director

- Clinical safety is protected through mandatory workflow checks, explanation validation, witness/interpreter controls, and escalation paths.
- Phase-based onboarding limits risk before hospital-wide adoption.

### CIO

- Technical rollout safeguards include feature flag gating, protected access behavior, traceable audit events, and controlled fallback.
- Production readiness is tied to measurable pass/fail governance criteria.

### Compliance Department

- Compliance validation includes mandatory-field enforcement, missing-signature prevention, refusal completeness, and capacity verification.
- Monitoring and signoff controls support ongoing regulatory readiness.

## 7) Final Production Governance Summary

### Release Readiness

- Ready for controlled phased rollout with gate-based signoff.

### Legal Readiness

- Legal controls and validation gates are defined for PDPL, admissibility, signature traceability, and immutable outputs.

### Technical Readiness

- Feature-flag control, role-based access constraints, and rollback path are defined for production risk control.

### Compliance Readiness

- Compliance checkpoints are explicit and testable before each rollout expansion stage.

### Operational Readiness

- Phased activation, rollback execution, and evidence preservation requirements are documented and actionable.

## 8) Merge Recommendation

**Recommended for controlled production rollout.**
