# RC1 Gate 2B — Screenshots Reviewed

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27

---

## Sources

| Folder | Purpose | Files Reviewed |
|---|---|---|
| `qa-screenshots/` | Production UI captures from current branch | clinical-workspace-2, dynamic-consent, entry-points |
| `live-screenshots/` | Live deployment / route scan captures | `_.png`, `_modules.png`, `_login.png`, `_request-demo.png` |
| `designs/PhysicianWorkflow_Prototype_6_Extracted/` | Figma v1.1 physician workflow handoff | Screenshots in DESIGN_HANDOFF and PNG exports |
| `sample-pdf-review/screenshots/` | PDF/render outputs for consent evidence | Generated samples |

---

## Production Screenshots — Findings

### Login (`_login.png`)
- **Issue:** Mojibake in title/footer (`WathiqCareâ„¢`).
- **Severity:** Must fix.
- **Note:** Basic layout is acceptable; typography hierarchy is clear.

### Modules landing (`_modules.png`)
- **Issue:** Module grid includes informed consents; other modules may route to placeholder pages.
- **Severity:** Must fix if any unfinished module is reachable.

### Clinical Workspace 2.0 (`clinical-workspace-2-*.png`)
- **Positive:** Cleanest visual surface, good use of card hierarchy, clear action buttons.
- **Issues:**
  - Prototype banner visible in production screenshots.
  - Header shows system/database status pills, shell metadata, route/role labels.
  - Task Simulator overlay visible.
  - Evidence hash strings visible to patient in confirmation.
  - Mock physician name and license shown.

### Dynamic consent (`dynamic-consent/`)
- **Issue:** No evidence of a real-time patient preview or device-optimized signing capture.
- **Severity:** Should fix before GA.

### Entry points (`screenshots/entry-points/`)
- **Issue:** Shows a public signing entry point, but production screenshot reveals a broken session page.
- **Severity:** Must fix.

---

## Prototype Screenshots — Findings

### Physician Workflow Prototype 6 (Figma v1.1)
- **Structure:** 13-screen stepper with clear progression: Patient → Encounter → Procedure → Content → Review → Remote Signing → Notification → Confirmation.
- **Positive:** Strong information architecture; aligns with enterprise requirements.
- **Gap from implementation:** Implemented prototype collapses most steps into a single-screen auto-resolver with a 3-step wizard overlay.

### Physician Workflow Prototype 5
- **Positive:** Patient signing screens are visually clean and include OTP, review, decision, signature, and confirmation.
- **Gap from implementation:** Not wired to production APIs; uses mock data.

---

## Notable Missing Evidence

The following evidence was requested but not available:

| Evidence | Status | Impact |
|---|---|---|
| Mobile patient signing (iOS Safari) | Missing | Blocks patient-facing confidence |
| Mobile patient signing (Android Chrome) | Missing | Blocks patient-facing confidence |
| RTL physician workspace desktop | Missing | Blocks Saudi rollout confidence |
| RTL patient signing desktop | Missing | Blocks Saudi rollout confidence |
| Real signature capture | Missing | Legal/audit blocker |
| Authenticated physician context | Missing | Compliance blocker |
| Patient-friendly error pages | Missing | UX gap |

---

## Screenshot Matrix

| Screen | Source File | Verdict |
|---|---|---|
| Login | `live-screenshots/_login.png` | Must fix encoding |
| Modules grid | `live-screenshots/_modules.png` | Gate placeholder routes |
| Clinical workspace | `qa-screenshots/clinical-workspace-2-*.png` | Needs debug strip |
| Patient confirmation | `qa-screenshots/clinical-workspace-2-happy-patient.png` | Remove hashes |
| Physician decision support | `qa-screenshots/clinical-workspace-2-clinical-alerts.png` | Remove prototype banner |
| 13-screen handoff | `designs/PhysicianWorkflow_Prototype_6_Extracted/DESIGN_HANDOFF/` | Not implemented |
| Patient signing prototype | `designs/PhysicianWorkflow_Prototype_5_Extracted/` | Not wired |

---

## Recommendations

1. Re-capture all production screenshots after the Must-Fix list is resolved.
2. Add mobile and RTL screenshots to this file before RC1 sign-off.
3. Use the same viewport and device presets across all captures for consistency.
4. Annotate each screenshot with the build commit and environment to avoid drift.
