# RC1 Gate 2B — Should Fix Before GA

**Reviewer:** Product Design Lead / Enterprise UX Reviewer  
**Date:** 2026-06-27

---

## Criteria for Should Fix Before GA

Items here do not block the Internal IMC Pilot but must be resolved before general availability or cohort expansion. They cover polish, scalability, accessibility, and design-system alignment.

---

## Should-Fix Items

### 1. Consolidate to one visual design system
**Problem:** Three competing shells (enterprise wizard, dark functional workflow, clinical workspace prototype).  
**Impact:** Inconsistent user experience, training overhead, maintenance burden.  
**Recommended action:**
- Adopt the Clinical Workspace 2.0 visual language as the single source of truth.
- Migrate the enterprise wizard and functional workflow to the same tokens, spacing, and components.

### 2. Simplify the physician workflow
**Problem:** Enterprise wizard requires ~24 clicks and ~14 decisions.  
**Impact:** Physician friction, longer dispatch times, training complexity.  
**Recommended action:**
- Reduce to the four anchors used in the prototype: Patient, Encounter, Procedure, Knowledge Package.
- Auto-resolve category, template, anesthesia, and education where clinically safe.
- Reserve manual override for exceptions, not the default path.

### 3. Reconcile with the approved 13-screen design handoff
**Problem:** The prototype diverges from `designs/PhysicianWorkflow_Prototype_6_Extracted/DESIGN_HANDOFF/`.  
**Impact:** Legal/clinical sign-off may be based on screens that are not implemented.  
**Recommended action:**
- Either implement the 13-screen stepper as specified, **or**
- Obtain formal written sign-off that the single-screen auto-resolver replaces it.

### 4. Add bilingual disclosure authoring
**Problem:** Design handoff requires EN+AR textareas for procedure description, material risks, alternatives, and post-procedure instructions.  
**Impact:** Required for Saudi bilingual consent compliance.  
**Recommended action:**
- Add paired EN/AR fields in the physician review step.
- Validate that both languages are populated before send.

### 5. Reduce Clinical Knowledge Package card density
**Problem:** CKP card stacks 8+ sections into one long scroll.  
**Impact:** Primary action is pushed below the fold; alert fatigue.  
**Recommended action:**
- Split into primary review card + secondary collapsible details.
- Move rule explanation, auto-resolution summary, and export actions behind “More details” or into the sidebar.

### 6. Remove duplicate “Back to physician workspace” buttons
**Problem:** Two back buttons appear in patient preview mode.  
**Impact:** Visual clutter and confused navigation.  
**Recommended action:**
- Keep one consistent close/back control.

### 7. Replace hard-coded readiness badges with real checks
**Problem:** `RemoteSigningReadinessBadge.tsx` always shows green.  
**Impact:** Misleading trust signal.  
**Recommended action:**
- Wire badges to actual device/identity/network checks or remove them.

### 8. Improve empty and error states
**Problem:** Error handling is sparse; production screenshots show a generic “Missing public signing session” page.  
**Impact:** Poor patient experience when things go wrong.  
**Recommended action:**
- Design patient-friendly error pages for expired link, invalid OTP, session timeout, and unsupported browser.
- Add clear recovery actions (request new link, contact support).

### 9. Implement full accessibility audit
**Problem:** No evidence of screen-reader, keyboard, or focus management testing.  **Impact:** Regulatory and inclusivity risk at GA.  **Recommended action:**
- Run axe/WAVE on all pilot-critical screens.
- Fix focus order, color contrast, and ARIA labels.
- Ensure debug metadata is not announced by screen readers.

### 10. Add real-time collaboration and notification polish
**Problem:** Notification and collaboration UI exists but was not evaluated in depth.  **Impact:** Physicians may miss patient completion or alerts.  **Recommended action:**
- Standardize notification badges, toasts, and status timelines.
- Ensure alert acknowledgement is clearly tied to the Send action.

### 11. Refactor oversized components
**Problem:** `PhysicianConsentWorkflow.tsx` (~4,100 lines) and `ApprovedPatientWorkflow.tsx` (~2,250 lines) mix data, logic, and rendering.  **Impact:** Hard to maintain and iterate.  **Recommended action:**
- Split into smaller, testable components with clear responsibilities.

### 12. Reconcile OTP step order with design intent
**Problem:** Figma v1.1 places OTP after landing; production gates all content behind OTP.  **Impact:** Different mental models between design and implementation.  **Recommended action:**
- Decide the final step order with clinical/legal input.
- Document it in the prototype map and implement consistently.

---

## Acceptance Checklist

- [ ] Single design system applied across all consent modules.
- [ ] Physician workflow reduced to ≤10 clicks for the standard case.
- [ ] 13-screen handoff either implemented or formally superseded.
- [ ] Bilingual EN/AR disclosure authoring available.
- [ ] CKP card density reduced; primary action visible without excessive scroll.
- [ ] Readiness badges reflect real state.
- [ ] Patient-friendly error pages designed and implemented.
- [ ] Accessibility audit complete with remediation.
- [ ] Oversized components refactored.
- [ ] OTP step order documented and consistent.
