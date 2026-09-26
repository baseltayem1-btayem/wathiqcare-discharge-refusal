# WathiqCare — Product Roadmap & Delivery Plan

**Version:** 1.0 Roadmap  
**Date:** 2026-06-26  
**Status:** Draft — Phase 47 Delivery Planning  
**Prepared for:** Program Operations, Engineering, Clinical, Legal, Compliance  

---

## 1. Executive Summary

WathiqCare is a Saudi medico-legal SaaS platform for hospital consent and discharge-refusal workflows. The product has reached **pilot-stage maturity** with the **Informed Consent module** approved for controlled production pilot at International Medical Center (IMC).

This roadmap transitions the program from prototype-driven development to structured product delivery. **No new features are implemented in Phase 47.** The objective is to define the path from the current pilot baseline to a defensible, scalable, revenue-ready **Version 1.0**.

### Strategic Decision: What is Version 1.0?

**Version 1.0 = Informed Consent General Availability (GA) on the multi-tenant SaaS platform.**

Rationale:
- Informed Consent is the only module with validated UAT evidence (19/19 templates), legal evidence specification, and pilot approval.
- Discharge Refusal, Promissory Notes, and Home Healthcare exist as code but lack the same validation depth.
- Going to market with a single, excellent module is lower risk than bundling partially validated modules.

Modules such as Discharge Refusal, Promissory Notes, and Home Healthcare are scheduled for **Version 1.1+** after Informed Consent GA.

---

## 2. Product Backlog

### 2.1 Epic Inventory

| ID | Epic | Theme | Target Version |
|---|---|---|---|
| E1 | Production Security & Environment Hardening | Foundation | v0.9.0 |
| E2 | Build Quality & TypeScript Debt | Foundation | v0.9.0 |
| E3 | Audit, Monitoring & Observability | Foundation | v0.9.0 |
| E4 | Content Mapping Engine | Core Product | v0.9.0 |
| E5 | Physician Consent Issuance API Integration | Core Product | v0.9.0 |
| E6 | Patient Identity & Encounter Integration | Core Product | v1.0.0 |
| E7 | PDF Generation & Legal Packaging | Core Product | v1.0.0 |
| E8 | Operations Inbox & SLA Automation | Operations | v1.0.0 |
| E9 | Tenant Administration & Billing | SaaS Platform | v1.0.0 |
| E10 | Discharge Refusal Module Unification | Expansion | v1.1.0 |
| E11 | Promissory Notes & Home Healthcare GA | Expansion | v1.1.0 |
| E12 | EHR Integration (FHIR/HL7) | Enterprise | v1.2.0 |
| E13 | Advanced Authentication (Nafath, Biometrics) | Enterprise | v1.2.0 |
| E14 | Cross-Tenant Analytics & Reporting | Enterprise | v1.2.0 |
| E15 | AI-Assisted Consent (Governed) | Innovation | v1.3.0 |

---

### 2.2 Epic E1 — Production Security & Environment Hardening

**Objective:** Close all P0 security and environment gaps before GA.

**Features:**
- F1.1 Rotate and unify `JWT_SECRET_KEY` across Vercel and Railway.
- F1.2 Set `PUBLIC_LINK_TOKEN_PEPPER` to a strong random secret in production.
- F1.3 Enforce `NODE_ENV=production` → secure cookie flags.
- F1.4 Configure CORS to allow only `https://wathiqcare.online`.
- F1.5 Verify rate limiting on `/auth/*`, `/otp/*`, `/secure-links/*`.
- F1.6 Enable backend brute-force lockout (5 attempts / 5 minutes).
- F1.7 Confirm CSP and security headers in production.
- F1.8 Set platform superadmin password hash and store in vault.
- F1.9 Remove `.env` files from git history and enforce `.gitignore`.
- F1.10 Configure HTTPS-only redirects and HSTS.

**User Stories:**
- As a DevOps engineer, I want identical JWT secrets on both services so that tokens validate across the frontend and backend.
- As a security officer, I want rate limiting on auth and OTP routes so that brute-force attacks are mitigated.
- As a compliance reviewer, I want secure cookie flags so that session tokens cannot be exfiltrated over HTTP.

**Estimated Effort:** 2 person-weeks (PW)

