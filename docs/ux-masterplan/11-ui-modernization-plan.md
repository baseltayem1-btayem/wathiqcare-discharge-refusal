# WathiqCare Enterprise UX 2.0 — UI Modernization Plan

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

WathiqCare currently contains multiple competing surfaces, legacy layouts, debug instrumentation, and prototype artifacts. This modernization plan describes how to evolve the existing UI into the coherent, world-class experience defined in this masterplan — without redesigning business logic.

---

## Current State Assessment

### Competing Surfaces
- `PhysicianConsentWorkflow` — enterprise wizard, high click count.
- `DoctorWorkspaceV2` — functional but visually inconsistent.
- `/prototype/clinical-workspace-2` — best visual design but marked unsafe for clinical use.

### Debug & Prototype Artifacts
- Task Simulator overlay.
- Prototype banners and mock labels.
- System metadata in headers.
- Mock physician context.
- Hard-coded signature curves.

### Technical Debt
- Oversized components mixing data, logic, and UI.
- Inconsistent token usage.
- Orphaned components not wired to routes.
- Missing patient signing route.
- Character encoding defects.

---

## Modernization Strategy

### Guiding Principles

1. **Consolidate before embellish.** Choose one canonical surface per user role.
2. **Remove before add.** Strip debug, mock, and prototype artifacts first.
3. **Componentize before polish.** Break large components into maintainable units.
4. **RTL and mobile from day one.** Not retrofit later.
5. **Validate with users.** Every phase includes usability testing.

---

## Phase 1: Cleanup (Weeks 1–2)

### Goals
- Remove unsafe or confusing surfaces from production.
- Establish a clean baseline for redesign.

### Actions
- [ ] Hide `/prototype/clinical-workspace-2` behind a non-production flag.
- [ ] Remove Task Simulator from production builds.
- [ ] Remove prototype banners, mock labels, and debug metadata from headers.
- [ ] Remove mock physician context; replace with authenticated session data.
- [ ] Remove hard-coded signature curves; implement real signature capture.
- [ ] Fix login page character encoding.
- [ ] Remove or hide unfinished module placeholders.

### Deliverables
- Production build with no debug/prototype artifacts.
- Updated component inventory.
- Audit log of removed elements.

---

## Phase 2: Route & Structure (Weeks 3–4)

### Goals
- Establish the information architecture and canonical routes.
- Wire orphaned components to real pages.

### Actions
- [ ] Create `/sign/[token]/page.tsx` as the canonical patient signing route.
- [ ] Define canonical physician workspace route.
- [ ] Consolidate patient workflow to one component (`ApprovedPatientWorkflow` v2).
- [ ] Consolidate physician workspace to one component based on clinical-workspace-2 visual language.
- [ ] Update navigation to match IA map.
- [ ] Remove duplicate and competing routes.

### Deliverables
- Route map.
- Updated Next.js page tree.
- Navigation component.

---

## Phase 3: Token & Component Foundation (Weeks 5–7)

### Goals
- Implement the Wathiq Design System tokens and base components.

### Actions
- [ ] Implement color, typography, spacing, elevation, and shadow tokens.
- [ ] Build layout components (AppShell, PageLayout, ThreePaneLayout).
- [ ] Build navigation components (TopNav, SideNav, Breadcrumbs, Stepper, Tabs).
- [ ] Build feedback components (Alert, Banner, Toast, Tooltip).
- [ ] Build input components (TextInput, Select, Checkbox, Radio, OTPInput, SignaturePad).

### Deliverables
- Token CSS/JSON export.
- Component library in Storybook.
- Usage documentation.

---

## Phase 4: Physician Workspace Redesign (Weeks 8–11)

### Goals
- Rebuild the physician workspace around the three-pane model.

### Actions
- [ ] Implement context panel (patient, encounter, history).
- [ ] Implement work surface with stepper.
- [ ] Implement insight panel (alerts, knowledge package, timeline).
- [ ] Redesign consent task inbox.
- [ ] Implement knowledge package card with progressive disclosure.
- [ ] Implement bilingual disclosure editor.
- [ ] Implement participant forms (interpreter, witness, guardian).
- [ ] Implement send options and monitoring views.

### Deliverables
- Physician workspace screens.
- Responsive variants.
- RTL variants.

---

## Phase 5: Patient Journey Redesign (Weeks 12–15)

### Goals
- Deliver a mobile-first, patient-centered signing experience.

### Actions
- [ ] Redesign secure link landing.
- [ ] Redesign identity verification.
- [ ] Redesign education screens with plain language.
- [ ] Redesign decision and decline flows.
- [ ] Implement real signature capture.
- [ ] Redesign confirmation screen.
- [ ] Design patient-friendly error and recovery pages.

### Deliverables
- Patient journey screens.
- Mobile, tablet, and desktop variants.
- Arabic RTL screens.

---

## Phase 6: Compliance & Administration (Weeks 16–18)

### Goals
- Modernize audit, reporting, and admin surfaces.

### Actions
- [ ] Redesign consent records list and detail.
- [ ] Redesign audit timeline.
- [ ] Build report dashboards with accessible charts.
- [ ] Redesign admin console for organization, users, templates, and workflows.

### Deliverables
- Compliance and admin screens.
- Printable report layouts.

---

## Phase 7: Polish & System Hardening (Weeks 19–20)

### Goals
- Achieve production-ready quality across all surfaces.

### Actions
- [ ] Apply motion and micro-interactions.
- [ ] Conduct accessibility audit and remediation.
- [ ] Optimize performance for mobile and low bandwidth.
- [ ] Conduct usability testing with clinicians and patients.
- [ ] Refine based on feedback.

### Deliverables
- Final design system.
- Production-ready screens.
- Usability test report.

---

## Migration Path

| Legacy Surface | Migration Action |
|---|---|
| `PhysicianConsentWorkflow` | Deprecate; migrate functional logic into new workspace components. |
| `DoctorWorkspaceV2` | Deprecate; reuse valid data hooks in new workspace. |
| `/prototype/clinical-workspace-2` | Promote visual language; remove prototype artifacts; reimplement with real APIs. |
| `PublicSigningWorkflow` | Merge with `ApprovedPatientWorkflow` into single canonical patient journey. |
| `ApprovedPatientWorkflow` | Refactor into smaller components aligned with patient journey screens. |
| `MockOtpVerification` | Replace with production OTP flow. |
| `PatientSignaturePanel` | Replace hard-coded curve with `SignaturePad` component. |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| User resistance to new workflow | Involve pilot physicians early; provide toggle during transition. |
| Scope creep | Strictly limit changes to UX; defer business logic changes. |
| Accessibility retrofit cost | Build accessibility into each phase, not at the end. |
| RTL layout bugs | Produce RTL designs before implementation begins. |
| Performance degradation | Set and measure performance budgets per phase. |
