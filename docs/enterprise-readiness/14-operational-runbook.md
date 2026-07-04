# 14. Operational Runbook — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Audience:** Operations, DevOps, release managers, site reliability engineers, support leads  
**Scope:** Day-to-day operation of Clinical Workspace 2.0 after controlled go-live.

---

## 1. Service Overview

| Attribute | Value |
|-----------|-------|
| Application | Clinical Workspace 2.0 — Intelligent Clinical Journey |
| Primary route (prototype) | `/prototype/clinical-workspace-2` |
| Future production route | To be determined; isolated behind feature flag |
| Data mode | Prototype uses client-side state; production will integrate with backend services |
| Critical users | Physicians, nurses, patients, legal/compliance reviewers |
| Business impact | High — affects informed consent validity and patient safety |

---

## 2. Environment Reference

| Environment | URL Pattern | Data | Purpose |
|-------------|-------------|------|---------|
| Local dev | `http://localhost:3000/prototype/clinical-workspace-2` | Mock | Developer / QA validation |
| Staging | `https://staging.wathiqcare.online/prototype/clinical-workspace-2` | Synthetic | Integration / UAT |
| Production preview | To be enabled via feature flag | Real (when authorized) | Controlled pilot |
| Full production | To be enabled via feature flag | Real | Full rollout |

---

## 3. Health Checks

| Check | Command / Action | Expected Result | Frequency |
|-------|------------------|-----------------|-----------|
| Application health | `GET /api/health` | HTTP 200, healthy status | Continuous |
| Workspace route load | Open `/prototype/clinical-workspace-2` | Page loads without console errors | Every 15 min in pilot |
| Feature flag state | Inspect flag admin / config | Matches intended rollout group | Every 15 min |
| Smoke script | `node qa-screenshots/capture-workspace-2-flow.mjs` | All scenarios pass | After each deployment |
| Error rate | Monitor dashboard | Error rate < 0.1% | Continuous |
| Package resolution time | Monitor dashboard | p95 < 500 ms | Continuous |

---

## 4. Key Metrics and Dashboards

| Metric | Definition | Alert Threshold | Owner |
|--------|------------|-----------------|-------|
| Workspace availability | % of successful page loads | < 99.5% over 5 min | DevOps |
| Package resolution time | Time from procedure selection to ready state | p95 > 500 ms | Engineering |
| Consent dispatch success | % of successful sends | < 98% over 15 min | QA / Product |
| Patient completion rate | % of dispatched consents completed | < 85% over 1 hour | Product |
| Signature capture success | % of decisions resulting in captured signature | < 98% over 15 min | QA |
| Refusal rate | % of decisions marked refused | Sudden spike > 2× baseline | Clinical SME |
| Error rate | 5xx / client errors | > 0.1% over 5 min | DevOps |
| Accessibility scan score | axe-core / Lighthouse a11y score | < 90 | Compliance |

---

## 5. Routine Operational Procedures

### 5.1 Daily Operations

1. Review overnight monitoring alerts.
2. Verify feature flag states match rollout plan.
3. Confirm smoke tests passed on the latest environment.
4. Check open support tickets related to consent workflow.
5. Attend hypercare standup during the first 30 days.

### 5.2 Weekly Operations

1. Review metrics trends: completion rate, resolution time, error rate.
2. Validate evidence exports for a sample of consents.
3. Review and update Known Issues Register.
4. Confirm backup and retention jobs completed.
5. Update stakeholders on rollout status.

### 5.3 Post-Deployment Verification

1. Run smoke script against the deployed environment.
2. Verify feature flags and environment variables.
3. Confirm monitoring dashboards are receiving data.
4. Check that rollback path remains available.
5. Notify Release Manager and Support Lead of deployment status.

---

## 6. Incident Response

### 6.1 Severity Classification

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| SEV-1 | Patients cannot complete consents; safety or legal risk. | 15 minutes |
| SEV-2 | Major workflow impairment; workaround exists. | 1 hour |
| SEV-3 | Partial degradation or non-critical defect. | 4 hours |
| SEV-4 | Question, cosmetic issue, or monitoring alert. | Next business day |

### 6.2 Common Incidents and Actions

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Workspace route 404 | Feature flag disabled or alias removed | Verify flag / alias; rollback if unintended |
| Package resolution hangs | Mock / live CKE unavailable | Check CKE service health; fallback to manual consent selection |
| Approve draft disabled | Alerts unacknowledged or blocker present | Guide physician to acknowledge alerts or resolve blocker |
| Patient cannot verify OTP | OTP service issue | Check OTP provider; use alternative workflow if configured |
| Evidence export missing fields | Export bug or incomplete journey | Capture timeline screenshot; log defect; do not delete session |
| High error rate after release | Bad deployment | Execute rollback checklist |

### 6.3 Escalation Matrix

| Incident Type | First Responder | Escalation | Executive Escalation |
|---------------|-----------------|------------|----------------------|
| Technical failure | DevOps / SRE | Engineering Lead | CIO |
| Clinical workflow issue | Support Lead / Clinical SME | Medical Director | Medical Director |
| Legal / consent validity | Legal on-call | Head of Legal | CEO |
| Security / PHI concern | InfoSec on-call | CISO / InfoSec Lead | CIO / CEO |
| Feature flag misconfiguration | Engineering | Release Manager | CIO |

---

## 7. Rollback Procedure

For detailed steps, see [07-rollback-checklist.md](./07-rollback-checklist.md). At a high level:

1. Disable the workspace feature flag.
2. Remove or redirect production alias if activated.
3. Preserve active signing sessions; allow graceful completion or timeout.
4. Confirm audit logs and evidence packages are retained.
5. Communicate to clinical leadership, support, and legal/compliance as needed.

---

## 8. Backup and Recovery

| Item | Frequency | Retention | Owner |
|------|-----------|-----------|-------|
| Audit timeline database | Continuous replication | Per retention policy | DBA |
| Evidence exports | On each export + nightly sync | Per retention policy | DBA / InfoSec |
| Feature flag configuration | After each change | 90 days | Engineering |
| Application logs | Continuous | 90 days | DevOps |
| Database backups | Daily | 30 days minimum | DBA |

---

## 9. Access Control

| Role | Permissions |
|------|-------------|
| Physician | Use workspace, preview patient journey, send consent |
| Nurse / support | Assist patient journey, adjust accessibility controls |
| Admin / DevOps | Manage feature flags, environment variables, deployments |
| Legal / compliance | Read-only access to timeline and evidence exports |
| InfoSec | Audit logs, security reviews, incident response |

---

## 10. Contacts

| Role | Name | Contact | Notes |
|------|------|---------|-------|
| Enterprise Readiness Lead | | | Overall package owner |
| Release Manager | | | Go-live and rollback authority |
| Engineering Lead | | | Technical escalation |
| Clinical SME / Medical Director | | | Clinical authority |
| Legal Affairs Lead | | | Consent validity questions |
| Compliance Lead | | | Accessibility / audit questions |
| InfoSec Lead | | | Security / PHI incidents |
| Support Lead | | | Day-to-day ticket escalation |

---

## 11. Related Documents

- [07-rollback-checklist.md](./07-rollback-checklist.md)
- [15-support-handover-guide.md](./15-support-handover-guide.md)
- [16-hypercare-plan.md](./16-hypercare-plan.md)
- [11-go-live-checklist.md](./11-go-live-checklist.md)
- `docs/governance/operational-escalation-matrix.md`
- `docs/governance/audit-retention-policy.md`