**Definition of Done:**
- [ ] All items in `docs/production-release-package.md` §1.1 marked ✅.
- [ ] Security scan (OWASP ZAP or equivalent) shows no high/critical findings.
- [ ] Cookie flags verified in production browser DevTools.
- [ ] Penetration test of `/auth/*`, `/otp/*`, `/secure-links/*` completed.

---

### 2.3 Epic E2 — Build Quality & TypeScript Debt

**Objective:** Eliminate ignored build errors and establish a clean CI gate.

**Features:**
- F2.1 Remove `typescript.ignoreBuildErrors: true` from `next.config.ts`.
- F2.2 Resolve all current `tsc --noEmit` errors.
- F2.3 Add CI workflow step for `npx tsc --noEmit`.
- F2.4 Add CI workflow step for `npm run lint`.
- F2.5 Add backend pytest to GitHub Actions.
- F2.6 Establish pre-commit hooks for lint and type-check.

**User Stories:**
- As a developer, I want the build to fail on TypeScript errors so that type safety is enforced.
- As a release manager, I want CI to run lint and tests on every PR so that regressions are caught early.

**Estimated Effort:** 3 PW

**Definition of Done:**
- [ ] `next.config.ts` no longer ignores TypeScript errors.
- [ ] `npx tsc --noEmit` returns 0 errors on `main`.
- [ ] `npm run lint` returns 0 errors.
- [ ] GitHub Actions runs type-check, lint, and pytest on every PR.
- [ ] No `console.error` stack traces on happy-path flows.

---

### 2.4 Epic E3 — Audit, Monitoring & Observability

**Objective:** Make production behavior visible, alertable, and legally defensible.

**Features:**
- F3.1 Configure Sentry DSN for frontend and backend.
- F3.2 Set up structured logging with tenant/case/request correlation IDs.
- F3.3 Create production dashboards: OTP success rate, PDF generation success, signing completion, error rate.
- F3.4 Configure P1/P2 alerting thresholds and PagerDuty/on-call rotation.
- F3.5 Implement daily audit-chain integrity verification job.
- F3.6 Backup/DR verification: monthly restore drill.

**User Stories:**
- As an on-call engineer, I want alerts for OTP failure rate > 5% so that I can respond before patients are blocked.
- As a compliance officer, I want daily audit-chain integrity reports so that evidence tampering is detected.

**Estimated Effort:** 2 PW

**Definition of Done:**
- [ ] Sentry receiving errors from production.
- [ ] Dashboards monitor OTP, PDF, signing, and error rates.
- [ ] Alerting rules configured for P1/P2 thresholds from `PILOT_READINESS_MASTER.md` §5.
- [ ] Daily audit integrity job runs and reports green.
- [ ] Rollback SOP and restore drill documented and tested.

---

### 2.5 Epic E4 — Content Mapping Engine

**Objective:** Complete and validate the in-progress procedure-to-consent-content mapping engine.

**Features:**
- F4.1 Finalize API: `GET /api/modules/informed-consents/content-mapping/resolve`.
- F4.2 Finalize API: `GET /api/modules/informed-consents/imc-library`.
- F4.3 Finalize feature-flag integration (`ENABLE_CONTENT_MAPPING_ENGINE`).
- F4.4 Map IMC procedure catalog to approved consent forms and education PDFs.
- F4.5 Add fallback behavior when no mapping is found.
- F4.6 Add unit and integration tests for mapping resolution.
- F4.7 Physician UI wiring in `PhysicianConsentWorkflow`.

**User Stories:**
- As a physician, I want the system to suggest the correct IMC consent form when I enter a procedure name so that I use approved content.
- As a legal reviewer, I want only approved, versioned templates to be selectable so that consent language is defensible.

**Estimated Effort:** 3 PW

**Dependencies:** E2 (clean build required for confident merge), E7 (PDF generation must consume mapped templates).

**Definition of Done:**
- [ ] Content mapping enabled for IMC pilot tenant.
- [ ] All active surgical/anesthesia/high-risk consent types resolve to approved templates.
- [ ] Feature flag can disable engine without breaking existing flow.
- [ ] Unit + integration tests pass.
- [ ] UAT validates mapping accuracy ≥ 95% for top 50 procedures.

---

### 2.6 Epic E5 — Physician Consent Issuance API Integration

**Objective:** Replace UI stubs and TODOs with real API calls in the physician consent workflow.

