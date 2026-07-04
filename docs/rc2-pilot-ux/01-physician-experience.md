# RC1 Gate 2B — Physician Experience Review

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27  
**Scope:** Physician Workspace, Consent Creation Flow, Knowledge Package Presentation, Patient Education dispatch

---

## Executive Summary

The codebase currently contains **three parallel physician consent-authoring surfaces** with no clear canonical path for RC1. The most coherent experience is an isolated prototype; the production surfaces are either overly complex or still carry mock data and debug UI. Before the Internal IMC Pilot, the team must decide on a single physician surface, remove developer instrumentation, and reconcile the implementation with the approved design handoff.

---

## 1. Competing Physician Surfaces

| Surface | Route / File | State |
|---|---|---|
| **Enterprise 8-step wizard** | `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx` | Production-visible, ~4,100 lines, dense |
| **Clinical Content Platform V2** | `apps/web/src/app/modules/informed-consents/v2/workspace/page.tsx` | Feature-flagged, uses hard-coded demo physician context |
| **Clinical Workspace 2.0 prototype** | `/prototype/clinical-workspace-2` | Best UX, but isolated and mock-only |

### 1.1 Enterprise 8-step wizard
- Linear flow: Patient → Category → Template → Procedure → Anesthesia → Education → Review → Send.
- Step 5 is the default landing, pre-filled with demo data, which contradicts the “no hidden validation issues” success criterion.
- Estimated ~24 clicks / 14 decisions per consent (per workspace README).
- Readiness/validation panels are duplicated across the step panel, sidebar, and audit page.

### 1.2 Clinical Content Platform V2
- Tabbed workspace: Procedure Mapping / Approved Forms / Consent Assembly.
- Calls real assembly endpoints but passes hard-coded values:
  - `capacityStatus: "competent"`
  - `languagePreference: "bilingual"`
  - Physician name: `"Demo Physician"`
  - License: `"D-12345"`
- These defaults leak into the generated document if not replaced.

### 1.3 Clinical Workspace 2.0 prototype
- Single-screen auto-resolver around four anchors: Patient & Encounter, Procedure, Clinical Knowledge Package, Draft Preview.
- Auto-resolves category, template, anesthesia, education, required participants, and alerts.
- Prominent yellow banner: **“Prototype — Clinical Workspace 2.0. Not for clinical use.”**
- **Not reachable from `/modules` or main navigation.**

---

## 2. Workflow Verification

### Required simple flow
Patient → Encounter → Procedure → Knowledge Package → Education → Consent Review → Send to Patient

### Current state
| Step | Status | Observation |
|---|---|---|
| Patient | ⚠️ | Multiple selectors; demo/mock patients still visible |
| Encounter | ⚠️ | Auto-resolved in prototype; manual in wizard |
| Procedure | ⚠️ | Procedure mapping exists but not consistently wired |
| Knowledge Package | ⚠️ | CKP card is overloaded with 8+ sections |
| Education | ⚠️ | Real education content exists but placement varies by surface |
| Consent Review | ❌ | First-person patient draft text (“I, Ahmad Hassan, confirm…”) asks physician to review a legal doc rather than complete a checklist |
| Send to Patient | ⚠️ | Send modal exists in prototype; production send path is scattered |

### Key finding
The prototype compresses the approved 13-screen handoff into a single screen. Whether this is an intentional design evolution or a gap must be resolved before RC1.

---

## 3. Consent Creation Flow Issues

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1 | **Three competing surfaces** with no canonical route | High | `PhysicianConsentWorkflow.tsx`, `DoctorWorkspaceV2.tsx`, `/prototype/clinical-workspace-2` |
| 2 | **Physician writes the legal document** — draft preview shows first-person patient text | High | `DraftPreviewPanel.tsx`, `clinical-workspace-2-flow-complete.png` |
| 3 | **No workflow stepper** in the best UX candidate; handoff mandates an always-visible stepper | Medium | Design handoff `01_PROTOTYPE_MAP.md` vs prototype `page.tsx` |
| 4 | **Missing bilingual disclosure authoring** — handoff requires EN+AR textareas for procedure description, risks, alternatives | High | Design handoff `02_SCREEN_SPECIFICATIONS.md` |
| 5 | **CKP card overloaded** — consent form, participants, education, anesthesia, risks, guidance, alerts, rule explanation, auto-resolution summary stack into one long scroll | Medium | `ClinicalKnowledgePackageCard.tsx`, `clinical-workspace-2-clinical-alerts.png` |
| 6 | **Duplicate readiness panels** appear in step panel, sidebar, and audit page | Medium | Enterprise wizard and prototype sidebar |
| 7 | **Hard-coded demo physician context** in V2 workspace | High | `DoctorWorkspaceV2.tsx`, `ConsentAssemblyPanel.tsx` |
| 8 | **Blocked action badge is not clickable** — only sidebar checklist can remediate | Low | `ActionRail.tsx` |

---

## 4. Knowledge Package Presentation

### What works
- Context bar persists patient, encounter, procedure, anesthesia, language, and guardian needs.
- Color coding is consistent (red critical, amber warning, green ready, blue info).
- Alert cards use appropriate hierarchy.

### What needs work
- **Rule explanation panel** exposes engine internals: “Rules are evaluated from the Clinical Knowledge Engine using procedure, patient capacity, language preference, allergies, medications, package status, and risk level.” This is system explanation, not physician guidance.
- **Required participants** are shown as small pills but not visually tied to the send action.
- **Auto-resolution summary** duplicates information already shown in guidance cards.
- **Timeline** in refusal/refusal views uses synthetic timestamps and mock hashes, undermining trust.

---

## 5. Patient Education Dispatch

### What works
- Education material can be previewed and attached.
- Send modal in the prototype clearly surfaces consent type, recipient, and channel.

### What needs work
- **Education placement varies** by surface (wizard step vs CKP card vs patient preview).
- **Patient preview is embedded inside physician workspace chrome**, with duplicate “Back to physician workspace” buttons.
- **No production route** wires the dispatched link to the actual patient signing experience.

---

## 6. Accessibility & Localization

| Item | Status |
|---|---|
| RTL layout | ❌ Not demonstrated in any physician screenshot |
| Bilingual authoring | ❌ Missing for key disclosure fields |
| Font-size / contrast controls | ❌ Not present in physician workspace |
| Keyboard navigation | ⚠️ Not verified |
| Screen-reader labels | ⚠️ Not verified; debug metadata may be read aloud |

---

## 7. Screens That Do Not Belong in a Pilot

| Screen / Element | Why it fails |
|---|---|
| `/prototype/clinical-workspace-2` | “Not for clinical use” banner |
| `TaskMetricsPanel` | Internal research tool, not clinical software |
| `AuditEvidenceExport` | QA/export feature in prime sidebar real estate |
| `ModulePlaceholderPage` | “Workflow implementation pending” boxes |
| `FunctionalConsentIssuanceWorkflow` “Template Source” badge | Internal state exposed to physicians |

---

## 8. Physician Experience Verdict

**Status: NOT READY for pilot**

The physician experience is fragmented across three surfaces. The most usable surface is explicitly non-clinical, while the production surfaces are too decision-heavy, expose debug UI, and diverge from the approved design handoff. A single, canonical physician workspace must be chosen, stripped of developer instrumentation, and aligned with the 13-screen handoff or formally signed off as an intentional simplification.
