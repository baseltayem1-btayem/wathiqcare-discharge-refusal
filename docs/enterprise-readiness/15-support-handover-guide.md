# 15. Support Handover Guide — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Audience:** Tier 1 support, tier 2 support, help desk, clinical super-users, support leads  
**Scope:** Supporting Clinical Workspace 2.0 during UAT, pilot, and hypercare.

---

## 1. Support Model

| Tier | Responsibilities | Escalation Trigger |
|------|------------------|--------------------|
| Tier 1 — Help Desk | Password resets, browser issues, navigation help, accessibility controls | Clinical question, defect, or security concern |
| Tier 2 — Clinical / Technical Support | Workflow issues, alert interpretation, evidence export, feature flags | Suspected bug, production incident, or legal/compliance issue |
| Tier 3 — Engineering / Clinical SME | Code defects, CKE integration issues, security incidents, architectural decisions | SEV-1/SEV-2 incident or unresolved Tier 2 issue |

---

## 2. What Support Needs to Know

- Clinical Workspace 2.0 is a **prototype / pilot** consent workflow.
- It runs behind a feature flag and uses **mock data** in the prototype environment.
- Physicians select a patient, encounter, and procedure; the system resolves the consent package.
- Patients review education, ask questions, decide, and sign in Arabic or English.
- Refusals are valid outcomes and must be handled respectfully and documented fully.
- Every critical action creates an event in the clinical timeline with an evidence hash.

---

## 3. Common Issues and Resolution

### Physician workspace

| Issue | Question to Ask | Resolution | Escalate If |
|-------|-----------------|------------|-------------|
| Cannot find patient | Is the patient in the mock list? | Use only approved mock patients for UAT. | Real patient expected. |
| Approve draft button disabled | Are there unacknowledged alerts or missing selections? | Complete patient/procedure selection; acknowledge all alerts. | Button remains disabled after all alerts acknowledged. |
| Cannot send to patient | Is the draft approved? Are there blockers (guardian, witness)? | Approve draft; resolve blockers per Physician Quick Guide. | Blocker should not apply. |
| Preview patient journey not working | Is the workspace still loading? | Refresh; reselect patient/procedure. | Console errors persist. |

### Patient journey

| Issue | Question to Ask | Resolution | Escalate If |
|-------|-----------------|------------|-------------|
| Language is wrong | Which language does the patient prefer? | Tap **English** or **العربية** at the top of the screen. | Toggle does not work. |
| Text too small / hard to read | Does the patient need larger text or high contrast? | Use Text size and High contrast controls. | Controls do not apply. |
| Comprehension check fails | Did the patient answer incorrectly? | Let the patient review the education tab and retry. | Questions are unclear or incorrect. |
| OTP not received / verify fails | Is this the prototype? | OTP is simulated in the prototype; tap **Verify OTP**. | Verify OTP button fails. |
| Cannot sign | Has the patient completed all steps and required participants? | Complete guardian/interpreter/witness steps if required. | Signature step errors. |
| Refusal flow confusing | Does the patient understand refusal is an option? | Explain that care will not be affected; guide through acknowledgment. | Patient feels pressured. |

### Evidence and timeline

| Issue | Question to Ask | Resolution | Escalate If |
|-------|-----------------|------------|-------------|
| Timeline event missing | Did the action complete successfully? | Retry action; capture screenshot. | Repeated missing events. |
| Evidence export empty | Was the journey completed? | Complete journey and click Export evidence again. | Export still empty. |
| Evidence hash missing | Is it a non-critical event? | Only critical events require hashes; log if expected event lacks hash. | Signature/completion event lacks hash. |

---

## 4. Ticket Categorization