**Features:**
- F5.1 Integrate consent template API for role/department-specific templates.
- F5.2 Integrate patient lookup API in issuance page.
- F5.3 Reconnect signature-orchestration resend endpoint.
- F5.4 Reconnect secure-link creation endpoint fallback.
- F5.5 Integrate audit logging API for issuance actions.
- F5.6 Integrate PDF generation API for draft/final legal outputs.

**User Stories:**
- As a physician, I want patient lookup to search real patient records so that I do not re-enter demographic data.
- As an auditor, I want every issuance action logged immutably so that the consent chain is complete.

**Estimated Effort:** 3 PW

**Dependencies:** E4 (template resolution), E6 (patient lookup), E7 (PDF API).

**Definition of Done:**
- [ ] No remaining `TODO` items in `InformedConsentIssuancePage.tsx` and `PhysicianConsentWorkflow.tsx` related to API integration.
- [ ] Physician can search patient, select template, generate draft PDF, and send signing link end-to-end.
- [ ] Every action emits an audit event.
- [ ] E2E tests cover the full issuance flow.

---

### 2.7 Epic E6 — Patient Identity & Encounter Integration

**Objective:** Provide reliable patient identification and encounter locking for consent context.

**Features:**
- F6.1 Implement patient search API by MRN, national ID, or name.
- F6.2 Implement encounter selection API (active admissions).
- F6.3 Verify patient demographics match consent context.
- F6.4 Display patient capacity status and guardian requirements.
- F6.5 Cache patient/encounter data with appropriate TTL.

**User Stories:**
- As a physician, I want to search by MRN and select the active encounter so that consent is tied to the correct visit.
- As a compliance officer, I want demographic verification before signing so that identity disputes are minimized.

**Estimated Effort:** 2 PW

**Definition of Done:**
- [ ] Patient lookup returns results in < 1 second.
- [ ] Encounter selection locks the consent context.
- [ ] Demographic mismatch triggers a warning.
- [ ] PII is masked in logs and audit events.

---

### 2.8 Epic E7 — PDF Generation & Legal Packaging

**Objective:** Ensure every executed consent produces a legally defensible, bilingual evidence package.

**Features:**
- F7.1 Bilingual PDF generation (Arabic + English) with correct RTL/LTR layout.
- F7.2 QR code linking to verification page.
- F7.3 Integrity hash (SHA-256) stored in audit chain.
- F7.4 Watermark and version footer on every page.
- F7.5 Evidence package assembly: PDF + audit JSON + signature evidence.
- F7.6 Refusal path produces refusal-specific legal package.

**User Stories:**
- As a patient, I want to receive a PDF I can verify with a QR code so that I trust the document.
- As a legal officer, I want an immutable evidence package so that the consent holds up in dispute.

**Estimated Effort:** 2 PW

**Definition of Done:**
- [ ] 100% of executed consents generate a PDF with verifiable hash.
- [ ] 100% of executed consents produce a complete audit chain per `PILOT_READINESS_MASTER.md` §4.1.
- [ ] Refusal path generates a refusal package with refusal signature evidence.
- [ ] PDF layout passes legal review for Arabic/English bilingual output.

---

### 2.9 Epic E8 — Operations Inbox & SLA Automation

**Objective:** Make case operations reliable, role-aware, and SLA-driven.

**Features:**
- F8.1 Department-specific inbox queues (< 3s load time).
- F8.2 SLA timers and auto-escalation on breach.
- F8.3 Assign / step / escalate quick actions with role gating.
- F8.4 Workload aging and breach trend charts.
- F8.5 Notification delivery on transitions (in-app + email).

**User Stories:**
- As a nurse, I want my department inbox to show only cases I can act on so that I am not distracted.
- As a legal admin, I want breached cases to auto-escalate so that nothing is missed.

**Estimated Effort:** 2 PW

**Definition of Done:**
- [ ] All 9 workflow stages reachable in staging.
- [ ] SLA timers fire correctly per department.
- [ ] Auto-escalation records `escalation_triggered` event.
- [ ] Viewer role cannot assign/step/escalate.
- [ ] Charts render on `/operations/inboxes`.

---

### 2.10 Epic E9 — Tenant Administration & Billing

**Objective:** Make the platform self-service for tenant onboarding, subscription, and seat management.

