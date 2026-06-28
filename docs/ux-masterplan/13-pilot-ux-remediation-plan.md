# WathiqCare Enterprise UX 2.0 — Pilot UX Remediation Plan

**Principal Product Designer | WathiqCare Enterprise Edition**

**Duration:** 2 weeks  
**Goal:** Make WathiqCare safe and usable for an Internal IMC Pilot by remediating only the highest-impact UX blockers.

---

## 1. Must-Fix Before Pilot

These items block pilot release. They are derived from the RC1 Gate 2B UX review and the WathiqCare Enterprise UX 2.0 masterplan.

### 1.1 Establish ONE Canonical Physician Workspace

**Problem:** Three competing physician surfaces exist (`PhysicianConsentWorkflow`, `DoctorWorkspaceV2`, `/prototype/clinical-workspace-2`). This fragments training, increases error risk, and signals an immature product.

**Decision:** Promote the visual language and interaction model of `/prototype/clinical-workspace-2` as the canonical physician workspace. Strip its prototype banner and mock data, then wire it to real APIs.

**Required outcome:**
- A single route serves the physician consent workflow.
- All other physician surfaces are hidden from pilot users.
- The workspace uses authenticated physician context and real encounter data.

---

### 1.2 Make the Patient Signing Journey Reachable

**Problem:** No production route serves the patient signing experience. `ApprovedPatientWorkflow.tsx` and `PublicSigningWorkflow.tsx` exist but are not wired to a Next.js page. Production screenshots show a “Missing public signing session” error.

**Decision:** Create `/sign/[token]/page.tsx` as the canonical patient signing route. Use `ApprovedPatientWorkflow.tsx` as the base, refactor it into the patient journey screens defined in `06-patient-journey.md`, and ensure it works end-to-end.

**Required outcome:**
- Patient can open a secure link and complete OTP → review → decision → signature → confirmation.
- The flow is reachable, functional, and free of debug/mock artifacts.

---

### 1.3 Remove Prototype / Debug / Mock Exposure

**Problem:** Production screenshots and components contain Task Simulator, prototype banners, mock labels, system metadata, route/role/version badges, and “dev code” indicators.

**Required outcome:**
- No prototype banner, “Not for clinical use,” or “Decision-support preview” badges in production.
- No Task Simulator overlay in production builds.
- No system status, database status, route, role, version, or build metadata in user-facing headers.
- No mock OTP codes, mock buttons, or disabled mock UI in patient verification.
- No HID debug fields in patient signing.
- No evidence hashes displayed to patients on confirmation.

---

### 1.4 Remove Fake Physician Context

**Problem:** `DoctorWorkspaceV2` and `ConsentAssemblyPanel` use hard-coded physician name, license, specialty, capacity, and language. Signed consent documents would carry a fake clinical identity.

**Required outcome:**
- Physician name, license, specialty, and department are pulled from the authenticated session.
- Patient context comes from the selected encounter.
- All demo physician objects are removed from production code paths.

---

### 1.5 Fix Arabic / RTL / Login Text Encoding

**Problem:** The login page and possibly other screens show mojibake (`WathiqCareâ„¢`, `â†'`). Arabic content may be double-encoded. No RTL layout evidence exists for pilot-critical screens.

**Required outcome:**
- Login page renders special characters and Arabic correctly.
- HTML charset is UTF-8 throughout.
- Physician and patient pilot screens have functional RTL layouts.
- Arabic consent disclosures are editable and readable without encoding corruption.

---

### 1.6 Make Physician and Patient Core Journeys Mobile-Responsive

**Problem:** No mobile screenshots or tested flows exist for physician or patient journeys. Components are desktop-oriented and will break on phones/tablets.

**Required outcome:**
- Patient signing journey is usable on iOS Safari and Android Chrome.
- Physician core tasks (inbox triage, task detail, send) are usable on tablet and phone.
- Touch targets meet minimum size (44×44px, 48×48px preferred).
- Responsive breakpoints follow `08-mobile-strategy.md`.
- Bedside tablet signing works in landscape and portrait.

---

## 2. Implementation Sequence

### Week 1: Stabilize and Consolidate

#### Day 1–2: Cleanup
1. Hide `/prototype/clinical-workspace-2` behind `NODE_ENV === 'development'` or a feature flag disabled in production.
2. Remove prototype banners, Task Simulator, debug metadata, mock labels, and system status pills from all production components.
3. Remove mock OTP codes and HID debug fields from patient verification and signing.
4. Remove evidence hashes from patient confirmation; replace with short confirmation code.
5. Fix login page UTF-8 encoding.

