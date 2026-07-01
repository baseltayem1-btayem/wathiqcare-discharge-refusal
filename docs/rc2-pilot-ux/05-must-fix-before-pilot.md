# RC1 Gate 2B — Must Fix Before Pilot

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27

---

## Criteria for Must Fix

Items listed here block an Internal IMC Pilot because they:
- Prevent patients or physicians from completing the core workflow, **or**
- Expose debug/mock state to end users, **or**
- Present an unprofessional or unsafe clinical experience, **or**
- Create legal/audit risk by showing synthetic data as real evidence.

---

## Must-Fix Items

### 1. Create a reachable patient signing route
**Problem:** No Next.js page serves the patient journey. Production screenshots show “Missing public signing session.”  
**Impact:** Patients cannot complete consent.  
**Required action:**
- Create `/sign/[token]/page.tsx` or `/public-signing/document/[token]/page.tsx`.
- Wire it to either `ApprovedPatientWorkflow.tsx` (recommended v1.1 Figma implementation) or a cleaned-up `PublicSigningWorkflow.tsx`.
- Remove broken rewrite rules that point to non-existent pages.

### 2. Remove or gate the `/prototype/clinical-workspace-2` route from end users
**Problem:** The best physician UX is explicitly labeled “Not for clinical use.”  
**Impact:** Using it in pilot would be unsafe and non-compliant.  
**Required action:**
- Either promote it to a real route after wiring real APIs and removing the banner, **or**
- Block it behind an environment flag that is off in pilot builds.

### 3. Choose a single canonical physician workspace
**Problem:** Three competing surfaces (`PhysicianConsentWorkflow`, `DoctorWorkspaceV2`, `/prototype/clinical-workspace-2`).  
**Impact:** Fragmented experience, inconsistent training, duplicated maintenance.  
**Required action:**
- Declare one surface as the RC1 physician workspace.
- Remove or hide the others from pilot users.

### 4. Strip all debug/developer instrumentation from user-facing UI
**Problem:** Task Simulator, prototype banner, mock labels, system status, route/role metadata, evidence hashes, and “Dev code” are visible.  
**Impact:** Looks unprofessional and may leak internal state.  
**Required action:**
- Remove Task Simulator from any production build.
- Remove prototype banner and “Decision-support preview” badge.
- Remove entity/route/role/version/system status from `AppShell`, `ModuleShell`, `WathiqCareShell` headers.
- Remove mock OTP code from `MockOtpVerification` and `StepUpVerificationPanel`.
- Remove HID debug fields from `PatientSigningPanel`.
- Remove “(mock)” labels and disabled mock buttons from patient confirmation.

### 5. Replace simulated signature with real signature capture
**Problem:** `PatientSignaturePanel.tsx` in the prototype draws a hard-coded Bézier curve.  
**Impact:** No legally meaningful signature is captured.  
**Required action:**
- Use a real signature pad (e.g., `signature_pad` or tablet-drawn canvas) that records the patient’s actual strokes.

### 6. Fix login page character encoding
**Problem:** Title and footer show `WathiqCareâ„¢`, `â†'`, etc.  
**Impact:** Unprofessional first impression; suggests QA gaps.  
**Required action:**
- Ensure UTF-8 encoding end-to-end for Arabic and special characters.

### 7. Remove or replace placeholder pages
**Problem:** `ModulePlaceholderPage.tsx` shows dashed “workflow implementation pending” boxes.  
**Impact:** Not acceptable if any unfinished module is reachable.  **Required action:**
- Hide unfinished modules from `/modules` or implement their workflows.

### 8. Replace hard-coded demo physician context with authenticated context
**Problem:** `DoctorWorkspaceV2` and `ConsentAssemblyPanel` pass demo physician name, license, capacity, and language.  
**Impact:** Generated consent documents would carry fake physician identity.  **Required action:**
- Pull physician name, license, specialty, and patient context from the authenticated session and selected encounter.

### 9. Ensure patient confirmation does not show audit hashes
**Problem:** Patient confirmation screen displays SHA-256 evidence hash strings.  **Impact:** Intimidating and meaningless to patients; may reduce trust.  **Required action:**
- Move evidence hash to an audit/download section; show patients a simple confirmation code, case reference, or timestamp.

### 10. Validate end-to-end on mobile and RTL
**Problem:** No mobile or RTL screenshots of physician or patient flows.  **Impact:** Pilot users will include Arabic-speaking clinicians and patients on mobile devices.  **Required action:**
- Capture real patient and physician screenshots on mobile (iOS Safari, Android Chrome) and desktop RTL.
- Fix any layout breaks before gate sign-off.

---

## Acceptance Checklist

- [ ] Patient can open a secure link and complete OTP → education → review → decision → signature → confirmation without errors.
- [ ] Physician workspace has no “prototype,” “mock,” “dev,” “simulated,” or debug labels visible.
- [ ] Only one physician workspace is reachable by pilot users.
- [ ] Login page renders Arabic and special characters correctly.
- [ ] No placeholder “implementation pending” pages are reachable.
- [ ] Signature capture records actual patient strokes, not a hard-coded curve.
- [ ] Generated documents use the authenticated physician’s real identity.
- [ ] Patient confirmation is patient-friendly (no raw hashes).
- [ ] Mobile and RTL screenshots are added to `qa-screenshots/` and pass visual review.
