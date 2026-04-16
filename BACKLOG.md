# WathiqCare Investment-Readiness Backlog

**Status:** Created 2026-04-16  
**Timeline:** 12 weeks (M1–M5)  
**Repository:** baseltayem1-btayem/wathiqcare-discharge-refusal  

---

## 📋 Labels (Priority + Scope)

```
epic        → Epic-level initiative
story       → User story
task        → Implementation task
legal       → Legal/medico-legal domain
security    → Security/compliance
ux          → User experience/design
integration → Third-party/external systems
ops         → Operations/infrastructure
high        → P0 priority (critical path)
medium      → P1 priority (planned)
low         → P2 priority (backlog)
```

---

## 🎯 Milestones

| Milestone | Duration | Focus |
|---|---|---|
| **M1: Legal Closure** | Weeks 1–2 | PKI, TSA, Verifier |
| **M2: UX Simplification** | Weeks 3–4 | 3-step flow, templates, autofill |
| **M3: IMC Pilot** | Weeks 5–6 | ER/IPD deployment, metrics |
| **M4: Trust & Court Pack** | Weeks 7–8 | Cover page, timeline, export bundle |
| **M5: Integrations** | Weeks 9–12 | EMR, SMS, e-Signature |

---

## 🚀 EPIC 1: Legal Closure (PKI + TSA + Verifier)

**Priority:** HIGH  
**Milestone:** M1  
**Labels:** epic, legal, security, high  
**Business Value:** Enable medico-legal evidence integrity verification for court acceptance and non-repudiation compliance.

### Acceptance Criteria
- [ ] PKCS#7 manifest signatures generated and validated
- [ ] RFC3161 TSA timestamps integrated and verified
- [ ] Verifier CLI tool functional for local verification
- [ ] `/api/discharge/cases/[caseId]/verify` endpoint operational
- [ ] All tests passing (unit, integration, production smoke)
- [ ] Zero breaking changes in existing discharge workflow

---

### Story 1.1: Implement PKCS#7 Manifest Signature

**Priority:** HIGH  
**Labels:** story, legal, security, high  
**Acceptance Criteria:**
- [ ] `jsrsasign` or equivalent signing library integrated
- [ ] Manifest JSON serialization + canonical ordering implemented
- [ ] Signature file (manifest.sig) generated and attached to bundle
- [ ] Signature validation in verifier returns trusted/untrusted status

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 1.1.1 | Add signing library (jsrsasign/node-jose) to package.json | Backend | TODO |
| 1.1.2 | Create SignatureManager class for manifest signing | Backend | TODO |
| 1.1.3 | Generate canonical JSON + PKCS#7 signature | Backend | TODO |
| 1.1.4 | Attach .sig file to discharge bundle | Backend | TODO |
| 1.1.5 | Add signature validation unit tests | Backend | TODO |

---

### Story 1.2: Implement RFC3161 TSA Integration

**Priority:** HIGH  
**Labels:** story, legal, security, high  
**Acceptance Criteria:**
- [ ] TSA client configured and tested against test/production servers
- [ ] Timestamp token (.tsr) generated and validated
- [ ] Token attached to bundle with metadata
- [ ] Verifier can parse and validate RFC3161 tokens

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 1.2.1 | Integrate RFC3161 TSA library | Backend | TODO |
| 1.2.2 | Configure TSA endpoint (test + production) | DevOps | TODO |
| 1.2.3 | Implement timestamp request/response cycle | Backend | TODO |
| 1.2.4 | Attach .tsr token to bundle metadata | Backend | TODO |
| 1.2.5 | Add TSA validation in verifier | Backend | TODO |

---

### Story 1.3: Build Verifier CLI + API