#### Day 3–4: Physician Workspace Consolidation
1. Choose `/clinical/consent-tasks` (or equivalent) as the canonical physician route.
2. Consolidate visual language from `clinical-workspace-2` into a single production component.
3. Remove or redirect `PhysicianConsentWorkflow` and `DoctorWorkspaceV2` from pilot navigation.
4. Wire workspace to authenticated physician context and real encounter data.

#### Day 5: Authenticated Context
1. Replace hard-coded physician objects with session-derived values.
2. Validate that generated consent previews and documents reflect the real physician identity.
3. Add fallback states for missing profile data.

### Week 2: Patient Journey and Mobile

#### Day 6–7: Patient Signing Route
1. Create `/sign/[token]/page.tsx`.
2. Refactor `ApprovedPatientWorkflow.tsx` into the canonical patient journey screens.
3. Wire secure link token parsing, OTP verification, and session hydration.
4. Ensure decision, signature, and confirmation steps function end-to-end.

#### Day 8–9: Mobile Responsiveness
1. Apply mobile-first styles to patient signing screens.
2. Apply responsive layouts to physician inbox and task detail.
3. Test signature pad on touch devices; add rotate-to-landscape behavior.
4. Verify tablet bedside experience.

#### Day 10: RTL and Final Validation
1. Enable RTL layouts for Arabic.
2. Fix any flipped layout issues on physician and patient screens.
3. Run through the full pilot flow on desktop LTR, desktop RTL, mobile LTR, and mobile RTL.
4. Document remaining gaps and flag them explicitly.

---

## 3. Files Likely Affected

### Physician Workspace
- `apps/web/src/app/(clinical)/physician/page.tsx`
- `apps/web/src/app/(clinical)/clinical/consent-tasks/page.tsx`
- `apps/web/src/app/(clinical)/clinical/consent-tasks/[id]/page.tsx`
- `apps/web/src/components/physician/ClinicalWorkspace.tsx` (new canonical component)
- `apps/web/src/components/physician/PhysicianConsentWorkflow.tsx` (deprecate/hide)
- `apps/web/src/components/physician/DoctorWorkspaceV2.tsx` (deprecate/hide)
- `apps/web/src/components/prototype/clinical-workspace-2/` (hide in production)
- `apps/web/src/components/physician/ConsentAssemblyPanel.tsx`
- `apps/web/src/components/physician/KnowledgePackageCard.tsx`
- `apps/web/src/components/shell/AppShell.tsx`
- `apps/web/src/components/shell/ModuleShell.tsx`
- `apps/web/src/components/shell/WathiqCareShell.tsx`

### Patient Journey
- `apps/web/src/app/sign/[token]/page.tsx` (create)
- `apps/web/src/components/patient/ApprovedPatientWorkflow.tsx` (refactor)
- `apps/web/src/components/patient/PublicSigningWorkflow.tsx` (merge or deprecate)
- `apps/web/src/components/patient/OtpVerificationShell.tsx`
- `apps/web/src/components/patient/PatientSignaturePanel.tsx`
- `apps/web/src/components/patient/PatientSigningPanel.tsx`
- `apps/web/src/components/patient/MockOtpVerification.tsx` (remove from production)
- `apps/web/src/components/patient/StepUpVerificationPanel.tsx`

