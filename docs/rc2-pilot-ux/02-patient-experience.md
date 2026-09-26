# RC1 Gate 2B — Patient Experience Review

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27  
**Scope:** Patient Journey, OTP, Education, Consent Review, Questions, Accept/Refuse, Signature, Confirmation

---

## Executive Summary

The visual and interaction pieces for a strong patient signing experience exist in the codebase, but **no production Next.js route serves the patient journey**. Both the legacy `PublicSigningWorkflow` and the approved v1.1 `ApprovedPatientWorkflow` are orphaned components. Production hotfix screenshots show patients hitting a **“Missing public signing session”** error page. This is a hard blocker for any pilot that includes patient participation.

---

## 1. Required Simple Patient Flow

Receive Secure Link → OTP → Patient Education → Consent Review → Questions → Accept / Refuse → Signature → Confirmation

### Current state
| Step | Status | Observation |
|---|---|---|
| Receive Secure Link | ⚠️ | Link generation exists; public route for opening the link does not |
| OTP | ❌ | Polished OTP components exist but are not mounted on any route |
| Patient Education | ❌ | Content exists; patient-facing education page does not |
| Consent Review | ❌ | Orphaned components only |
| Questions | ❌ | Not reachable |
| Accept / Refuse | ❌ | Not reachable |
| Signature | ❌ | Not reachable; prototype uses simulated signature curve |
| Confirmation | ❌ | Orphaned components only; prototype shows mock confirmation |

---

## 2. Patient-Facing Components (All Orphaned)

| File | Purpose | Status |
|---|---|---|
| `apps/web/src/components/modules/PublicSigningWorkflow.tsx` | Legacy end-to-end signing component | **Not imported by any page** |
| `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx` | 2,250-line v1.1 Figma port | **Not imported by any page** |
| `apps/web/src/components/public-signing/OtpVerificationShell.tsx` | Polished OTP card with IMC branding | **Not imported anywhere** |
| `apps/web/src/components/public-signing/OtpVerificationBranding.tsx` | Branded OTP page wrapper | **Not imported anywhere** |
| `apps/web/src/components/ui-refresh/OTPVisualPanel.tsx` | v1.1 OTP input shell | Only exported; no consumer |
| `apps/web/src/components/ui-refresh/ConfirmationCard.tsx` | v1.1 success card | Only exported; no consumer |
| `apps/web/src/lib/branding/otp-page-branding.ts` | Logo/privacy config | Referenced only by orphaned components |

---

## 3. Missing Routes

No Next.js app route exists for:
- `/sign/[token]`
- `/public-signing/document/[token]`
- `/public-signing/[...]`

The only public routes found are the newly added discharge-refusal OTP API routes:
- `/api/public/secure-links/[token]/otp`
- `/api/public/secure-links/[token]/verify-otp`

These serve the secure-link/discharge flow, not the informed-consent patient journey.

---

## 4. Patient Journey Issues

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1 | **No reachable patient signing route** | Critical | No page file under `apps/web/src/app`; production screenshots show “Missing public signing session” |
| 2 | **Approved v1.1 workflow is orphaned** | High | `ApprovedPatientWorkflow.tsx` exists but has no route |
| 3 | **Legacy workflow is debug-grade** | High | `PublicSigningWorkflow.tsx` shows raw metadata (“Education required: Yes”, “Scroll completion: 95%”, evidence hashes) |
| 4 | **Prototype signature is simulated** | High | `PatientSignaturePanel.tsx` draws a hard-coded Bézier curve, not a real signature capture |
| 5 | **Mock/debug UI exposed** | High | `MockOtpVerification` shows mock code `482917` and “Preview · No SMS”; `StepUpVerificationPanel` shows “Dev code: …” |
| 6 | **Patient confirmation shows evidence hash** | Medium | `PatientConfirmationPanel.tsx` displays SHA-256 hash string to patients |
| 7 | **“Download patient copy (mock)” button** | Medium | Disabled mock action visible in patient confirmation |
| 8 | **Hardcoded readiness badges** | Medium | `RemoteSigningReadinessBadge.tsx` always green regardless of state |
| 9 | **OTP step order unclear** | Medium | Figma v1.1 places OTP after landing; production pipeline gates all content behind OTP; design intent vs. technical constraint is not reconciled |
| 10 | **No live patient screenshots** | Medium | Screenshot inventory covers physician workspace and marketing only |

---

## 5. Visual Quality of Existing Assets

### Positive
- `OtpVerificationShell.tsx` + `OtpVerificationBranding.tsx` are polished, mobile-first, and on-brand.
- `ApprovedPatientWorkflow.tsx` follows the approved Figma v1.1 card style: max-width container, sticky header, step pills, clear accept/refuse buttons.
- Patient-facing screens use calmer spacing and larger tap targets than physician screens.

### Negative
- Patient journey preview is embedded inside the physician workspace chrome, with duplicate “Back to physician workspace” buttons.
- Prototype patient screens carry the yellow “Not for clinical use” banner and disabled mock actions.
- Legacy workflow looks like an admin/audit tool, not a patient experience.

---

## 6. Accessibility & Localization

| Item | Status |
|---|---|
| RTL patient layout | ⚠️ Components claim bilingual support but no RTL screenshot evidence |
| Font-size / contrast controls | ✅ Present in v1.1 patient journey components |
| Screen-reader optimized OTP | ⚠️ Not verified |
| Mobile-first responsive | ✅ v1.1 components are mobile-first |
| Clear accept/refuse actions | ✅ v1.1 components use large, color-coded buttons |

---

## 7. Screens That Do Not Belong in a Patient Journey

| Screen / Element | Why it fails |
|---|---|
| `PublicSigningWorkflow.tsx` (as shipped) | Raw metadata and evidence hashes exposed to patients |
| `MockOtpVerification.tsx` | Exposes mock OTP code and preview banner |
| `PatientSigningPanel.tsx` HID debug panel | Shows endpoint, device ref, transaction ID, verification hash |
| `StepUpVerificationPanel.tsx` | Shows “Dev code: …” debug field |
| `PatientConfirmationPanel.tsx` (prototype) | Mock download button and synthetic evidence hash |

---

## 8. Patient Experience Verdict

**Status: NOT READY for pilot**

A complete, visually strong patient signing experience exists in code, but it is not wired to any route. Patients opening a secure link currently see an error page. Until a canonical patient route is created, mock/debug UI is removed, and real end-to-end screenshots are captured on mobile and desktop, the patient journey cannot be considered ready for an Internal IMC Pilot.
