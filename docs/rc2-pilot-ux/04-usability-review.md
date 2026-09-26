# RC1 Gate 2B — Usability Review

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27  
**Scope:** Clicks, Wording, Hidden Actions, Duplicated Information, Large Forms, Clinical Friction

---

## Executive Summary

The current flows introduce unnecessary cognitive load for physicians and patients. The enterprise wizard requires too many decisions, the prototype buries actions under dense cards, and the patient journey is not reachable. Usability friction is concentrated in workflow length, duplicated information, exposed internals, and unclear next actions.

---

## 1. Physician Workflow Usability

### Too many clicks
- **Enterprise wizard:** ~8 steps, ~24 clicks, ~14 decisions per consent (per workspace README).
- Many steps (category, template, procedure, anesthesia) are read-only confirmations rather than true decisions, yet they each require a click to advance.
- **Prototype:** Auto-resolves most selections, but the CKP card is so long that the physician must scroll significantly to reach the Send action.

### Confusing wording
- **“Physician writes the legal doc” anti-pattern:** Draft preview renders first-person patient text (“I, Ahmad Hassan, confirm…”). Physicians expect to complete a checklist, not proofread a legal document written from the patient’s perspective.
- **“Why is this guidance shown?”** panel uses system-oriented language (“procedure, patient capacity, language preference, allergies, medications, package status, and risk level”) instead of clinical guidance.
- **“Decision-support preview”** header label in the prototype frames the workspace as experimental.
- **“Template Source: Database Connected / Loading / Fallback”** exposes internal state.

### Hidden actions
- **Blocked action badge** in the action rail is not clickable; physicians must notice and open the sidebar checklist.
- **Export evidence** button in the Task Simulator is prominent but irrelevant to physicians.
- **Patient preview mode** is discoverable only through a small toggle.

### Duplicated information
- Readiness/validation panels appear in the wizard step, sidebar, and audit page.
- The same clinical guidance is shown as a colored card and again in the “Why is this guidance shown?” expander.
- Context bar, CKP card, and draft preview all repeat patient/encounter/procedure metadata.

### Large forms
- `PhysicianConsentWorkflow.tsx` (~4,100 lines) bundles patient selection, category, template, procedure, anesthesia, education, review, and send into one component.
- `ApprovedPatientWorkflow.tsx` (~2,250 lines) similarly mixes API calls, state, signature logic, and screen rendering.

### Clinical friction
- Hard-coded demo physician context in V2 workspace means a real physician must manually override name, license, specialty, etc.
- No always-visible stepper in the prototype makes it hard to know where you are in the process.
- Alert acknowledgement is required but not clearly tied to the Send action.

---

## 2. Patient Workflow Usability

### Critical gap
- **No reachable patient route** means the entire required flow cannot be evaluated in production.

### Issues in orphaned components
- **Legacy `PublicSigningWorkflow.tsx`** shows raw metadata to patients (“Education required: Yes”, “Scroll completion: 95%”, evidence hashes). This is audit/debug information, not patient-friendly content.
- **OTP step order** is unclear: Figma v1.1 places OTP immediately after landing; the production pipeline gates all content behind OTP. The design intent and technical constraint are not reconciled in user-facing messaging.
- **Mock OTP code visible** (`482917`) removes the security purpose of OTP.
- **Signature panel in prototype** uses a hard-coded curve, so the patient cannot actually sign.
- **Patient confirmation** shows an evidence hash string, which is meaningless and intimidating.

### Missing patient safeguards
- No clear “I do not understand” or “Ask my doctor” path.
- No visible mechanism to replay education material after OTP.
- No clear indication of what happens after refusal.

---

## 3. Navigation Usability

| Issue | Observation |
|---|---|
| Multiple entry points | `/modules/informed-consents`, `/modules/informed-consents/v2/workspace`, `/prototype/clinical-workspace-2` |
| No canonical workspace | Users may land on different surfaces depending on route/feature flags |
| Conditional nav hides nav on public routes | But public signing routes do not exist |
| Back/forward behavior unclear | 8-step wizard vs single-screen prototype have different mental models |

---

## 4. Error Messages

| Context | Current State | Issue |
|---|---|---|
| Public signing session missing | Production error page | Hard blocker; patient cannot proceed |
| Invalid OTP | Orphaned component logic | Not reachable |
| Expired link | Orphaned component logic | Not reachable |
| Account locked | New secure-link OTP route | English-only message; not localized |
| Login page | Encoding artifacts | Looks unprofessional |

---

## 5. Empty & Loading States

| State | Issue |
|---|---|
| Loading | Functional workflow exposes “Database Connected / Loading / Fallback” |
| Empty workspace | Clean in prototype; not evaluated in production surfaces |
| No results | Not evaluated |
| Error | Generic “Missing public signing session” page |

---

## 6. Mobile & Accessibility Usability

| Item | Status |
|---|---|
| Mobile-first patient components | ✅ Strong in v1.1 components |
| Mobile physician workspace | ❌ No evidence |
| RTL usability | ❌ No evidence |
| Touch targets | ✅ v1.1 components use large buttons |
| Screen reader | ⚠️ Debug metadata may be read aloud |
| Focus management | ⚠️ Not verified |

---

## 7. Usability Verdict

**Status: NOT READY for pilot**

The physician workflow is too long and decision-heavy, the patient workflow is not reachable, and both expose implementation details that increase cognitive load. Significant simplification and cleanup are required before RC1.

---

## 8. Top 10 Usability Issues

| # | Issue | Severity |
|---|---|---|
| 1 | No reachable patient signing route | Critical |
| 2 | Enterprise wizard too long (~24 clicks) | High |
| 3 | Physician reviews first-person legal text | High |
| 4 | Mock OTP code visible to users | High |
| 5 | Debug metadata exposed in shell headers | High |
| 6 | Blocked action badge not clickable | Medium |
| 7 | Duplicated readiness/guidance panels | Medium |
| 8 | CKP card pushes primary action below fold | Medium |
| 9 | Evidence hash on patient confirmation | Medium |
| 10 | Hard-coded demo physician context | Medium |
