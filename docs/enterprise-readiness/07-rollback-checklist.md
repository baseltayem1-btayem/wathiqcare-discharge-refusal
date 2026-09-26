# 7. Rollback Checklist — Clinical Workspace 2.0

## When to rollback

Rollback is appropriate when any of the following occur after controlled release:

- Critical defect affecting patient safety or consent validity.
- Legal or compliance issue discovered in consent language or refusal handling.
- Security incident involving consent data or session tokens.
- Feature flag misconfiguration exposing the workspace to unauthorized users.
- Performance degradation preventing timely consent completion.

---

## Who approves rollback

| Environment | Approver |
|-------------|----------|
| UAT / Staging | UAT Lead + Engineering Lead |
| Controlled production preview | Release Manager + Clinical SME + Legal (if consent-related) |
| Full production | Executive Sponsor + Release Manager + Clinical SME + Legal + InfoSec |

---

## Rollback actions

### Step 1: Stop new traffic

| # | Action | Owner |
|---|--------|-------|
| 1 | Disable the workspace feature flag. | Engineering |
| 2 | Remove or redirect the production alias if activated. | DevOps |
| 3 | Update load balancer / edge config to block new workspace sessions. | DevOps |

### Step 2: Preserve active signing sessions

| # | Action | Owner |
|---|--------|-------|
| 4 | Do not terminate in-progress patient signing sessions abruptly. | Engineering |
| 5 | Allow patients currently signing to complete or time out gracefully. | Engineering |
| 6 | Display a maintenance message only for new sessions, not active ones. | Engineering / UX |

### Step 3: Preserve audit logs and evidence

| # | Action | Owner |
|---|--------|-------|
| 7 | Confirm audit timeline events are immutable and retained. | Engineering / DBA |
| 8 | Export current evidence packages for affected consents. | QA / Compliance |
| 9 | Do not delete or modify existing signature records. | Engineering |

### Step 4: Verify rollback

| # | Action | Owner |
|---|--------|-------|
| 10 | Confirm `/prototype/clinical-workspace-2` returns 404 or maintenance page for new users. | QA |
| 11 | Confirm existing production consent workflows are unaffected. | QA |
| 12 | Verify no workspace-related errors in monitoring. | DevOps |

### Step 5: Communicate

| # | Action | Owner |
|---|--------|-------|
| 13 | Notify clinical leadership and department heads. | Release Manager |
| 14 | Notify support team with approved talking points. | Support Lead |
| 15 | Send incident summary to legal and compliance if required. | Release Manager |
| 16 | Update status page or internal communication channel. | Communications |

---

## Rollback decision tree

```
Critical issue detected?
├─ Yes
│  ├─ Affects patient safety or consent validity?
│  │  ├─ Yes → Immediate rollback approved by Release Manager + Clinical SME + Legal
│  │  └─ No → Evaluate workaround within 30 minutes
│  │       ├─ Workaround acceptable? → Monitor
│  │       └─ No workaround? → Rollback approved by Release Manager + Clinical SME
│  └─ Security incident? → Immediate rollback + InfoSec escalation
└─ No → Continue monitoring
```

---

## Post-rollback tasks

| # | Action | Owner |
|---|--------|-------|
| 17 | Document root cause in incident report. | Engineering |
| 18 | Capture affected consent references and evidence hashes. | Compliance |
| 19 | Decide if existing signed consents remain valid or require re-signing. | Legal + Clinical SME |
| 20 | Update [Production Readiness Report](./08-production-readiness-report.md) status to NO GO until fix verified. | Release Manager |
| 21 | Schedule re-validation before re-enabling the workspace. | UAT Lead |

---

## Rollback tabletop exercise

| Question | Answer |
|----------|--------|
| How long to disable the flag? | < 5 minutes |
| How long to redirect alias? | < 10 minutes |
| How are active sessions handled? | Graceful completion or timeout |
| Are audit logs preserved? | Yes, immutable |
| Who communicates to clinical staff? | Release Manager |
| Who decides on re-signing? | Legal + Clinical SME |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Manager | | | |
| Engineering Lead | | | |
| Clinical SME | | | |
| Legal Affairs | | | |
| InfoSec | | | |
