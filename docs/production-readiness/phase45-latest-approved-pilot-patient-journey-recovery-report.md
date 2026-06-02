# Phase 45 - Latest Approved Pilot Patient Journey Recovery Report

Date: 2026-06-02
Environment: Read-only source recovery audit
Classification: STOP – PATIENT JOURNEY SOURCE NOT CONFIRMED

## Scope

Objective was to recover the latest approved pilot patient journey for the public patient route:

- route: `/sign/[token]/workflow`
- preserve OTP/signing/session logic
- preserve secure-signing API, audit/evidence services, landing page, physician journey, and secure link email service
- do not deploy before confirming the correct source

No code changes, migrations, deploys, or OTP/signing/session/public-signing API edits were performed in this phase.

## Current Production Patient Screen Verification

A live production signing URL generated in Phase 44 was opened:

- `https://wathiqcare.online/sign/cBhQLcEkO6vl_GSMZ6EQi0Nk0pz2KdXmYfxPg8coP_0/workflow`

Observed current production landing text:

- `موافقة طبية إلكترونية`
- `نوع الموافقة`
- `الموافقة العامة للعلاج والخدمات الطبية`
- `اتصال آمن ومشفر`
- `متابعة`

This exactly matches the user-reported old/simple patient screen.

Conclusion: the currently deployed patient journey is the old/simple landing and does not satisfy the requested "latest approved pilot patient journey" expectation.

## Active Route Source Verification

Current route source:

- `apps/web/app/sign/[token]/workflow/page.tsx`
- renders `ApprovedPatientWorkflow`

Current component source:

- `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx`

This route/component pairing is active in the current repository and was also found to be identical in the sibling worktrees checked during this phase.

## Candidate Inventory

### Candidate A — Current active patient route

- File path: `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx`
- Route: `/sign/[token]/workflow`
- Last modified: `2026-06-01T21:35:08`
- Git status: tracked; no direct local modification detected for this file in current worktree
- Screenshot availability: live production capture obtained in this phase; prior patient-flow evidence also documented in Phase 41A
- API-wired: Yes
- OTP/signature/evidence wired: Yes
  - bootstrap/context
  - request OTP
  - verify OTP
  - education logging
  - decision submission
  - signature submission
  - audit/evidence hooks
- Accepted/rejected status: not confirmed as the latest approved pilot version; currently observed as the old/simple production screen
- Comparison outcome: matches the current production screen exactly

### Candidate B — Same active patient route in sibling worktree `wathiqcare-phase37-prod-deploy`

- File path: `c:/work/wathiqcare-phase37-prod-deploy/apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx`
- Route: `/sign/[token]/workflow`
- Last modified: `2026-06-01T17:22:14`
- Git status: separate worktree, not modified in current phase
- Screenshot availability: no independent patient screenshot found proving a different visual surface
- API-wired: Yes
- OTP/signature/evidence wired: Yes
- Accepted/rejected status: not a distinct candidate in practice
- Comparison outcome: SHA256 hash identical to current repo file; no newer alternate patient journey found here

### Candidate C — Same active patient route in sibling worktree `wathiqcare-discharge-refusal-main-phase36`

- File path: `c:/work/wathiqcare-discharge-refusal-main-phase36/apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx`
- Route: `/sign/[token]/workflow`
- Last modified: `2026-06-01T10:42:19`
- Git status: separate worktree, not modified in current phase
- Screenshot availability: no independent patient screenshot found proving a different visual surface
- API-wired: Yes
- OTP/signature/evidence wired: Yes
- Accepted/rejected status: not a distinct candidate in practice
- Comparison outcome: SHA256 hash identical to current repo file; no newer alternate patient journey found here

### Candidate D — `ui-refresh` patient-flow visual library

Representative files:

- `apps/web/src/components/ui-refresh/OTPVisualPanel.tsx`
- `apps/web/src/components/ui-refresh/SignatureVisualPanel.tsx`
- `apps/web/src/components/ui-refresh/ConfirmationCard.tsx`

- Route: none by itself; component library only
- Last modified:
  - `OTPVisualPanel.tsx` → `2026-06-01T21:35:08`
  - `SignatureVisualPanel.tsx` → `2026-06-01T21:35:08`
  - `ConfirmationCard.tsx` → `2026-06-01T21:35:08`
- Git status: tracked support components
- Screenshot availability: no standalone approved patient route captured from these components as an assembled replacement workflow
- API-wired: partially, only when consumed by `ApprovedPatientWorkflow`
- OTP/signature/evidence wired: not independently; they are visual shells/components
- Accepted/rejected status: helper library, not a confirmed end-to-end patient journey source
- Comparison outcome: cannot be treated as the latest approved patient journey by itself