**Features:**
- F9.1 Subscription plans seeded (STARTER / PROFESSIONAL / ENTERPRISE).
- F9.2 Platform admin panel for tenant management.
- F9.3 Tenant suspension blocks all auth.
- F9.4 Seat limit enforcement.
- F9.5 Stripe/Hyperpay payment provider integration.
- F9.6 Trial period management.

**User Stories:**
- As a platform admin, I want to create a tenant and assign a subscription plan so that hospitals can onboard.
- As a billing manager, I want seat limits enforced so that revenue leakage is prevented.

**Estimated Effort:** 3 PW

**Definition of Done:**
- [ ] Admin panel accessible only to platform_superadmin.
- [ ] Tenant creation, subscription assignment, and user invitation work end-to-end.
- [ ] Seat limits enforced with clear error messages.
- [ ] Payment webhook tested in staging.

---

### 2.11 Epic E10 — Discharge Refusal Module Unification

**Objective:** Bring the Python discharge-refusal backend onto the same validated platform as Informed Consent.

**Features:**
- F10.1 Migrate or proxy discharge-refusal APIs to Next.js API layer.
- F10.2 Unify patient/encounter context with consent module.
- F10.3 Unify audit chain and evidence package format.
- F10.4 Port workflow tree UI persistence from localStorage to backend.
- F10.5 Validate escalation tiers (24h, 48h, 72h) with SLA automation.
- F10.6 Port ICD-11 validator to TypeScript or expose via API.

**User Stories:**
- As a physician, I want discharge refusal cases in the same system as consents so that I have one workflow.
- As a legal officer, I want the same evidence package format for refusal cases so that review is consistent.

**Estimated Effort:** 5 PW

**Dependencies:** E1, E2, E3, E8 (SLA framework).

**Definition of Done:**
- [ ] Discharge refusal case lifecycle works end-to-end on production domain.
- [ ] Audit chain uses same format as informed consent.
- [ ] Workflow tree selections are persisted server-side.
- [ ] UAT covers full refusal → escalation → closure flow.

---

### 2.12 Epic E11 — Promissory Notes & Home Healthcare GA

**Objective:** Graduate Promissory Notes and Home Healthcare agreements to GA with full audit and signing.

**Features:**
- F11.1 Promissory note PDF generation and debtor signing flow.
- F11.2 Home healthcare agreement workflow.
- F11.3 Guardian signature capture for home healthcare.
- F11.4 Unified evidence package for both document types.
- F11.5 Tenant-level module enablement flags.

**User Stories:**
- As a hospital administrator, I want to issue a digital promissory note so that financial obligations are documented.
- As a caregiver, I want to sign a home healthcare agreement so that post-discharge care is legally covered.

**Estimated Effort:** 4 PW

**Dependencies:** E7 (PDF/evidence package), E9 (tenant module flags).

**Definition of Done:**
- [ ] Promissory note and home healthcare flows generate signed PDFs.
- [ ] Both document types have complete audit chains.
- [ ] Module can be enabled/disabled per tenant.
- [ ] Legal review signs off on both document packages.

---

### 2.13 Epic E12 — EHR Integration (FHIR/HL7)

**Objective:** Enable bi-directional data exchange with hospital information systems.

**Features:**
- F12.1 FHIR R4 patient/encounter read.
- F12.2 FHIR Consent/ServiceRequest/Communication write-back.
- F12.3 HL7 v2 ADT/ORU message parsing (optional).
- F12.4 Configurable connector per tenant.
- F12.5 Fallback to manual entry when EHR is unavailable.

**User Stories:**
- As an IT director, I want WathiqCare to read patient demographics from our EHR so that data entry is reduced.
- As a physician, I want signed consent to write back to the EHR so that it is part of the medical record.

**Estimated Effort:** 5 PW

**Dependencies:** E6 (patient/encounter model), E10 (discharge refusal unification).

**Definition of Done:**
- [ ] At least one EHR connector validated in a staging environment.
- [ ] Patient read and consent write-back tested end-to-end.
- [ ] Graceful fallback when EHR is down.
- [ ] Security review of EHR credentials and scopes.

---

### 2.14 Epic E13 — Advanced Authentication (Nafath, Biometrics)

**Objective:** Add stronger patient identity verification options for high-risk consents.

**Features:**
- F13.1 Nafath integration for identity verification.
- F13.2 WebAuthn / passkey support (advisory).
- F13.3 Biometric capture guardrails (never sole factor).
- F13.4 Tenant-level activation controls.

