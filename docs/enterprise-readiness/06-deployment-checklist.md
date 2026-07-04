# 6. Controlled Deployment Checklist — Clinical Workspace 2.0

Use this checklist before promoting Clinical Workspace 2.0 beyond prototype/validation environments.

---

## 6.1 Feature Flags

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Workspace route isolated behind a feature flag or non-production path. | Engineering | ☐ |
| 2 | Flag can be disabled without a new deployment. | Engineering | ☐ |
| 3 | Flag targeting limits access to authorized users/tenants. | Engineering / Security | ☐ |
| 4 | Remote signing flag is separate and can be enabled independently. | Product / Engineering | ☐ |

---

## 6.2 Environment Variables

| # | Task | Owner | Status |
|---|------|-------|--------|
| 5 | All required environment variables documented in `.env.example`. | Engineering | ☐ |
| 6 | No production secrets required for prototype validation. | Security | ☐ |
| 7 | Mock data mode explicitly enabled for UAT. | Engineering | ☐ |
| 8 | Feature flag values verified in target environment. | DevOps | ☐ |

---

## 6.3 Database Readiness

| # | Task | Owner | Status |
|---|------|-------|--------|
| 9 | Prototype uses client-side state; no DB changes required for validation. | Engineering | ☐ |
| 10 | Future production integration migrations are planned and reviewed. | Engineering | ☐ |
| 11 | Database backup confirmed before any production schema change. | DBA / DevOps | ☐ |

---

## 6.4 Seed Validation

| # | Task | Owner | Status |
|---|------|-------|--------|
| 12 | Mock patients, encounters, and procedures are deterministic. | QA | ☐ |
| 13 | Test data does not include real patient identifiers. | Compliance | ☐ |
| 14 | UAT scripts reference only approved mock data. | UAT Lead | ☐ |

---

## 6.5 Smoke Tests

| # | Task | Owner | Status |
|---|------|-------|--------|
| 15 | Standalone smoke script passes: `node qa-screenshots/capture-workspace-2-flow.mjs`. | QA | ☐ |
| 16 | Playwright spec passes: `npx playwright test apps/web/tests/clinical-workspace-2.spec.ts`. | QA | ☐ |
| 17 | ESLint clean for prototype path. | Engineering | ☐ |
| 18 | TypeScript clean for prototype path. | Engineering | ☐ |
| 19 | Unit test suite passes: `npm run test -w @wathiqcare/web`. | QA | ☐ |

---

## 6.6 UAT Sign-Off

| # | Task | Owner | Status |
|---|------|-------|--------|
| 20 | UAT Plan reviewed and approved. | UAT Lead | ☐ |
| 21 | All P0/P1 test scripts executed with no open defects. | QA | ☐ |
| 22 | Clinical scenarios validated by Clinical SME. | Clinical SME | ☐ |
| 23 | Accessibility and bilingual requirements verified. | Compliance | ☐ |
| 24 | Legal reviewer signs off on refusal and evidence. | Legal | ☐ |

---

## 6.7 Production Alias Verification

| # | Task | Owner | Status |
|---|------|-------|--------|
| 25 | Production alias or route is not yet activated for Clinical Workspace 2.0. | Release Manager | ☐ |
| 26 | Existing production consent routes remain untouched. | Engineering | ☐ |
| 27 | Remote signing production route (`/sign/[token]/workflow`) gap is documented. | Product | ☐ |

---

## 6.8 Monitoring

| # | Task | Owner | Status |
|---|------|-------|--------|
| 28 | Error tracking configured for workspace route (if promoted beyond prototype). | DevOps | ☐ |
| 29 | Key metrics defined: package resolution time, send success, patient completion rate. | Product / DevOps | ☐ |
| 30 | Alert thresholds set for failed package resolution or signature capture. | DevOps | ☐ |

---

## 6.9 Rollback Point

| # | Task | Owner | Status |
|---|------|-------|--------|
| 31 | Rollback checklist reviewed and accessible. | Release Manager | ☐ |
| 32 | Feature flag kill switch tested. | Engineering | ☐ |
| 33 | Rollback communication plan approved. | Communications | ☐ |
| 34 | Active session preservation strategy confirmed. | Engineering | ☐ |

---

## 6.10 Communication Plan

| # | Task | Owner | Status |
|---|------|-------|--------|
| 35 | Clinical leadership notified of UAT window. | UAT Lead | ☐ |
| 36 | Physicians and nurses trained using provided guides. | Training Lead | ☐ |
| 37 | Support team briefed on common issues and escalation path. | Support Lead | ☐ |
| 38 | Post-UAT feedback sessions scheduled. | UAT Lead | ☐ |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Manager | | | |
| Clinical SME | | | |
| Legal Affairs | | | |
| Compliance | | | |
| InfoSec | | | |
| Engineering Lead | | | |

---

**Note:** This checklist remains in **NO GO** status until all items are complete and the [Production Readiness Report](./08-production-readiness-report.md) is signed.