**Priority:** HIGH  
**Labels:** story, legal, security  
**Acceptance Criteria:**
- [ ] CLI tool: `wathiq-verify bundle.zip → valid/invalid + details`
- [ ] API endpoint: `GET /api/verify?bundleId=xxx → { valid, signature, timestamp, metadata }`
- [ ] Both report signature status, TSA chain, and manifest integrity
- [ ] Error messages distinguish: missing sig, invalid sig, trusted CA, expired, etc.

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 1.3.1 | Create verifier CLI entry point | Backend | TODO |
| 1.3.2 | Implement signature validation logic | Backend | TODO |
| 1.3.3 | Implement TSA token validation logic | Backend | TODO |
| 1.3.4 | Create `/api/verify` endpoint | Backend | TODO |
| 1.3.5 | Add comprehensive test suite (unit + integration) | QA | TODO |
| 1.3.6 | Document verifier usage + examples | Documentation | TODO |

---

## 🎨 EPIC 2: UX Simplification

**Priority:** HIGH  
**Milestone:** M2  
**Labels:** epic, ux, high  
**Business Value:** Reduce case creation from 7+ steps to 3, increase clinician adoption by 40%, improve discharge efficiency.

---

### Story 2.1: 3-Step Evidence Flow

**Priority:** HIGH  
**Labels:** story, ux, high  
**Acceptance Criteria:**
- [ ] Case creation reduced to: 1) Patient Info, 2) Medical Evidence, 3) Witness/Consent
- [ ] Progress indicator shows step 1/3, 2/3, 3/3
- [ ] Auto-save at each step
- [ ] Back/forward navigation with form state preservation

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 2.1.1 | Redesign case creation flow (3 steps) | Frontend | TODO |
| 2.1.2 | Implement step 1: Patient demographics | Frontend | TODO |
| 2.1.3 | Implement step 2: Evidence upload + medical data | Frontend | TODO |
| 2.1.4 | Implement step 3: Witness/consent selection | Frontend | TODO |
| 2.1.5 | Add form state persistence (localStorage) | Frontend | TODO |
| 2.1.6 | Mobile responsiveness validation | QA | TODO |

---

### Story 2.2: Templates + Autofill

**Priority:** MEDIUM  
**Labels:** story, ux, medium  
**Acceptance Criteria:**
- [ ] Template library for common discharge scenarios
- [ ] Autofill fields from EMR/previous cases
- [ ] Template selection on step 1 pre-populates forms
- [ ] User can save case as template

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 2.2.1 | Design template data model | Backend | TODO |
| 2.2.2 | Build template library screen | Frontend | TODO |
| 2.2.3 | Implement autofill from EMR data | Backend | TODO |
| 2.2.4 | Add "Save as Template" feature | Frontend | TODO |

---

### Story 2.3: Error Handling + UX Polish

**Priority:** MEDIUM  
**Labels:** story, ux, medium  
**Acceptance Criteria:**
- [ ] All validation errors inline with clear Arabic/English messaging
- [ ] Loading states for async operations
- [ ] Timeout error recovery with retry logic
- [ ] No console errors in production

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 2.3.1 | Audit current validation + errors | Frontend | TODO |
| 2.3.2 | Implement inline validation with messaging | Frontend | TODO |
| 2.3.3 | Add loading + spinner states | Frontend | TODO |
| 2.3.4 | Error boundary + retry logic | Frontend | TODO |

---

## 🏥 EPIC 3: IMC Pilot

**Priority:** HIGH  
**Milestone:** M3  
**Labels:** epic, ops, high  
**Business Value:** Validate system in production ER/IPD, collect metrics, de-risk full rollout.

---

### Story 3.1: Deploy Pilot in ER & IPD

**Priority:** HIGH  
**Labels:** story, ops, high  
**Acceptance Criteria:**
- [ ] Feature flag controls IMC pilot access
- [ ] ER and IPD departments onboarded with training
- [ ] All data isolated to IMC tenant
- [ ] Fallback to manual process if system fails

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 3.1.1 | Create feature flag for IMC pilot | DevOps | TODO |
| 3.1.2 | Deploy to staging environment | DevOps | TODO |
| 3.1.3 | Execute ER department pre-go-live checklist | Ops | TODO |
| 3.1.4 | Execute IPD department pre-go-live checklist | Ops | TODO |
| 3.1.5 | Monitor health dashboards first week | DevOps | TODO |

---

### Story 3.2: Collect Metrics + Analytics

