# 11. Go-Live Checklist — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Scope:** Controlled go-live of Clinical Workspace 2.0 beyond prototype validation.

Use this checklist to confirm that all prerequisites are satisfied before activating Clinical Workspace 2.0 in a target environment.

---

## 11.1 Pre-Go-Live (T-7 Days)

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | Remote signing route `/sign/[token]/workflow` implemented behind a feature flag. | Engineering | ☐ | Pull request / deployment note |
| 2 | Clinical Knowledge Engine live contract validated and alerts reviewed by Clinical SME. | Clinical Knowledge / SME | ☐ | Validation report |
| 3 | Load and concurrency tests executed in staging with acceptable results. | QA / DevOps | ☐ | Test report |
| 4 | Legal review of refusal language and patient copy completed and signed. | Legal Affairs | ☐ | Legal sign-off |
| 5 | Third-party accessibility audit completed with no critical/serious findings, or remediation verified. | Compliance | ☐ | Audit report |
| 6 | UAT Plan entry and exit criteria met; P0/P1 defects closed or accepted as observations. | UAT Lead / QA | ☐ | UAT report |
| 7 | All test scripts executed and evidence captured. | QA | ☐ | Test evidence folder |
| 8 | Training delivered to physicians, nurses, legal reviewers, and support staff. | Training Lead | ☐ | Attendance records |
| 9 | Operational Runbook and Support Handover Guide reviewed with on-call team. | Operations / Support Lead | ☐ | Review minutes |
| 10 | Deployment checklist complete and signed. | Release Manager | ☐ | [06-deployment-checklist.md](./06-deployment-checklist.md) |
| 11 | Rollback checklist rehearsed (tabletop exercise). | Release Manager | ☐ | [07-rollback-checklist.md](./07-rollback-checklist.md) |
| 12 | Monitoring dashboards and alert thresholds configured. | DevOps | ☐ | Dashboard URL |
| 13 | Feature flag targeting and kill-switch tested in staging. | Engineering / InfoSec | ☐ | Test result |
| 14 | Database backups validated and recovery time objective (RTO) confirmed. | DBA / DevOps | ☐ | Backup report |
| 15 | Communications plan approved and messages ready to send. | Communications | ☐ | Comms pack |

---

## 11.2 Day-Before (T-1 Day)

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| 16 | Final build tagged and promoted to target environment. | Release Manager | ☐ | Tag / release note |
| 17 | Smoke tests pass in target environment. | QA | ☐ | Smoke result |
| 18 | Feature flag is OFF for general users; ON only for pilot group. | Engineering | ☐ | Flag state screenshot |
| 19 | Hypercare roster published and contacts confirmed. | Operations | ☐ | Roster |
| 20 | Escalation matrix distributed to support and clinical leadership. | Support Lead | ☐ | Distribution list |
| 21 | Patient-facing support line briefed on consent journey and known issues. | Support Lead | ☐ | Briefing notes |

---

## 11.3 Go-Live Day (T-0)

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| 22 | Enable feature flag for pilot group at agreed time. | Engineering | ☐ | Change log |
| 23 | Verify workspace loads and mock/prod mode is correct. | QA | ☐ | Smoke result |
| 24 | Monitor error rates, package resolution time, and signature completion rate for first 2 hours. | DevOps / QA | ☐ | Monitoring dashboard |
| 25 | Hold hypercare standup at +2 hours and +8 hours. | Operations | ☐ | Standup notes |
| 26 | Confirm no P0/P1 incidents within first 4 hours. | Release Manager | ☐ | Incident log |
| 27 | Capture first-patient-through feedback from physician and nurse. | UAT Lead | ☐ | Feedback form |

---

## 11.4 Post-Go-Live (T+1 to T+7 Days)

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| 28 | Daily hypercare rounds and defect triage. | Operations | ☐ | Daily logs |
| 29 | Validate evidence exports for first 5 consents. | QA / Compliance | ☐ | Evidence samples |
| 30 | Review accessibility feedback from pilot sites. | Compliance | ☐ | Feedback summary |
| 31 | Confirm rollback path remains available and tested. | Release Manager | ☐ | Rollback rehearsal record |
| 32 | Update Known Issues Register and Open Risks Register. | Enterprise Readiness Lead | ☐ | [17-known-issues-register.md](./17-known-issues-register.md), [18-open-risks-register.md](./18-open-risks-register.md) |

---

## 11.5 Hypercare Exit (T+30 Days)

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| 33 | Hypercare metrics reviewed against exit criteria. | Operations | ☐ | Hypercare report |
| 34 | Open defects and risks triaged to normal operations backlog. | Enterprise Readiness Lead | ☐ | Backlog items |
| 35 | Operational Runbook updated with lessons learned. | Operations | ☐ | Updated runbook |
| 36 | Stakeholder sign-offs obtained for full rollout or next phase. | Executive Sponsor | ☐ | [13-stakeholder-signoff-templates.md](./13-stakeholder-signoff-templates.md) |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Manager | | | |
| Clinical SME / Medical Director | | | |
| Legal Affairs | | | |
| Compliance | | | |
| InfoSec | | | |
| Operations | | | |
| Support Lead | | | |

---

**Notes:**

- Do not proceed past T-0 until all T-7 and T-1 items are complete or formally accepted as observations by the Executive Sponsor.
- Keep this checklist with the [08-production-readiness-report.md](./08-production-readiness-report.md).