**User Stories:**
- As a patient, I want to verify my identity with Nafath so that high-risk consent signing is trusted.
- As a hospital, I want biometric methods only as a second factor so that legal risk is controlled.

**Estimated Effort:** 4 PW

**Dependencies:** E1 (security hardening), E7 (signature evidence format).

**Definition of Done:**
- [ ] Nafath flow tested in staging with real credentials.
- [ ] Biometric methods are gated and never sole authorization.
- [ ] Audit events capture method and provider result.
- [ ] Legal/compliance review approves.

---

### 2.15 Epic E14 — Cross-Tenant Analytics & Reporting

**Objective:** Provide operational and compliance reporting without exposing tenant data.

**Features:**
- F14.1 Tenant-scoped dashboards.
- F14.2 Consent completion rate, refusal rate, and turnaround time.
- F14.3 SLA breach reports.
- F14.4 Evidence package export for legal review.
- F14.5 Platform admin aggregate metrics (anonymized).

**User Stories:**
- As a hospital quality officer, I want to see consent completion rates so that I can identify process gaps.
- As a legal reviewer, I want to export evidence packages by date range so that audits are efficient.

**Estimated Effort:** 3 PW

**Dependencies:** E3 (observability), E9 (tenant admin), E10/E11 (multi-module data).

**Definition of Done:**
- [ ] Reports load in < 3 seconds for pilot data volume.
- [ ] Cross-tenant leakage is impossible by design.
- [ ] Legal reviewer can export evidence packages.

---

### 2.16 Epic E15 — AI-Assisted Consent (Governed)

**Objective:** Add advisory AI assistance for consent drafting, with strict governance.

**Features:**
- F15.1 Specialty-relevant risk suggestions from governed library.
- F15.2 Missing disclosure section detection.
- F15.3 Lay-language explanation variants for clinician review.
- F15.4 AI influence audit events.
- F15.5 Tenant-level on/off flag.

**User Stories:**
- As a physician, I want AI to suggest risks I may have missed so that disclosure is thorough.
- As a legal reviewer, I want to see when AI influenced a draft so that I can review accordingly.

**Estimated Effort:** 4 PW

**Dependencies:** E4 (content mapping), E5 (issuance API), `docs/FUTURE_AI_INTEGRATION.md` governance.

**Definition of Done:**
- [ ] AI suggestions are advisory only and require physician approval.
- [ ] Approved template content remains authoritative.
- [ ] Audit events capture every AI suggestion and acceptance/rejection.
- [ ] Legal, medical, compliance, and cybersecurity review complete.

---

## 3. Prioritized Implementation Order

### 3.1 Sequencing Principles

1. **Foundation before features.** Security, build quality, and observability must be solid before GA.
2. **Complete the validated module first.** Informed Consent GA is the v1.0 finish line.
3. **Finish work in progress before starting new work.** Content Mapping Engine and API integration TODOs take precedence.
4. **Revenue-enabling platform capabilities before expansion.** Tenant admin and billing must work before adding modules.
5. **High-risk integrations last.** EHR, Nafath, and AI require mature governance and are v1.2+.

### 3.2 Implementation Sequence

| Phase | Epics | Goal |
|---|---|---|
| **Phase A — Foundation** | E1, E2, E3 | Production-ready platform hardening |
| **Phase B — Consent Completion** | E4, E5, E6, E7 | End-to-end informed consent workflow validated |
| **Phase C — Operations & SaaS** | E8, E9 | Multi-tenant operational readiness |
| **Phase D — Informed Consent GA** | E1–E9 stabilization, UAT, legal review | Version 1.0 release |
| **Phase E — Module Expansion** | E10, E11 | Discharge Refusal + Promissory/HC GA |
| **Phase F — Enterprise Integrations** | E12, E13, E14 | EHR, strong auth, analytics |
| **Phase G — Innovation** | E15 | Governed AI assistance |

---

## 4. Estimated Effort per Epic

Effort is expressed in **person-weeks (PW)** assuming one full-time senior engineer. Parallel work is possible where dependencies allow.