### Candidate E — Public signing OTP branding helper

- File path: `apps/web/src/components/public-signing/OtpVerificationBranding.tsx`
- Route: no direct route ownership
- Last modified: `2026-06-01T22:48:37`
- Git status: untracked directory exists in current worktree
- Screenshot availability: none establishing full patient-journey ownership
- API-wired: no full workflow ownership
- OTP/signature/evidence wired: no; branding-only helper
- Accepted/rejected status: support artifact only
- Comparison outcome: not a full candidate for `/sign/[token]/workflow`

### Candidate F — OneDrive raw Figma/Vite source

Representative files:

- `c:/Users/basel/OneDrive/Desktop/WathiqCare-Figma-UX-UI/src/app/App.tsx`
- `c:/Users/basel/OneDrive/Desktop/WathiqCare-Figma-UX-UI/src/app/components/ConsentBuilder.tsx`
- `c:/Users/basel/OneDrive/Desktop/WathiqCare-Figma-UX-UI/src/app/components/steps/StepSend.tsx`

- Route: not `/sign/[token]/workflow`; standalone Vite app / physician-side issuance flow
- Last modified:
  - `App.tsx` → `2026-05-30T05:46:32`
  - `ConsentBuilder.tsx` → `2026-05-30T05:46:32`
  - `StepSend.tsx` → `2026-05-30T05:46:32`
- Git status: external OneDrive source, outside current git worktree
- Screenshot availability: yes, multiple physician-side screenshots and reports from Phases 39/40/43
- API-wired: No as a patient journey source; it is a physician/issuance mock-driven design source
- OTP/signature/evidence wired: No for `/sign/[token]/workflow`
- Accepted/rejected status:
  - physician-side design source exists
  - Phase 40 port based on it was rejected for physician route purposes
  - not a confirmed patient-route replacement source
- Comparison outcome: does not correspond to the production patient route; cannot be safely restored onto `/sign/[token]/workflow`

## Key Findings

1. The current production patient journey is indeed the old/simple screen reported by the user.
2. The active production route `/sign/[token]/workflow` is sourced from `ApprovedPatientWorkflow.tsx`.
3. The same `ApprovedPatientWorkflow.tsx` exists in the current repo and both sibling worktrees with identical SHA256 hash:
   - `B6EECD80F2E252B4887A3A2D27A8520CA41D0C4537FDF369E205A3167F4D69D3`
4. No newer distinct patient-journey source was found in:
   - current repo patient route files
   - phase36 sibling worktree
   - phase37 sibling worktree
   - OneDrive `WathiqCare-Figma-UX-UI` source
   - prior Phase 35/36/39/40/41 reports and screenshot inventories
5. The OneDrive/Figma source and the preserved Phase 40 work are physician-side issuance surfaces, not a confirmed patient-side replacement for `/sign/[token]/workflow`.
6. Prior reports explicitly documented the patient journey as unchanged/untouched:
   - `docs/production-readiness/phase39f-correct-visual-target-identification-report.md`
   - `docs/production-readiness/phase41a-prior-patient-journey-e2e-evidence-reconciliation-report.md`
   - `docs/production-readiness/phase41b-controlled-patient-delivery-unfreeze-decision.md`

## Comparison: Current Production vs Latest Candidate

### Current production

- Old/simple landing
- Minimal hero card + consent type + secure notice + continue button
- Live on `/sign/[token]/workflow`
- Backed by the real public-signing API stack

### Latest candidate actually found

The latest distinct visual source found in the workspace was the OneDrive physician-side 8-step Consent Builder source, but it is not a patient-route candidate and is not wired to `/sign/[token]/workflow`.

Therefore there is no confirmed newer patient-route source to compare as a direct replacement candidate.

## Recovery Decision

Requested recovery could not proceed safely.

Reason:

- the currently deployed patient route is confirmed old/simple
- but no newer approved patient-journey source was found or confirmed
- every actual `/sign/[token]/workflow` source copy found is the same old/simple implementation
- the newer visual source found in OneDrive belongs to physician issuance flow, not patient signing flow
- restoring any unconfirmed visual source onto `/sign/[token]/workflow` would violate the strict requirement to confirm the correct source first and risks damaging OTP/signing/session behavior boundaries

## Build / Validation

No code change was made, so `npx next build --webpack` was not run in this phase.

This was intentional: source confirmation failed before any permissible restoration edit existed.

## Final Classification

`STOP – PATIENT JOURNEY SOURCE NOT CONFIRMED`
