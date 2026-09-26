# RC1 Gate 2B — UI Quality Review

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27  
**Scope:** Spacing, Typography, Colors, Buttons, Cards, Hierarchy, Responsiveness, Consistency

---

## Executive Summary

Individual components and isolated prototypes show professional visual craft, but the production experience is inconsistent. There are at least three competing visual languages (enterprise wizard shell, dark functional workflow shell, clinical workspace prototype shell), plus encoding bugs and debug chrome that degrade perceived quality.

---

## 1. Visual Language Consistency

| Surface | Visual Language | Issue |
|---|---|---|
| `/modules` | Modern command-center cards, teal/navy palette | ✅ Clean |
| `/modules/informed-consents` | Enterprise shell + 8-step wizard | ⚠️ Dense, step-heavy |
| `/modules/informed-consents/v2/workspace` | Tabbed clinical-content workspace | ⚠️ Hard-coded demo context visible |
| `/prototype/clinical-workspace-2` | Light card-based 2-column layout | ❌ Prototype banner + Task Simulator |
| `FunctionalConsentIssuanceWorkflow` | Dark sidebar, `fc-*` utility classes | ❌ Jarring transition from enterprise shell |
| Public signing components | Mobile-first v1.1 cards | ❌ Not mounted on any route |

**Verdict:** The platform does not yet have a single, coherent visual system across all pilot-critical flows.

---

## 2. Spacing & Layout

### Positive
- Clinical Workspace 2.0 uses a clear 2-column grid (main ~66%, sidebar ~33%) with consistent card padding.
- Module command center (`/modules`) has generous gutters and clear section separation.
- Approved forms library uses a clean search + filter + card grid layout.

### Negative
- **CKP card is vertically overloaded** — stacks 8+ sections without strong section dividers, pushing primary actions below the fold on high-risk cases.
- **Right sidebar competes with main content** — Task Simulator, export buttons, baseline comparison, and readiness checklist fight for attention.
- **Enterprise wizard** packs many fields and panels into each step, reducing scanability.
- **Patient preview inside physician workspace** adds a second header and duplicate back button, wasting vertical space.

---

## 3. Typography

### Positive
- Hierarchy is generally clear: H1 page titles, H2 section headers, body text, captions.
- Prototype uses appropriate font weights to distinguish context bar, section headers, and body.

### Negative
- **Evidence hashes and audit metadata** are rendered in monospace/code-like styling on patient-facing screens, increasing perceived complexity.
- **Encoding artifacts** on login page (`WathiqCareâ„¢`, `â†'`) suggest character-set issues that undermine polish.
- **Multiple type scales** across enterprise wizard, V2 workspace, and prototype create inconsistency.

---

## 4. Colors

### Positive
- Consistent semantic palette: green = success/ready, amber = warning, red = critical/blocking, blue = info.
- Alerts use appropriate color coding.

### Negative
- **Yellow prototype banner** dominates every clinical workspace screenshot.
- **Red “N 1 Issue” overlay** appears in bottom-left of several QA screenshots (likely a dev/axe toolbar).
- **Dark functional workflow shell** clashes with the lighter enterprise and prototype shells.
- **High-density alert cards** create color noise when multiple red/amber/blue cards stack vertically.

---

## 5. Buttons & CTAs

### Positive
- Primary actions use high-contrast navy/teal colors.
- Accept/Refuse buttons in v1.1 patient components are large and color-coded.

### Negative
- **Blocked action badge is not clickable** — physician must discover the sidebar checklist.
- **Duplicate “Back to physician workspace” buttons** in patient preview.
- **Disabled/mock buttons** are visible to users (“Download patient copy (mock)”).
- **Export evidence button** in Task Simulator looks like a primary action but is QA tooling.

---

## 6. Cards

### Positive
- Cards use consistent corner radius and shadow in the prototype and modules page.
- Context bar pills effectively group patient/encounter/procedure metadata.

### Negative
- **CKP card tries to do too much** — should be split into primary review card + secondary collapsible details.
- **Alert cards inside CKP card** reduce the card’s scannability.
- **Placeholder cards** in `ModulePlaceholderPage.tsx` use dashed borders and “pending” text.

---

## 7. Visual Hierarchy

### Positive
- Prototype context bar keeps the most important patient/context info persistently visible.
- Action rail separates primary actions from readiness status.

### Negative
- **Task Simulator / metrics panel** sits at the same visual priority as clinical content in the right sidebar.
- **Rule explanation panel** places system internals at the same level as clinical guidance.
- **Evidence hash** appears on patient confirmation screen with high visual weight despite being non-actionable for patients.
- **Debug metadata** in shell headers (entity, role, route, version, system status) competes with real navigation.

---

## 8. Responsiveness

### Positive
- `ApprovedPatientWorkflow.tsx` and v1.1 OTP components are mobile-first.
- `hero-mobile-after-fix.png` shows the landing adapts to mobile.

### Negative
- **Clinical Workspace 2.0 screenshots are desktop-only** — no mobile breakpoint evidence.
- **Enterprise wizard** is unlikely to work well on small screens given its dense forms and sidebars.
- **No visible RTL adaptation** in any screenshot, despite Arabic being a core requirement.

---

## 9. Loading & Empty States

| State | Status | Observation |
|---|---|---|
| Loading | ⚠️ | “Database Connected / Loading / Fallback” exposed in functional workflow |
| Empty workspace | ✅ | Clean empty state in clinical workspace prototype |
| No patient found | ⚠️ | Not evaluated |
| No consents | ⚠️ | Not evaluated |
| Error | ❌ | Production screenshots show “Missing public signing session” error page |

---

## 10. UI Quality Verdict

**Status: NOT READY for pilot**

Isolated components are well-crafted, but the assembled production experience is inconsistent, overloaded, and contains debug/prototype chrome that would not pass hospital-grade scrutiny. A visual-system consolidation pass is required before RC1.

---

## 11. Top 10 UI Quality Issues

| # | Issue | Severity |
|---|---|---|
| 1 | Three competing visual shells | High |
| 2 | Prototype/debug banner on best UX | High |
| 3 | Task Simulator in prime sidebar | High |
| 4 | CKP card is visually overloaded | Medium |
| 5 | Encoding artifacts on login page | Medium |
| 6 | Red “N” dev overlay in screenshots | Medium |
| 7 | Dark functional workflow shell clashes with rest | Medium |
| 8 | Evidence hash on patient confirmation | Medium |
| 9 | Disabled/mock buttons visible | Medium |
| 10 | No RTL/mobile evidence for physician workspace | Medium |