| Epic | Effort (PW) | Cumulative (PW) |
|---|---|---|
| E1 Security & Environment | 2 | 2 |
| E2 Build Quality | 3 | 5 |
| E3 Observability | 2 | 7 |
| E4 Content Mapping | 3 | 10 |
| E5 API Integration | 3 | 13 |
| E6 Patient/Encounter | 2 | 15 |
| E7 PDF/Legal Package | 2 | 17 |
| E8 Operations Inbox | 2 | 19 |
| E9 Tenant/Billing | 3 | 22 |
| **Subtotal — v1.0 GA** | **22** | **22** |
| E10 Discharge Refusal Unification | 5 | 27 |
| E11 Promissory/HC GA | 4 | 31 |
| E12 EHR Integration | 5 | 36 |
| E13 Advanced Auth | 4 | 40 |
| E14 Analytics | 3 | 43 |
| E15 AI Assistance | 4 | 47 |
| **Total — v1.3** | **47** | **47** |

**Team sizing estimate:**
- 2 senior full-stack engineers + 1 DevOps + 0.5 QA + 0.5 product can deliver v1.0 GA in approximately **10–12 calendar weeks** with parallel workstreams.

---

## 5. Dependencies Between Modules

```
E1 Security ──┬──► E4 Content Mapping ──┬──► E5 API Integration ──┬──► E7 PDF/Legal Package
E2 Build Q ───┤                         │                         │
              │                         ▼                         ▼
              │                    E6 Patient/Encounter ◄─────────┘
              │                         │
              ▼                         ▼
E3 Observability ◄─────────────── E8 Operations Inbox
              │                         │
              │                         ▼
              │                    E9 Tenant/Billing
              │                         │
              └───────────────► v1.0 GA ◄┘
                                         │
              ┌──────────────────────────┘
              ▼
        E10 Discharge Refusal ──┬──► E12 EHR Integration
              │                 │
              │                 ▼
        E11 Promissory/HC ◄── E13 Advanced Auth
              │                 │
              │                 ▼
              └────────────► E14 Analytics
                               │
                               ▼
                          E15 AI Assistance
```

### Key Dependency Notes

- **E4 → E5:** Content mapping must resolve templates before the issuance page can integrate template APIs.
- **E5 ↔ E6:** Patient lookup and template selection happen in the same issuance flow.
- **E5/E6 → E7:** PDF generation requires patient context and selected template.
- **E8 → E9:** Operations inbox requires tenant users and roles to be manageable.
- **E1–E9 → v1.0 GA:** No GA without foundation, core product, and SaaS platform.
- **E10/E11 → E12:** EHR integration is more valuable once multiple modules generate data.
- **E14 → E10/E11:** Cross-module analytics requires discharge refusal and promissory data.

---

## 6. Risks

### 6.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TypeScript build errors hide runtime defects | High | High | E2: enforce `tsc --noEmit` in CI and remove ignore flag |
| JWT secret mismatch between Vercel/Railway | Medium | Critical | E1: single source of truth in secret manager; rotation runbook |
| PDF generation fails at scale or with Arabic RTL | Medium | High | E7: load test PDF service; validate Arabic layout with legal |
| Content mapping accuracy is low for niche procedures | Medium | Medium | E4: fallback to manual selection; UAT with top 50 procedures |
| Patient lookup API performance degrades | Medium | Medium | E6: caching, debounce, and fallback to manual entry |

### 6.2 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OTP delivery failure blocks patient signing | Medium | Critical | E3: monitor OTP success rate; vendor redundancy plan |
| Pilot incidents trigger rollback | Low | High | Follow `PILOT_READINESS_MASTER.md` §5 rollback procedure |
| On-call team misses P1/P2 alerts | Medium | High | E3: PagerDuty integration; escalation matrix in `docs/governance/operational-escalation-matrix.md` |
| Database backup/restore untested | Low | Critical | E3: monthly restore drill |

### 6.3 Legal & Compliance Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Audit chain gap in refusal or OTP path | Low | Critical | E7: automated audit completeness check; legal sampling |
| Cross-tenant data leak | Low | Critical | Tenant isolation enforced at Prisma query layer; regular access reviews |
| PDPL non-compliance in logging | Medium | High | E1/E3: PII masking; retention policy; DSR service |
| AI-generated content used without review | Low | High | E15: advisory-only design; approval gate; audit events |

### 6.4 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pilot fails to meet 90% completion rate | Medium | High | UX review from pilot feedback; optimize mobile flow |
| Physician adoption is low | Medium | High | Training materials; median dispatch time target ≤ 90s |
| Billing integration delays revenue | Medium | Medium | E9: start with Stripe/Hyperpay sandbox; manual invoicing fallback |
| Scope creep delays v1.0 | High | High | Strict v1.0 definition; defer E10–E15 to v1.1+ |