**Priority:** MEDIUM  
**Labels:** story, ops, medium  
**Acceptance Criteria:**
- [ ] Case creation time tracked (baseline: 15 min → target: 3 min)
- [ ] Evidence upload success rate monitored
- [ ] Error rate < 0.5%
- [ ] User feedback collected weekly

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 3.2.1 | Instrument case creation timing | Backend | TODO |
| 3.2.2 | Add event tracking to analytics | Frontend | TODO |
| 3.2.3 | Build on-dashboard metrics | Frontend | TODO |
| 3.2.4 | Create feedback collection form | Frontend | TODO |

---

### Story 3.3: Generate Pilot Report

**Priority:** MEDIUM  
**Labels:** story, ops, medium  
**Acceptance Criteria:**
- [ ] Weekly report: conversion rate, drop-off, error types
- [ ] Qualitative feedback summary
- [ ] Rollout recommendation (go/no-go)

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 3.3.1 | Compile metrics report template | Ops | TODO |
| 3.3.2 | Analyze week 1 data | Analytics | TODO |
| 3.3.3 | Summarize user feedback | Ops | TODO |
| 3.3.4 | Present go/no-go recommendation | PM | TODO |

---

## ⚖️ EPIC 4: System Trust & Court Pack

**Priority:** MEDIUM  
**Milestone:** M4  
**Labels:** epic, legal  
**Business Value:** Enable court-ready discharge bundles with evidence of integrity and lawfulness.

---

### Story 4.1: Cover Page PDF Enhancement

**Priority:** MEDIUM  
**Labels:** story, legal  
**Acceptance Criteria:**
- [ ] Cover page includes case summary, timestamps, signatures
- [ ] QR code links to public verifier
- [ ] Professional layout matching court requirements

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 4.1.1 | Design court-compliant cover page | Legal | TODO |
| 4.1.2 | Implement PDF generation with metadata | Backend | TODO |
| 4.1.3 | Add QR code linking to verifier | Backend | TODO |

---

### Story 4.2: Timeline Generation

**Priority:** MEDIUM  
**Labels:** story, legal  
**Acceptance Criteria:**
- [ ] Automated chronology of all case actions and decisions
- [ ] Includes timestamps, actor names, action descriptions
- [ ] Part of exportable bundle

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 4.2.1 | Extract audit log into timeline format | Backend | TODO |
| 4.2.2 | Format timeline for PDF rendering | Backend | TODO |
| 4.2.3 | Include in court bundle export | Backend | TODO |

---

### Story 4.3: Export Court Bundle

**Priority:** MEDIUM  
**Labels:** story, legal, ux  
**Acceptance Criteria:**
- [ ] Button: "Export Court Bundle"
- [ ] Bundle includes: cover page, timeline, all evidence, signatures, manifest.sig, .tsr token
- [ ] Single ZIP or PDF archive
- [ ] Include README with verification instructions

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 4.3.1 | Create bundle assembly logic | Backend | TODO |
| 4.3.2 | Add export button to UI | Frontend | TODO |
| 4.3.3 | Generate ZIP with all artifacts | Backend | TODO |
| 4.3.4 | Add verification guide to bundle | Documentation | TODO |

---

## 🔌 EPIC 5: Integrations (EMR/SMS/e-Sign)

**Priority:** MEDIUM  
**Milestone:** M5  
**Labels:** epic, integration  
**Business Value:** Enable seamless data flow from hospital EMR, SMS evidence layer, and digital signatures.

---

### Story 5.1: EMR Integration

**Priority:** MEDIUM  
**Labels:** story, integration  
**Acceptance Criteria:**
- [ ] Patient demographics auto-populated from EMR
- [ ] Discharge diagnosis/medications synced
- [ ] Integration using HL7 FHIR or hospital-specific API

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 5.1.1 | Design EMR integration webhook | Backend | TODO |
| 5.1.2 | Implement patient data sync | Backend | TODO |
| 5.1.3 | Add EMR authentication/tokens | Backend | TODO |
| 5.1.4 | Test with pilot EMR system | QA | TODO |

---

### Story 5.2: SMS Evidence Layer

