# 18. Open Risks Register — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Scope:** Risks that remain open and accepted at go-live, pilot, or hypercare exit. This register is the live view of residual risk for operational governance.

---

## 1. Purpose

The Open Risks Register tracks risks that:

- Have been identified and mitigated but not fully closed, **or**
- Are accepted as residual risk for a defined phase, **or**
- Require ongoing monitoring after go-live.

All open risks must have an owner, a monitoring trigger, and an approved acceptance level.

---

## 2. Open Risk Acceptance Levels

| Level | Authority | Typical Use |
|-------|-----------|-------------|
| Pilot-only acceptance | Release Manager + Clinical SME | Low/medium risks acceptable for a time-bound pilot. |
| Production-with-conditions | Executive Sponsor + Medical Director + CIO | Medium risks with active monitoring and a closure plan. |
| Accepted residual | Executive Sponsor + Board-level risk committee | Low risks with no further action required. |

---

## 3. Open Risks at Prototype / UAT Phase

| ID | Risk | Residual Impact | Mitigation in Place | Monitoring Trigger | Owner | Acceptance Level |
|----|------|-----------------|---------------------|--------------------|-------|------------------|
| OR-01 | Remote signing route missing | High | Prototype-only scope; preview mode used; separate ticket tracked. | Any request to deploy to production | Product / Engineering | Not accepted for production |
| OR-02 | Mock CKE divergence | Medium | Deterministic mock data; clinical SME review of rules; contract validation planned. | Alert or participant mismatch in UAT | Clinical Knowledge team | Pilot-only |
| OR-03 | Refusal copy not legally approved | High | Prototype copy isolated from production; legal review scheduled. | Attempt to deploy patient-facing copy | Legal Affairs | Not accepted for production |
| OR-04 | Accessibility audit pending | Medium | Automated scans in UAT; independent audit scheduled. | Automated scan score < 90 or user complaint | Compliance | Pilot-only |
| OR-05 | Load testing not performed | Medium | Limited pilot scope; load test scheduled for staging. | Response time > 2 s or error rate > 0.1% | QA / DevOps | Pilot-only |
| OR-06 | Simulated OTP / PDF / archive | Medium | Clear mock labels; production integrations planned. | Confusion in training or evidence review | Engineering | Pilot-only |

---

## 4. Open Risks at Controlled Pilot Phase (Target State)

After KI-01, KI-03, KI-04, and KI-07 are resolved, the following risks may remain open with active monitoring:

| ID | Risk | Monitoring Trigger | Response |
|----|------|--------------------|----------|
| OR-07 | Live CKE behavior differs from mock | > 2% package-resolution anomalies or clinical complaints | Roll back to manual consent selection; validate mapping |
| OR-08 | Accessibility gaps missed by scans | User complaints or audit findings | Immediate remediation; extend pilot if critical |
| OR-09 | Performance degradation under higher volume | p95 response > 2 s or error rate > 0.1% | Scale infrastructure or reduce pilot group |
| OR-10 | Support team unfamiliar with new workflow | Ticket volume > 2× forecast or > 4 h avg resolution | Add training shifts and super-user coverage |
| OR-11 | Patient confusion or literacy barriers | Completion rate < 85% or negative feedback | Enhance education material; offer nurse-assisted signing |

---

## 5. Risk Monitoring Dashboard

| Metric | Normal | Warning | Critical | Action |
|--------|--------|---------|----------|--------|
| Workspace availability | ≥ 99.5% | 99–99.5% | < 99% | Investigate; consider rollback |
| Package resolution time (p95) | ≤ 500 ms | 500 ms–2 s | > 2 s | Optimize or reduce load |
| Patient completion rate | ≥ 85% | 70–85% | < 70% | Review UX; offer assistance |
| Refusal rate | Baseline ± 1% | 2× baseline | 3× baseline | Clinical SME review |
| Support ticket volume | Within forecast | 1.5× forecast | 2× forecast | Add coverage; triage |
| Evidence export failures | 0 | < 0.5% | ≥ 0.5% | Engineering investigation |

---

## 6. Approval to Carry Forward

Open risks may only be carried forward if the following sign-offs are obtained:

| Phase | Required Approvers |
|-------|-------------------|
| UAT | UAT Lead, Clinical SME |
| Controlled pilot | Release Manager, Clinical SME, Legal, Compliance, InfoSec |
| Full production | Executive Sponsor, Medical Director, CIO, Legal, Compliance, InfoSec, Quality |

---

## 7. Closure Process

1. Risk owner confirms the risk is no longer applicable or has been reduced to an accepted residual level.
2. Evidence of closure is attached (test result, audit report, deployment note).
3. Enterprise Readiness Lead updates this register.
4. If the risk remains as a low residual, it is moved to the Accepted Residual section with executive sign-off.

---

## 8. Accepted Residual Risks

| ID | Risk | Accepted Residual | Review Date | Executive Sign-Off |
|----|------|-------------------|-------------|--------------------|
| — | None at this time | — | — | — |

---

## 9. Related Documents

- [10-risk-register.md](./10-risk-register.md)
- [17-known-issues-register.md](./17-known-issues-register.md)
- [08-production-readiness-report.md](./08-production-readiness-report.md)
- [16-hypercare-plan.md](./16-hypercare-plan.md)
- `docs/governance/risk-summary-43dff9d.md`