---

## 7. Production Rollout Plan

### 7.1 Governance

Adopt the existing three-stage rollout model from `docs/governance/phased-rollout-plan.md`:

1. **Phase 1 — Controlled UAT Environment**
2. **Phase 2 — Limited Rollout**
3. **Phase 3 — Full Production Activation**

### 7.2 Rollout Schedule

| Stage | Timing | Activities | Success Gate |
|---|---|---|---|
| **Pilot Stabilization** | Weeks 1–2 | Complete E1–E3; close P0 env gaps; clean build | P0 checklist complete; smoke 11/11 |
| **Content Mapping GA** | Weeks 3–5 | Complete E4; integrate E5/E6/E7 APIs | UAT for top 50 procedures |
| **Operations & SaaS** | Weeks 6–8 | Complete E8/E9; tenant onboarding flow | Limited rollout with 2–3 tenants |
| **Informed Consent v1.0 GA** | Weeks 9–12 | Stabilization, legal review, full production activation | All approvals; no open P1/P2 |
| **v1.1 Module Expansion** | Weeks 13–20 | E10/E11 | Discharge refusal + promissory UAT |
| **v1.2 Enterprise** | Weeks 21–32 | E12/E13/E14 | EHR connector validated |
| **v1.3 AI Innovation** | Weeks 33–40 | E15 | Legal/medical AI review |

### 7.3 Release Gates

Every release must pass:

1. **Build gate:** `tsc --noEmit` clean, `npm run build` clean, pytest passing.
2. **Security gate:** OWASP ZAP scan or equivalent; no high/critical findings.
3. **UAT gate:** Executed against the release environment per `PILOT_READINESS_MASTER.md` §4.
4. **Legal gate:** Random sample evidence package review.
5. **Compliance gate:** PDPL alignment signoff.
6. **Smoke gate:** `__smoke_stabilization.cjs` 11/11 PASS.

### 7.4 Rollback Plan

Use the procedure in `PILOT_READINESS_MASTER.md` §5.3 and `docs/governance/rollback-sop.md`:

1. Notify Program Operations + IMC governance lead + on-call engineer.
2. Halt new dispatches at tenant level.
3. Re-alias `wathiqcare.online` to previous known-good deployment.
4. Verify smoke harness 11/11 PASS on rollback target.
5. Preserve logs, audit tables, and open signing sessions.
6. Root-cause review within 24 hours; no re-promotion until gate added.

---

## 8. Milestones to Version 1.0

| Milestone | Target Date | Deliverable | Acceptance Criteria |
|---|---|---|---|
| **M0 — Pilot Baseline** | Current | Informed Consent approved for pilot | `PILOT_READINESS_MASTER.md` signed; smoke 11/11 |
| **M1 — Foundation Hardening** | Week 2 | P0 security/build/observability complete | E1, E2, E3 Done |
| **M2 — Content Mapping GA** | Week 5 | Procedure-to-template mapping live | E4 Done; UAT ≥ 95% accuracy |
| **M3 — End-to-End Consent Workflow** | Week 8 | Full physician issuance + patient signing | E5, E6, E7 Done |
| **M4 — Multi-Tenant Operations** | Week 10 | Tenant admin, billing, inbox live | E8, E9 Done |
| **M5 — v1.0 Release Candidate** | Week 11 | RC tagged and deployed to staging | All v1.0 epics Done; no open P1/P2 |
| **M6 — Informed Consent v1.0 GA** | Week 12 | General availability of Informed Consent module | All approvals; smoke 11/11; legal signoff |

### Version 1.0 Definition

WathiqCare v1.0 is the general availability release of the **Informed Consent module** on the multi-tenant SaaS platform, with:

- Secure, hardened production environment.
- Clean, CI-gated codebase.
- Procedure-to-template content mapping.
- End-to-end physician issuance → patient signing → PDF/evidence package.
- Role-aware operations inbox with SLA automation.
- Tenant onboarding, subscription, and seat management.
- Immutable audit chain and legal evidence package.
- Bilingual (AR/EN) patient experience.
- PDPL-aligned data handling.

---

## 9. Definition of Done for Every Epic