| Category | Examples | Team |
|----------|----------|------|
| Access / login | Cannot log in, wrong role, no workspace access | Tier 1 |
| UI / localization | RTL issue, untranslated text, clipped layout | Tier 2 → Engineering |
| Workflow | Cannot approve, send, or complete journey | Tier 2 |
| Clinical content | Wrong risk, missing alert, incorrect package | Tier 2 → Clinical SME |
| Accessibility | Text size, high contrast, keyboard navigation | Tier 2 → Compliance |
| Evidence / audit | Missing timeline event, export error | Tier 2 → QA / InfoSec |
| Performance | Slow page loads, timeouts | Tier 2 → DevOps |
| Security / PHI | Suspected data leak, unauthorized access | Tier 3 → InfoSec immediately |
| Legal / consent validity | Question about refusal, signature validity | Tier 3 → Legal |

---

## 5. Escalation Path

```
Tier 1 Help Desk
└─ Cannot resolve in 15 minutes or clinical/security concern
   └─ Tier 2 Support
      └─ Defect, incident, or specialized concern
         ├─ Engineering / DevOps (technical)
         ├─ Clinical SME (clinical content/workflow)
         ├─ Legal Affairs (consent validity)
         ├─ Compliance (accessibility / audit)
         └─ InfoSec (security / PHI)
            └─ Executive Sponsor (SEV-1 or reputational risk)
```

---

## 6. Tools and Resources

| Resource | Location | Use |
|----------|----------|-----|
| Physician Quick Guide | [training/physician-quick-guide.md](./training/physician-quick-guide.md) | Troubleshooting physician steps |
| Nurse Support Guide | [training/nurse-support-guide.md](./training/nurse-support-guide.md) | Helping patients through the journey |
| Patient Explanation | [training/patient-explanation.md](./training/patient-explanation.md) | Patient-facing explanation |
| Legal Reviewer Guide | [training/legal-reviewer-guide.md](./training/legal-reviewer-guide.md) | Legal/audit questions |
| Operational Runbook | [14-operational-runbook.md](./14-operational-runbook.md) | Incident response and monitoring |
| Known Issues Register | [17-known-issues-register.md](./17-known-issues-register.md) | Current limitations and workarounds |
| Smoke script | `qa-screenshots/capture-workspace-2-flow.mjs` | Reproduce issues |
| Playwright spec | `apps/web/tests/clinical-workspace-2.spec.ts` | Automated regression |

---

## 7. Communication Templates

### 7.1 User-Facing Maintenance Notice

> Clinical Workspace 2.0 is temporarily unavailable while we address an issue. Active signing sessions are not affected. Please use the standard consent process in the interim. We will update you within [timeframe].

### 7.2 Internal Incident Notification

> Issue: [brief description]  
> Impact: [who is affected and how]  
> Severity: [SEV-1 / SEV-2 / SEV-3 / SEV-4]  
> Workaround: [if any]  
> Owner: [name]  
> Next update: [time]

---

## 8. Hypercare Support Roster (First 30 Days)

| Period | Coverage | Primary Contact | Backup Contact |
|--------|----------|-----------------|----------------|
| Week 1 — Days 1–7 | 08:00–22:00 | | |
| Week 2 — Days 8–14 | 08:00–20:00 | | |
| Week 3 — Days 15–21 | 08:00–18:00 | | |
| Week 4 — Days 22–30 | Business hours | | |

Fill in contacts before go-live. See [16-hypercare-plan.md](./16-hypercare-plan.md) for full hypercare schedule.

---

## 9. Training for Support Staff

Before handling live tickets, support staff must:

1. Read the Physician Quick Guide and Nurse Support Guide.
2. Walk through the patient journey in both Arabic and English.
3. Practice the refusal flow.
4. Review the Known Issues Register.
5. Understand the escalation matrix.

---

## 10. Knowledge Base Articles to Create

| Article | Owner | Target Date |
|---------|-------|-------------|
| How to reset a signing session | Tier 2 | Before go-live |
| How to explain the refusal flow to a patient | Nurse lead | Before go-live |
| How to export evidence for a compliance request | Compliance / Tier 2 | Before go-live |
| Feature flag states and how to check them | DevOps | Before go-live |
| Accessibility controls quick reference | Compliance / Tier 1 | Before go-live |

---

**Related documents:** [14-operational-runbook.md](./14-operational-runbook.md), [16-hypercare-plan.md](./16-hypercare-plan.md), [17-known-issues-register.md](./17-known-issues-register.md).
