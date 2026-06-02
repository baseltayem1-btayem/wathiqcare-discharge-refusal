# Phase 42A — AI-Assisted Physician Journey & Landing Page Recovery Report

**Date:** 2 June 2026
**Branch:** `phase24-evidence-package-final` (working branch; production main commit `ffe3b03d40258d87539a11898c8621745f095dae`)
**Scope:** Investigation-only. No code committed, pushed, deployed. No migrations, SMS, OTP, signing, public-signing, or patient-journey edits performed.
**Trigger:** Production physician journey UI does not complete: Completeness Check blocks Preview → Validation → PDF prep → Send. Patient contact-details verification is not completable. Updated landing page is not visible in production. User direction: recover prior AI-assisted work before any patch.

> **Patching disclosure (transparency):** Prior to scope change to 42A, four files were edited locally (uncommitted) in the prior turn: `final-ui/ConsentBuilder.tsx`, `final-ui/fixtures/consent-builder.ts`, `final-ui/steps/StepPatient.tsx`, `final-ui/steps/StepProcedure.tsx`. Nothing was committed or deployed. The post-report decision must explicitly approve, modify, or revert these uncommitted edits.

---

## 1. Method

Parallel recovery search via:

1. Direct file system inventory under [apps/web/src](apps/web/src), [apps/web/app](apps/web/app), [docs](docs), and [docs/production-readiness](docs/production-readiness).
2. Repo-wide grep for: AI, الذكاء الاصطناعي, smart consent, smart educational, completeness check, readiness, validation drawer, PDF preparation/generation, evidence package, legal package, contact details/patient contact, secure link, education library, decision support, الرحلة الطبيب, الرحلة المريض, تجهيز PDF, التحقق من بيانات التواصل, إرسال الرابط الآمن.
3. Comparison of OneDrive Figma export `C:\Users\basel\OneDrive\Desktop\WathiqCare-Figma-UX-UI\src\app\components\` against the Phase 40 port at [apps/web/src/components/informed-consents/final-ui](apps/web/src/components/informed-consents/final-ui).
4. Direct verification of every file path before reporting it (subagent claims cross-checked; one claim corrected — see §6).

OTP / signing endpoints / public-signing service / patient-signing workflow were **listed for presence only**; their logic was **not analysed and not modified**, per the hard rules of Phase 42.

---

## 2. Prior AI/Process Work Found

### 2.1 Clinical AI module (CODE — present in repo)

Located at [apps/web/src/lib/clinical-ai](apps/web/src/lib/clinical-ai). 16 files, last modified 19 May 2026.

| File | Role |
|---|---|
| [agents/consent-drafting-agent.ts](apps/web/src/lib/clinical-ai/agents/consent-drafting-agent.ts) | Orchestrates AI-assisted consent draft (PHI-minimized inputs → disease/education/risk → promptBundle) |
| [agents/disease-research-agent.ts](apps/web/src/lib/clinical-ai/agents/disease-research-agent.ts) | Builds clinical context (diagnosis/procedure/specialty) |
| [agents/patient-education-agent.ts](apps/web/src/lib/clinical-ai/agents/patient-education-agent.ts) | Builds patient education instruction |
| [agents/risk-explanation-agent.ts](apps/web/src/lib/clinical-ai/agents/risk-explanation-agent.ts) | Builds specialty-aware risk explanation |
| [audit/ai-generation-audit.ts](apps/web/src/lib/clinical-ai/audit/ai-generation-audit.ts) | Immutable AI audit record (generationId SHA256, outputHash, status, physicianUserId, promptVersion) |
| [safety/ai-guardrails.ts](apps/web/src/lib/clinical-ai/safety/ai-guardrails.ts) | Safety framework, guard against silent replacement |
| [safety/phi-minimization.ts](apps/web/src/lib/clinical-ai/safety/phi-minimization.ts) | Strips PII/PHI before any model call |
| [safety/immutable-legal-protection.ts](apps/web/src/lib/clinical-ai/safety/immutable-legal-protection.ts) | Prevents AI from rewriting locked legal sections |
| [safety/physician-approval.ts](apps/web/src/lib/clinical-ai/safety/physician-approval.ts) | Requires explicit physician approval before AI output becomes authoritative |
| [prompts/consent-risk.prompt.ts](apps/web/src/lib/clinical-ai/prompts/consent-risk.prompt.ts), [patient-education.prompt.ts](apps/web/src/lib/clinical-ai/prompts/patient-education.prompt.ts), [procedure-explanation.prompt.ts](apps/web/src/lib/clinical-ai/prompts/procedure-explanation.prompt.ts) | Prompt templates |
| [providers/azure-openai-provider.ts](apps/web/src/lib/clinical-ai/providers/azure-openai-provider.ts), [providers/clinical-ai-provider.ts](apps/web/src/lib/clinical-ai/providers/clinical-ai-provider.ts) | Azure OpenAI integration + provider facade with guardrails + audit |
| [types/clinical-ai-types.ts](apps/web/src/lib/clinical-ai/types/clinical-ai-types.ts) | TS types (`ClinicalAiGenerationRequest`, `ClinicalAiProviderResponse`, `ClinicalAiAuditRecord`, `ClinicalAiGenerationStatus`) |
| [clinical-ai.test.ts](apps/web/src/lib/clinical-ai/clinical-ai.test.ts) | Unit tests |

**Wiring to physician UI:** **Not wired** to `final-ui/`. The current Figma-ported physician UI does not import `clinical-ai/*`. Status = orphan inside the new physician journey.

### 2.2 AI Legal Intelligence (CODE — present)

[apps/web/src/lib/server/ai-legal-intelligence.ts](apps/web/src/lib/server/ai-legal-intelligence.ts). AI-assisted case assessment (LOW/MEDIUM/HIGH/CRITICAL risk, documentation gaps, recommendations, requires-review). OpenAI-backed with safe deterministic fallback. Used by the discharge-refusal / legal workflow surface — **not** by informed-consents physician journey.

### 2.3 Dynamic Consent Engine (CODE — present, feature-flagged off)

[apps/web/src/modules/consent-engine](apps/web/src/modules/consent-engine) — 79 files. Feature-flagged (`ENABLE_DYNAMIC_CONSENT_ENGINE` disabled by default). 7-layer validation pipeline, 3 templates (General / Cardiology / Surgery), specialty modules, validators, builders, renderers, PDF payload builder, audit. Currently **not wired** to the live physician journey.

Design docs:
- [DYNAMIC_CONSENT_ENGINE_FINAL_REPORT.md](DYNAMIC_CONSENT_ENGINE_FINAL_REPORT.md)
- [DYNAMIC_CONSENT_ENGINE_INTEGRATION_GUIDE.md](DYNAMIC_CONSENT_ENGINE_INTEGRATION_GUIDE.md)
- [docs/DYNAMIC_CONSENT_ENGINE_ARCHITECTURE.md](docs/DYNAMIC_CONSENT_ENGINE_ARCHITECTURE.md)

### 2.4 AI / experience governance (DOC — present)

- [docs/FUTURE_AI_INTEGRATION.md](docs/FUTURE_AI_INTEGRATION.md) — allowed roles (suggest risks, identify disclosure gaps, lay-language variants, payload-gap detection) vs disallowed (final legal wording, signature decisions, clinical recommendation override).
- [docs/informed-consent-experience-governance.md](docs/informed-consent-experience-governance.md) — medico-legal goals, patient-centered communication, physician accountability, conditional AI-assisted drafting.
- [docs/wathiqcare-smart-educational-consent-library-design-package.md](docs/wathiqcare-smart-educational-consent-library-design-package.md) — proposed Smart Educational Consent Library (Catalog / Delivery / Progress / Source-License / Consent-Integrator). **Design only; no code; migration 0028 was previously removed per Phase 36A.**

---

## 3. PDF Preparation / Evidence / Legal Package Work Found

| File | Status | Behaviour | Wired to physician UI? |
|---|---|---|---|
| [apps/web/src/lib/server/evidence-package-2-service.ts](apps/web/src/lib/server/evidence-package-2-service.ts) | CODE present | Bundles legal+audit+patient-copy+clinical context; exports `recordEvidenceEvent()`, `resolveEvidenceArchive()`, `getEvidencePackageState()`. References `consent_documents` PDF rows; **does not render PDFs**. Wired to `/api/public-signing/document/{token}/evidence` (patient side). | No |
| [apps/web/src/lib/server/legal-package-module-service.ts](apps/web/src/lib/server/legal-package-module-service.ts) | CODE present | Legal-package state machine (DRAFT → READY_TO_GENERATE → GENERATED → SENT_FOR_SIGNATURE → SIGNED → LOCKED → COURT_READY). Exports `getLegalPackageState()`, `validateLegalPackage()`, `generateLegalPackage()`, `signLegalPackage()`. **Does not render PDFs directly.** | No |
| [apps/web/src/lib/server/informed-consents-template-catalog.ts](apps/web/src/lib/server/informed-consents-template-catalog.ts) | CODE present | Template manifest (`listRuntimeConsentTemplates`, `getConsentTemplate`, `seedDefaultTemplates`, `buildSaudiTemplateBodyEn`, `buildSaudiTemplateBodyAr`). | No |
| [apps/web/src/lib/services/legalArtifact.service.ts](apps/web/src/lib/services/legalArtifact.service.ts) | CODE present | Discharge-refusal–specific PDF call (`POST /api/discharge/cases/{id}/legal-artifact/pdf`). **Not for informed-consents.** | N/A |
| [apps/web/src/lib/tracking.ts](apps/web/src/lib/tracking.ts) | CODE present | `trackPdfGenerated()` analytics only; no PDF generation. | N/A |
| [apps/web/src/components/informed-consents/final-ui/fixtures/status-tracking.ts](apps/web/src/components/informed-consents/final-ui/fixtures/status-tracking.ts) | MOCK | Includes a "PDF Generated" lifecycle status as mock-only fixture. | UI only |
| [apps/web/app/modules/informed-consents/[id]/final-pdf-viewer/page.tsx](apps/web/app/modules/informed-consents/[id]/final-pdf-viewer/page.tsx) | CODE present | Route exists for final-PDF viewing per document id. Not entered from the new physician journey. | No |

**Conclusion on PDFs:** No HTML→PDF renderer (puppeteer/pdfkit/playwright-pdf) was found in the informed-consents server tree. PDFs for the informed-consent flow are produced by the existing signing/document infrastructure that the new Figma-ported physician UI does not yet call. Phase 42 must not invent or fake PDF generation.

---

## 4. Contact Verification Work Found

| Surface | Status |
|---|---|
| [final-ui/fixtures/consent-builder.ts](apps/web/src/components/informed-consents/final-ui/fixtures/consent-builder.ts) | MOCK item v16 `Contact details confirmed / بيانات التواصل مؤكدة` (`severity: critical`) — UI checklist only. |
| [final-ui/steps/StepSend.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepSend.tsx) | UI captures mobile, email, channel (sms/email/both), language, expiry, physician confirmation. Local component state only; **no backend call**. |
| [final-ui/steps/StepPatient.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepPatient.tsx) | Displays mobile/email as static text. **No verification action wired** in the original Figma port. (Local-uncommitted patch from previous turn adds a verification block — pending decision.) |
| [apps/web/src/lib/config/feature-flags.ts](apps/web/src/lib/config/feature-flags.ts) | `ENABLE_SECURE_SIGNING_LINKS` flag — governs secure-link delivery channel. |
| [apps/web/src/services/sms/smsTemplates.ts](apps/web/src/services/sms/smsTemplates.ts) | `buildSecureSigningLinkSms()` template builder — used by Taqnyat client. |
| [apps/web/src/lib/server/pilot-email-override.ts](apps/web/src/lib/server/pilot-email-override.ts) | Pilot email channel for OTP and patient-copy notifications. |
| Backend `contact-verification` API | **Not found.** No `/api/.../contact-verification`, no `/api/.../patient-contact` endpoint in the repo. |

**Conclusion on contact verification:** No backend service confirms a patient contact pair (mobile + email + preferred channel) against encounter/patient records. Today the v16 item can only ever be marked complete by a UI action.

---

## 5. Secure-Link / Send Workflow Artefacts (listed only — not analysed)

| File | Note |
|---|---|
| [apps/web/src/lib/core/signature-core.ts](apps/web/src/lib/core/signature-core.ts) | Secure-link map + generator. `ENABLE_SECURE_SIGNING_LINKS` gated. **Not analysed.** |
| [apps/web/src/lib/server/public-signing-service.ts](apps/web/src/lib/server/public-signing-service.ts) | Public signing orchestration (OTP request/verify, decision, signature, evidence). **Not analysed.** |
| [apps/web/app/api/sign/[token]/request-otp/route.ts](apps/web/app/api/sign/[token]/request-otp/route.ts), [verify-otp/route.ts](apps/web/app/api/sign/[token]/verify-otp/route.ts) | OTP HTTP routes. **Presence only — not analysed.** |
| [apps/web/src/services/sms/taqnyatClient.ts](apps/web/src/services/sms/taqnyatClient.ts) | Taqnyat SMS provider. **Frozen for pilot; not analysed.** |

These surfaces remain explicitly out-of-scope for Phase 42.

---

## 6. Landing Page — Updated Source Found, Currently Orphan

**Updated source (found):** [apps/web/src/components/landing/WathiqcareWhiteLanding.tsx](apps/web/src/components/landing/WathiqcareWhiteLanding.tsx) — 14.9 kB, last modified 1 June 2026 22:48. Hero copy: *"Human-Centered Informed Consent, Legally Protected Care."* Stakeholder cards, focus tiles, consent feature tiles, request-demo CTA, contact CTA.

**Companion:** [apps/web/src/components/landing/](apps/web/src/components/landing/) folder. Plus [apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx](apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx) — 14.0 kB, same date.

**Current routing reality (directly verified):**

| Route | Renders today | Renders updated landing? |
|---|---|---|
| `/` → [apps/web/app/page.tsx](apps/web/app/page.tsx) | 450-line inline Arabic discharge-refusal landing (`FEATURES`, `STATS`, `HOW_IT_WORKS` arrays). | **No.** |
| `/[lang]` → [apps/web/app/[lang]/page.tsx](apps/web/app/[lang]/page.tsx) | Bilingual landing built from `useI18n()` keys (`landing.hero.title` = *"WathiqCare\nMedico-Legal Compliance & Governance Platform"*). | **No.** |
| Repo-wide grep for `WathiqcareWhiteLanding` imports | Zero hits under `apps/web/app/**`. | **Component is orphan.** |

> **Correction of subagent finding:** an earlier search summary claimed `WathiqcareWhiteLanding` is already wired into `app/page.tsx` and `app/[lang]/page.tsx`. This was checked directly and is **incorrect** — neither root page imports it. The updated landing is present in source but is not on any route, which matches the user-reported symptom "the updated Landing Page version is not deployed".

---

## 7. Previously-Built Physician Journey UIs

| Component | Path | State |
|---|---|---|
| **FinalInformedConsentsModule** (current) | [apps/web/src/components/informed-consents/FinalInformedConsentsModule.tsx](apps/web/src/components/informed-consents/FinalInformedConsentsModule.tsx) | ACTIVE — wraps `final-ui/App.tsx`. Mounted at [apps/web/app/modules/informed-consents/page.tsx](apps/web/app/modules/informed-consents/page.tsx) and [apps/web/src/app/modules/informed-consents/page.tsx](apps/web/src/app/modules/informed-consents/page.tsx). Mock-only. |
| **final-ui/** (8 steps + dashboard + search + status + validation drawer + clinical badge/types + fixtures) | [apps/web/src/components/informed-consents/final-ui/](apps/web/src/components/informed-consents/final-ui/) | ACTIVE — direct Figma-Make port from OneDrive (Phase 40). |
| **ApprovedPhysicianDashboard** (prior) | [apps/web/src/components/approved-design/physician/ApprovedPhysicianDashboard.tsx](apps/web/src/components/approved-design/physician/ApprovedPhysicianDashboard.tsx) | SUPERSEDED by Phase 35E and again by Phase 40. Still present in source. |
| **ApprovedPatientWorkflow** (patient side) | [apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx](apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx) | LOCKED — explicitly preserved by Phase 41A. Out of scope. |
| Existing in-app routes that the new Figma UI does not invoke | [apps/web/app/modules/informed-consents/create/page.tsx](apps/web/app/modules/informed-consents/create/page.tsx), [consent-creation-workflow/page.tsx](apps/web/app/modules/informed-consents/consent-creation-workflow/page.tsx), [archive/page.tsx](apps/web/app/modules/informed-consents/archive/page.tsx), [governance/page.tsx](apps/web/app/modules/informed-consents/governance/page.tsx), [list/page.tsx](apps/web/app/modules/informed-consents/list/page.tsx), [template-builder/page.tsx](apps/web/app/modules/informed-consents/template-builder/page.tsx), [template-registry/page.tsx](apps/web/app/modules/informed-consents/template-registry/page.tsx), [templates/page.tsx](apps/web/app/modules/informed-consents/templates/page.tsx), [wording-governance/page.tsx](apps/web/app/modules/informed-consents/wording-governance/page.tsx), [[id]/preview/page.tsx](apps/web/app/modules/informed-consents/[id]/preview/page.tsx), [[id]/final-pdf-viewer/page.tsx](apps/web/app/modules/informed-consents/[id]/final-pdf-viewer/page.tsx), [[id]/evidence-package-export/page.tsx](apps/web/app/modules/informed-consents/[id]/evidence-package-export/page.tsx), [[id]/legal-audit-trail/page.tsx](apps/web/app/modules/informed-consents/[id]/legal-audit-trail/page.tsx), [[id]/patient-review/page.tsx](apps/web/app/modules/informed-consents/[id]/patient-review/page.tsx), [[id]/signature/page.tsx](apps/web/app/modules/informed-consents/[id]/signature/page.tsx) | PRESENT — pre-Phase-40 routes. The new Figma-ported physician journey does not link to them; they remain reachable by direct URL. |

---

## 8. OneDrive Figma Export Gap Analysis

OneDrive root: `C:\Users\basel\OneDrive\Desktop\WathiqCare-Figma-UX-UI\src\app\components\`

- **Steps** (`steps/StepPatient.tsx`, `StepProcedure.tsx`, `StepAnesthesia.tsx`, `StepDisclosures.tsx`, `StepEducation.tsx`, `StepPreview.tsx`, `StepValidation.tsx`, `StepSend.tsx`): identical 8-file set in [final-ui/steps](apps/web/src/components/informed-consents/final-ui/steps).
- **Top-level**: `ConsentBuilder`, `PatientSearch`, `PhysicianDashboard`, `StatusTracking`, `clinical/*` all ported. `figma/ImageWithFallback.tsx` and `ui/*` intentionally not re-ported (the app already has shadcn).
- **Gap:** No additional AI/PDF/contact-verification screens exist in OneDrive that are missing from the port. The Figma-Make export itself contains the same mock fixtures (incl. v16) and the same lack of backend wiring.

The defect is therefore inherent to the Figma export and was carried over faithfully by Phase 40 — it is **not a port omission**.

---

## 9. Root-Cause Reconciliation Against User Symptoms

| Symptom | Root cause (from recovery) |
|---|---|
| Completeness Check stays red | `final-ui/fixtures/consent-builder.ts` is a static mock; nothing calls a real validation API. Several step components do call `onComplete(step, [ids])`, but `StepProcedure` does not mark `v5` (Procedure description AR), and `v16` (Contact details confirmed) is only ever marked from `StepSend.handleSend` → catch-22 with the `StepValidation` gate (`canProceed = critical.length === 0`). |
| Patient contact verification cannot be completed | `StepPatient.tsx` shows mobile/email as static text with no verification action. There is no backend `contact-verification` endpoint in the repo. |
| PDF preparation / preview / send not reachable | `StepValidation` blocks until all critical items are complete. `StepPreview` already calls `onComplete('preview', ['v14'])` on Acknowledge but is unreachable until the upstream blockers above are unblocked. No PDF renderer exists in the informed-consents server tree; the Figma-ported flow does not call any of the pre-existing PDF/evidence/legal-package services. |
| Updated landing page not deployed | `WathiqcareWhiteLanding` exists in source but is not imported by any route. `/` and `/[lang]` render the prior landings. |

---

## 10. What Can Be Safely Patched (Recommended Controlled Patch Plan)

All items are frontend-only, additive, do not touch migrations / SMS / OTP / signing / public-signing / patient-journey / database. None creates real patient delivery. Everything is reversible by reverting the listed files only.

### 10.1 Physician journey completion gate

1. [final-ui/ConsentBuilder.tsx](apps/web/src/components/informed-consents/final-ui/ConsentBuilder.tsx) — replace `useState<Set<ConsentStep>>(new Set(['patient', 'procedure']))` with `useState<Set<ConsentStep>>(new Set<ConsentStep>())` so step completion reflects user progress instead of a hard-coded preset. *(Already applied locally, uncommitted.)*
2. [final-ui/steps/StepProcedure.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepProcedure.tsx) — Continue button calls `onComplete('procedure', ['v3','v4','v5'])` then `onNext()`. *(Already applied locally, uncommitted.)*
3. [final-ui/steps/StepPatient.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepPatient.tsx) — add a labelled **Patient Contact Details Verification** block (mobile, email, preferred channel, explicit checkbox) that, on confirmation, calls `onComplete('patient', ['v1','v2','v16'])` then `onNext()`. Continue button stays disabled until the checkbox is ticked. *(Already applied locally, uncommitted.)*
4. [final-ui/fixtures/consent-builder.ts](apps/web/src/components/informed-consents/final-ui/fixtures/consent-builder.ts) — re-section `v16` from `send` to `patient` so the section heading matches where it is collected. *(Already applied locally, uncommitted.)*
5. [final-ui/steps/StepPreview.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepPreview.tsx) — **(not yet patched)** add a clear pilot-mode disclaimer banner: *"PDF Preparation Preview — PDF generation integration pending. No patient delivery triggered."* Acknowledge still marks `v14`.
6. [final-ui/steps/StepSend.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepSend.tsx) — **(not yet patched)** relabel the CTA to *"Send Secure Link (pilot-controlled)"* and add a banner: *"Pilot mode — no patient link is delivered from this screen. Controlled physician walkthrough only."* Replace the `sent` confirmation copy with an explicit pilot-mode acknowledgement that no link was sent.

These five edits are sufficient to unblock the full physician journey through to Send **as a pilot walkthrough**, without inventing any backend behaviour and without faking PDF generation as final production behaviour.

### 10.2 Landing page route restore

7. [apps/web/app/page.tsx](apps/web/app/page.tsx) — replace body with `<WathiqcareWhiteLanding lang="en" />`.
8. [apps/web/app/[lang]/page.tsx](apps/web/app/[lang]/page.tsx) — replace body with `<WathiqcareWhiteLanding lang={lang} />`.

Both files remain `"use client"` `force-dynamic`. No other routes (`/login`, `/request-demo`, `/modules`, `/modules/informed-consents/*`, `/sign/*`, `/admin/*`) are touched.

### 10.3 Explicitly NOT touched

- No edits to `clinical-ai/*`, `ai-legal-intelligence.ts`, `consent-engine/*`, `evidence-package-2-service.ts`, `legal-package-module-service.ts`, `public-signing-service.ts`, `signature-core.ts`, `taqnyatClient.ts`, `pilot-email-override.ts`, `informed-consents-template-catalog.ts`, any `/api/**` route.
- No migrations.
- No environment / feature-flag changes.
- No git operations beyond the existing working branch. Nothing pushed, nothing merged, nothing deployed.

---

## 11. What Must NOT Be Touched in Phase 42

- Patient-journey source (`approved-design/patient/ApprovedPatientWorkflow.tsx` and `app/sign/[token]/workflow/page.tsx`) — locked by Phase 41A.
- Public-signing service and all `/api/sign/*` and `/api/public-signing/*` endpoints.
- OTP request/verify, signing cookies, signing tokens, signing sessions.
- SMS providers (Taqnyat client; `SMS_ENABLED=false` retained).
- Email providers and pilot-email override.
- Clinical AI module (no wiring change in Phase 42 — recovery is for cataloguing only; activation belongs to a later phase under `FUTURE_AI_INTEGRATION.md` governance).
- Dynamic Consent Engine feature flag.
- Database schema and migrations.

---

## 12. Recommended Next-Phase Roadmap (out of scope for 42)

This recovery surfaced multiple ready-but-unwired assets. None of these are part of Phase 42; they are catalogued here for downstream governance decisions:

1. **Wire clinical-ai/* as an advisory layer** in `StepDisclosures` (risk-explanation suggestions), `StepEducation` (patient-education suggestions), and `StepPreview` (procedure-explanation summary). Subject to `FUTURE_AI_INTEGRATION.md` rules: advisor-only, attributable, physician-approval-gated, PHI-minimized, audited.
2. **Implement the `/api/modules/informed-consents/documents/{id}/validation` endpoint** referenced in the fixture header comment, and replace the mock `defaultValidation` with a live readiness score.
3. **Smart Educational Consent Library**: restore migration 0028 and implement the five logical services per [docs/wathiqcare-smart-educational-consent-library-design-package.md](docs/wathiqcare-smart-educational-consent-library-design-package.md). Requires user governance approval.
4. **Wire Evidence Package v2 and Legal Package state machine** into `StepPreview` / `StepValidation` so the physician sees real state rather than mock badges.
5. **Activate Dynamic Consent Engine** in staging behind its existing flag for specialty-aware rendering.

---

## 13. Final Classification

**PRIOR AI-ASSISTED WORK FOUND – READY FOR CONTROLLED PATCH**

Rationale:
- Prior AI-assisted work for the consent process is present and catalogued (`clinical-ai/`, `ai-legal-intelligence.ts`, dynamic consent engine, governance docs).
- The updated landing page (`WathiqcareWhiteLanding.tsx`) is present and confirmed orphan.
- Evidence-package and legal-package services exist and are not wired to the new physician UI.
- A minimal, frontend-only, additive controlled patch (eight files listed in §10) can unblock the physician journey as a pilot walkthrough and restore the updated landing page **without** touching any restricted surface and **without** inventing or faking backend behaviour.
- Activation of clinical-ai, evidence-package, legal-package, dynamic engine, and smart educational library wiring is **out of scope** for Phase 42 and must follow `FUTURE_AI_INTEGRATION.md` and `informed-consent-experience-governance.md` governance in a separate phase.

---

## 14. Required User Decisions Before Any Patch Proceeds

1. **Approve / amend / revert the four already-applied (uncommitted) local edits** listed in §10.1 items 1–4.
2. **Approve the remaining two physician-journey patches** in §10.1 items 5–6 (`StepPreview` pilot banner, `StepSend` pilot relabel).
3. **Approve the landing-page route restore** in §10.2 items 7–8 — and confirm whether `WathiqcareWhiteLanding` (currently English-only copy) should be wired as-is for both `/` and `/[lang]`, or whether the `[lang]/page.tsx` route should keep the existing i18n landing until a bilingual variant of the updated landing is produced.
4. **Confirm exclusions** in §10.3 / §11 are correct for Phase 42B (no AI wiring, no PDF generation wiring, no patient delivery, no migrations, no SMS, no signing edits).

No build, no `tsc`, no visual smoke, no commit, no push, no deploy will be performed until decisions 1–4 are returned.