| Epic | Definition of Done |
|---|---|
| **E1** | All security/env checks in `docs/production-release-package.md` §1.1 pass; security scan clean; cookie flags verified. |
| **E2** | `tsc --noEmit` and `npm run lint` are clean; CI runs both; `ignoreBuildErrors` removed. |
| **E3** | Sentry active; dashboards and alerts configured; daily audit integrity job green; restore drill completed. |
| **E4** | Content mapping resolves approved templates for top 50 procedures; feature flag works; tests pass; UAT signed. |
| **E5** | No issuance API TODOs remain; physician can issue consent end-to-end; every action audited; E2E tests pass. |
| **E6** | Patient lookup < 1s; encounter selection locks context; PII masked in logs; fallback to manual entry works. |
| **E7** | 100% executed consents have verifiable PDF + audit chain; refusal package validated; legal review signed. |
| **E8** | All 9 workflow stages reachable; SLA timers and auto-escalation work; role gating enforced; charts render. |
| **E9** | Tenant creation → subscription → invitation works; seat limits enforced; payment webhook tested. |
| **E10** | Discharge refusal works end-to-end on unified platform; audit format matches consent; tree persisted server-side. |
| **E11** | Promissory notes and home healthcare generate signed PDFs with audit chains; module flags work per tenant. |
| **E12** | EHR connector reads patient and writes consent; fallback when EHR down; security review complete. |
| **E13** | Nafath/biometric flows tested; methods are supplementary; audit events captured; legal/compliance approved. |
| **E14** | Reports load < 3s; no cross-tenant leakage; legal export works; platform admin metrics anonymized. |
| **E15** | AI is advisory-only; approved templates remain authoritative; every AI influence audited; governance reviews pass. |

---

## 10. Recommendation: What to Implement Next

### Primary Recommendation

**Implement Epics E1, E2, and E3 first — in parallel where possible.**

These foundation epics maximize business value while minimizing production risk because:

1. **They unblock the pilot from advancing to GA.** The current pilot is conditional on P0 environment and security fixes (`docs/production-release-package.md` §5).
2. **They reduce the risk of every subsequent epic.** A clean build and strong observability make content mapping, API integration, and PDF work faster and safer.
3. **They are small and well-defined.** 7 PW total, achievable in 2–3 weeks with focused effort.
4. **They protect revenue and reputation.** Security misconfiguration or a production incident during pilot would damage trust with IMC and delay GA.

### Secondary Recommendation

**Immediately after foundation, complete Epic E4 (Content Mapping Engine).**

Reasoning:
- It is already in progress on the `feature/content-mapping-engine` branch.
- It is a high-value differentiator for IMC (approved procedure-specific content).
- Finishing work in progress before starting new work avoids waste and branch rot.

### What to Defer

- **E10–E11 (Discharge Refusal, Promissory/HC):** Defer to v1.1. They expand the platform but are not required for Informed Consent GA.
- **E12–E14 (EHR, Advanced Auth, Analytics):** Defer to v1.2. These are enterprise sales enablers but increase integration risk.
- **E15 (AI Assistance):** Defer to v1.3. Governance and legal review overhead is high; value is additive, not blocking.

### Recommended Next 8 Weeks

| Week | Focus | Epics |
|---|---|---|
| 1–2 | Foundation hardening | E1, E2, E3 |
| 3–4 | Content mapping completion | E4 |
| 5–6 | API integration & patient context | E5, E6 |
| 7–8 | PDF/legal package & operations | E7, E8 |

This sequence delivers a **production-hardened, end-to-end validated Informed Consent workflow** by Week 8, positioning the team for tenant onboarding and v1.0 GA in Weeks 9–12.

---

## 11. Appendix — Mapping to Existing Artifacts

| Roadmap Element | Source Document |
|---|---|
| Pilot scope and go/no-go criteria | `pilot-package/PILOT_READINESS_MASTER.md` |
| Production release checklist | `docs/production-release-package.md` |
| Rollout stages | `docs/governance/phased-rollout-plan.md` |
| Rollback SOP | `docs/governance/rollback-sop.md` |
| AI governance principles | `docs/FUTURE_AI_INTEGRATION.md` |
| Legal evidence specification | `pilot-package/LEGAL_EVIDENCE_SPECIFICATION.md` |
| Architecture overview | `docs/architecture.md` |
| Consent type readiness matrix | `pilot-package/CONSENT_TYPE_READINESS_MATRIX.md` |

---

*End of Roadmap*
