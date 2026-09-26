# 12. Production Validation Matrix — Clinical Workspace 2.0

**Version:** 1.0  
**Date:** 2026-06-26  
**Scope:** Map each capability to the environment where it is validated, the method used, the owner, and the current status.

---

## 1. Legend

| Status | Meaning |
|--------|---------|
| ✅ Validated | Evidence exists and has been reviewed. |
| 🟡 Partial | Validation in progress or dependent on another item. |
| ⏸️ Not started | Not yet validated in this environment. |
| ❌ Blocked | Cannot validate until a blocker is resolved. |

---

## 2. Capability Validation Matrix

| Capability | Acceptance Criteria | Prototype | Staging | Production | Method | Owner | Status |
|------------|---------------------|-----------|---------|------------|--------|-------|--------|
| Patient selection and encounter auto-resolution | PU-01, PU-02 | Smoke script, TS-01 | Planned | N/A | Automated + manual | QA | ✅ Validated (prototype) |
| Clinical Knowledge Package auto-resolution | PU-02, CPA-01, CKP-01 | Mock data, TS-01, TS-06 | Planned | N/A | Automated + SME review | Clinical Knowledge / QA | 🟡 Partial (mock engine) |
| Alert surfacing and acknowledgment | PU-03, DR-05, DR-06, TS-09 | Smoke script, TS-06, TS-09 | Planned | N/A | Automated + manual | QA / Clinical SME | ✅ Validated (prototype) |
| Physician draft approval and send | PU-03, PU-06, TS-01 | Smoke script, TS-01 | Planned | N/A | Automated + manual | QA | ✅ Validated (prototype) |
| Patient education and comprehension check | PE-01, PE-02, TS-02 | Smoke script, TS-02 | Planned | N/A | Manual + screenshots | QA / Clinical SME | ✅ Validated (prototype) |
| Patient question submission | PE-03, SC-07, TS-02 | Smoke script, TS-02 | Planned | N/A | Automated | QA | ✅ Validated (prototype) |
| Patient accept and sign | LD-01, LD-03, TS-02 | Smoke script, TS-02 | Planned | N/A | Automated + manual | QA / Legal | ✅ Validated (prototype) |
| Patient refusal and signature | LD-02, AE-04, TS-07 | Smoke script, TS-07 | Planned | N/A | Automated + manual | QA / Legal | ✅ Validated (prototype) |
| Guardian flow | DR-01, TS-03 | TS-03 | Planned | N/A | Manual | QA / Clinical SME | ⏸️ Not started |
| Interpreter flow | DR-02, TS-04 | TS-04 | Planned | N/A | Manual | QA / Compliance | ⏸️ Not started |
| Witness flow | DR-03, DR-04, TS-05 | TS-05 | Planned | N/A | Manual | QA | ⏸️ Not started |
| Arabic RTL journey | BL-01, BL-02, BL-03, TS-12 | TS-12 | Planned | N/A | Manual + screenshots | QA / Compliance | ⏸️ Not started |
| English LTR journey | BL-01, BL-03, TS-13 | TS-13 | Planned | N/A | Manual + screenshots | QA | ⏸️ Not started |
| Accessibility text size / high contrast | AC-01, AC-02, TS-11 | TS-11 | Planned | N/A | Manual + automated scan | Compliance / QA | 🟡 Partial (manual) |
| Remote signing readiness badge | TS-10 | TS-10 | N/A | ❌ Blocked | Manual | QA / Product | ❌ Blocked (route missing) |
| Audit timeline completeness | AE-01, AE-02, AE-03, TS-14 | Smoke script, TS-14 | Planned | N/A | Automated + JSON review | QA / InfoSec | ✅ Validated (prototype) |
| Evidence export schema | EP-01, EP-02, EP-03, TS-15 | TS-15 | Planned | N/A | JSON schema validation | QA / Legal | ✅ Validated (prototype) |
| Rollback without data loss | RR-01, RR-02, RR-03, TS-16 | Tabletop | Planned | N/A | Tabletop exercise | Release Manager | 🟡 Partial (planned) |
| Load / concurrency | PF-04 | N/A | ❌ Blocked | N/A | Load test | QA / DevOps | ❌ Blocked (not scheduled) |
| Feature flag kill switch | RR-01 | Manual toggle | Planned | N/A | Kill-switch test | Engineering / InfoSec | 🟡 Partial (manual) |
| Production route isolation | RR-01, deployment checklist | Confirmed | N/A | N/A | Code review | Release Manager / Engineering | ✅ Validated |

---

## 3. Environment Definitions

| Environment | Purpose | Data |
|-------------|---------|------|
| Prototype | Local validation and UAT | Deterministic mock data only |
| Staging | Pre-production integration and load testing | Synthetic test data |
| Production | Live clinical use | Real patient data (when authorized) |

---

## 4. Validation Dependencies

| Capability | Depends On | Next Action |
|------------|------------|-------------|
| Remote signing badge / route | Build of `/sign/[token]/workflow` | Create engineering ticket |
| Live CKE package resolution | Live CKE API contract | Validate mapping in staging |
| Load / concurrency | Staging environment and test scripts | Schedule load test |
| Guardian / interpreter / witness flows | UAT participants available | Schedule UAT sessions |
| Arabic / English full validation | Bilingual testers | Schedule UAT sessions |
| Third-party accessibility audit | Vendor engagement | Procurement / scheduling |

---

## 5. Evidence Locations

| Evidence Type | Location |
|---------------|----------|
| Smoke script | `qa-screenshots/capture-workspace-2-flow.mjs` |
| Playwright spec | `apps/web/tests/clinical-workspace-2.spec.ts` |
| Screenshots | `qa-screenshots/` |
| Mock evidence package | [evidence/mock-evidence-package.md](./evidence/mock-evidence-package.md) |
| UAT test scripts | [02-test-scripts.md](./02-test-scripts.md) |
| Acceptance criteria | [04-acceptance-criteria.md](./04-acceptance-criteria.md) |

---

## 6. Review Cadence

- **Prototype phase:** Update this matrix after each UAT session or automated run.
- **Staging phase:** Validate all "Planned" items before production promotion.
- **Production phase:** Validate only after remote signing route and live CKE integration are complete.

---

**Related documents:** [04-acceptance-criteria.md](./04-acceptance-criteria.md), [02-test-scripts.md](./02-test-scripts.md), [08-production-readiness-report.md](./08-production-readiness-report.md).