**Priority:** MEDIUM  
**Labels:** story, integration  
**Acceptance Criteria:**
- [ ] SMS sent to family members with discharge summary + consent link
- [ ] Family responses recorded as evidence layer
- [ ] Thread-safe SMS state management

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 5.2.1 | Design SMS template + content model | Backend | TODO |
| 5.2.2 | Integrate Twilio/SMS provider | Backend | TODO |
| 5.2.3 | Handle SMS responses as evidence | Backend | TODO |
| 5.2.4 | Add SMS audit trail | Backend | TODO |

---

### Story 5.3: e-Signature Integration

**Priority:** MEDIUM  
**Labels:** story, integration  
**Acceptance Criteria:**
- [ ] Doctor/witness can e-sign via provider (DocuSign, Adobe Sign, etc.)
- [ ] Digital signature attached to bundle
- [ ] Verifier validates e-signature chain

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 5.3.1 | Select e-signature provider | PM | TODO |
| 5.3.2 | Implement e-sign API integration | Backend | TODO |
| 5.3.3 | Add signature status tracking | Frontend | TODO |
| 5.3.4 | Validate e-sig in verifier | Backend | TODO |

---

## 🔐 EPIC 6: Security & Compliance

**Priority:** MEDIUM  
**Milestone:** M5  
**Labels:** epic, security  
**Business Value:** Ensure PDPL compliance, audit integrity, and data security across all features.

---

### Story 6.1: RBAC Hardening

**Priority:** MEDIUM  
**Labels:** story, security  
**Acceptance Criteria:**
- [ ] Role-based access control enforced at API level
- [ ] Audit log records all access decisions
- [ ] No privilege escalation paths

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 6.1.1 | Audit existing RBAC implementation | Security | TODO |
| 6.1.2 | Close any found privilege escalation paths | Backend | TODO |
| 6.1.3 | Add API-level access checks | Backend | TODO |

---

### Story 6.2: PDPL Compliance

**Priority:** MEDIUM  
**Labels:** story, security, legal  
**Acceptance Criteria:**
- [ ] Data retention policy enforced (delete after X days)
- [ ] Consent recorded for all personal data processing
- [ ] User download/deletion rights implemented

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 6.2.1 | Implement data retention scheduler | Backend | TODO |
| 6.2.2 | Add consent tracking | Backend | TODO |
| 6.2.3 | User data download / right-to-be-forgotten | Backend | TODO |

---

### Story 6.3: Audit Logs Integrity

**Priority:** MEDIUM  
**Labels:** story, security  
**Acceptance Criteria:**
- [ ] Audit logs tamper-proofed (immutable storage)
- [ ] Timestamp and signature on each entry
- [ ] Retention policy prevents deletion

**Tasks:**

| # | Task | Assigned | Status |
|---|---|---|---|
| 6.3.1 | Migrate audit logs to append-only storage | Backend | TODO |
| 6.3.2 | Add signature + timestamp to each log entry | Backend | TODO |
| 6.3.3 | Implement read-only audit log API | Backend | TODO |

---

## 📊 Project Board Columns

```
Backlog  →  Ready  →  In Progress  →  Review  →  Done
```

**Initial In-Progress Tasks (First Sprint):**
1. Task 1.1.1: Add signing library
2. Task 1.2.1: Integrate RFC3161 TSA library
3. Task 1.3.1: Create verifier CLI entry point

---

## 📈 Metrics & KPIs

| Metric | Target | Status |
|---|---|---|
| Case creation time | 3 min | Baseline 15 min |
| Evidence upload success rate | >99% | TBD |
| Verifier accuracy | 100% | TBD |
| IMC pilot adoption | 80% of ER + IPD users | TBD |
| System uptime | 99.95% | TBD |
| PDPL compliance | 100% | TBD |

---

## 🔗 Links & References

- **Repository:** https://github.com/baseltayem1-btayem/wathiqcare-discharge-refusal
- **Issues Board:** https://github.com/baseltayem1-btayem/wathiqcare-discharge-refusal/issues
- **Project:** https://github.com/orgs/wathiqcare/projects/1 (to be created)
- **Roadmap:** Investment-readiness timeline (12 weeks)

---

**Last Updated:** 2026-04-16  
**Created By:** Engineering Management + DevOps  
**Status:** ACTIVE