### Shared / Infrastructure
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/styles/globals.css`
- `apps/web/src/lib/server/secure-links.ts`
- `apps/web/src/lib/server/rate-limiter.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/next.config.js` (rewrites for `/sign/[token]`)

### Backend / PDF
- `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts`
- `apps/pdf-renderer/src/server.ts`
- `apps/api/backend/services/audit_service.py`

---

## 4. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Consolidating physician surfaces breaks existing user flows | Medium | High | Maintain redirects; keep old routes accessible only to admins during transition. |
| Patient signing route security gaps | Medium | Critical | Reuse existing secure-link OTP and rate-limiting; do not bypass authentication. |
| Removing mock data reveals missing API contracts | High | High | Define minimal API contracts first; use typed stubs only where real endpoints are unavailable. |
| RTL layout breaks many components | Medium | Medium | Scope RTL to pilot-critical screens; document known issues for GA. |
| Mobile signature pad usability is poor | Medium | High | Test on real devices; allow rotate-to-landscape and typed-name fallback. |
| Fake physician context deeply embedded | Medium | High | Audit all components that construct demo physician objects; replace with session getter. |
| Timeline compression causes quality gaps | High | High | Strictly defer non-pilot scope; validate daily with pilot users. |

---

## 5. Acceptance Criteria

### Physician Workspace
- [ ] Only one physician workspace is reachable by pilot users.
- [ ] The workspace loads real patient and encounter context from APIs/session.
- [ ] No prototype banner, mock label, or debug metadata is visible.
- [ ] A standard consent can be prepared and sent in ≤ 5 minutes during pilot (target ≤ 3 minutes post-GA).
- [ ] Generated consent preview/document uses the authenticated physician’s real identity.

### Patient Journey
- [ ] `/sign/[token]` is the canonical route and resolves correctly.
- [ ] Patient can verify identity, review content, make a decision, sign, and receive confirmation.
- [ ] No mock OTP, HID debug, or evidence hashes are shown.
- [ ] Signature capture records actual strokes or a valid typed attestation.
- [ ] Decline flow is respectful and notifies the care team.

### Quality / Safety
- [ ] No Task Simulator, system status pills, route/role/version metadata, or “dev code” in production builds.
- [ ] Login page and Arabic content render correctly without mojibake.
- [ ] RTL layout is functional on pilot-critical screens.
- [ ] Patient and physician journeys are usable on mobile and tablet.
- [ ] No critical accessibility violations on pilot screens.

---

## 6. Validation Checklist

### Functional Validation
- [ ] Open `/clinical/consent-tasks` and complete a consent task end-to-end.
- [ ] Open a secure signing link and complete patient journey end-to-end.
- [ ] Verify that declined consents notify the care team.
- [ ] Verify that generated documents show the real physician name and license.
- [ ] Verify that patient confirmation shows a short confirmation code, not a hash.

### Visual / UX Validation
- [ ] Screenshot the physician workspace with no debug chrome.
- [ ] Screenshot the patient signing journey on desktop.
- [ ] Screenshot the patient signing journey on iOS Safari.
- [ ] Screenshot the patient signing journey on Android Chrome.
- [ ] Screenshot RTL physician and patient flows.

### Technical Validation
- [ ] Confirm no references to `MockOtpVerification`, `Task Simulator`, `prototype`, `Not for clinical use`, `Dev code`, or `mock` in production bundles.
- [ ] Confirm no hard-coded physician demo objects in production code paths.
- [ ] Run automated accessibility scan (axe) on pilot screens; zero critical/high issues.
- [ ] Verify responsive breakpoints and touch target sizes.

### Stakeholder Validation
- [ ] Demo the full flow to at least two pilot physicians.
- [ ] Demo the patient flow to at least two non-technical users.
- [ ] Obtain clinical safety sign-off.
- [ ] Obtain compliance sign-off on consent record content.

---

## 7. What Is Deferred to GA

The 2-week remediation intentionally narrows scope. The following remain in the 30-week roadmap and are **not** required for pilot:

### Design System Completeness
- Full component library parity with `07-component-library.md`.
- Dark mode.
- Advanced motion and micro-interactions.
- Full iconography and illustration set.

### Physician Workflow Depth
- Advanced clinical decision support and explainability.
- Bilingual disclosure authoring with side-by-side EN/AR editor.
- Full participant management (interpreter/witness/guardian) beyond basic fields.
- Advanced reporting and analytics.

### Patient Experience Depth
- Audio explanations and procedure videos.
- Comprehension checks and quizzes.
- Patient portal account history.
- Advanced question-and-answer workflow.

### Enterprise Surfaces
- Compliance dashboard redesign.
- Admin console redesign.
- Advanced audit trail visualizations.
- Report builder and data exports.

### Scale & Performance
- Native mobile apps.
- Offline support.
- Push notifications.
- Advanced caching and edge delivery.

### Accessibility
- Full WCAG 2.2 AAA where not already AA.
- Complete assistive technology matrix testing.
- Full screen-reader optimization across all modules.

---

## 8. Success Definition for Pilot

The pilot is considered UX-remediated when:

1. A pilot physician can log in, select a patient encounter, review clinical content, and send a consent request without encountering debug, mock, or prototype UI.
2. A pilot patient can receive a secure link on a mobile device, verify identity, understand the consent content, make a decision, sign, and receive a clear confirmation.
3. The generated consent record reflects real physician and patient context and is legally defensible.
4. The experience is functional in English and Arabic, LTR and RTL, on desktop and mobile.
5. All Must-Fix acceptance criteria and validation checklist items are satisfied.

---

## 9. Communication

- **Daily standups:** Engineering + Design, 15 minutes.
- **Mid-week checkpoint:** Review screenshots and flows with pilot physicians.
- **End-of-week demo:** Show progress to leadership and clinical safety.
- **Final go/no-go:** Review against acceptance criteria before pilot launch.
