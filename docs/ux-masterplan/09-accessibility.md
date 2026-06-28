# WathiqCare Enterprise UX 2.0 — Accessibility Plan

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

Accessibility is a non-negotiable requirement for WathiqCare Enterprise. Patients and clinicians with disabilities must be able to complete core tasks without friction. This plan aligns with WCAG 2.2 AA as a baseline and targets AAA where feasible.

---

## Accessibility Commitments

1. **Perceivable:** Information is available through multiple senses.
2. **Operable:** Interfaces work with keyboard, screen reader, voice, and switch controls.
3. **Understandable:** Language, navigation, and error messages are clear.
4. **Robust:** Content works with current and future assistive technologies.

---

## Standards & Compliance

| Standard | Level | Application |
|---|---|---|
| WCAG 2.2 | AA minimum | All user-facing screens |
| WCAG 2.2 | AAA where feasible | Patient education content, consent text |
| EN 301 549 / Section 508 | Compliance | Public-sector and international deployments |
| ADA | Compliance | US healthcare customers |
| WAI-ARIA 1.2 | Best practice | Rich components and dynamic content |

---

## Perception

### Color & Contrast
- Text contrast ≥ 4.5:1 for body text (AA).
- Large text and UI components ≥ 3:1.
- Information is never conveyed by color alone.
- Patient-facing education uses high-contrast mode by default.

### Typography
- Minimum 14px body text; 16px on mobile.
- Line height ≥ 1.5 for body text.
- Paragraph width ≤ 80 characters.
- Support for browser font scaling up to 200%.

### Motion
- Respect `prefers-reduced-motion`.
- No auto-playing video or animation without pause control.
- Essential animations (loading) are subtle and brief.

### Multimedia
- Procedure videos include captions and transcripts.
- Audio explanations include text alternatives.
- Images have meaningful alt text or are marked decorative.

---

## Operation

### Keyboard Navigation
- All interactive elements reachable via `Tab`.
- Logical tab order follows visual flow, including RTL.
- `Escape` closes modals, drawers, and menus.
- Focus is trapped within active modals.
- Focus indicators are highly visible.

### Screen Reader Support
- Landmarks (`main`, `nav`, `aside`, `header`) are used consistently.
- Headings follow a logical hierarchy (`h1` → `h2` → `h3`).
- Buttons and links have descriptive labels.
- Dynamic updates are announced via live regions.
- Status changes (sending, signed, error) are spoken immediately.

### Touch & Pointer
- Touch targets ≥ 44×44px (48×48px preferred).
- Gesture alternatives are provided for all actions.
- Drag-and-drop is optional, not required.

### Voice & Switch Control
- Components expose correct roles and states.
- Forms are navigable with voice control software.
- Switch users can complete core patient and physician tasks.

---

## Comprehension

### Plain Language
- Patient content targets 6th–8th grade reading level.
- Medical terms are defined inline or in a glossary.
- Avoid idioms, ambiguous phrasing, and legal jargon.

### Error Prevention
- Destructive actions require confirmation.
- Forms validate before submission with clear messages.
- Time limits are generous or absent; where required, users can extend.
- Consent decisions require explicit confirmation.

### Consistent Navigation
- Navigation patterns repeat across modules.
- Breadcrumbs and page titles clarify location.
- Help is available in context.

---

## Assistive Technology Testing Matrix

| Technology | Platform | Priority |
|---|---|---|
| NVDA | Windows | P0 |
| JAWS | Windows | P0 |
| VoiceOver | macOS / iOS | P0 |
| TalkBack | Android | P0 |
| Windows Magnifier | Windows | P1 |
| Switch Control | iOS / Android | P1 |
| Dragon NaturallySpeaking | Windows | P1 |

---

## Accessibility Checklist by Phase

### Design Phase
- [ ] Color palettes meet contrast requirements.
- [ ] Focus states designed for all interactive elements.
- [ ] Component states include keyboard, screen reader, and high-contrast variants.
- [ ] Content reviewed for plain language.
- [ ] Motion designs include reduced-motion alternatives.

### Development Phase
- [ ] Semantic HTML used as the foundation.
- [ ] ARIA used only when HTML semantics are insufficient.
- [ ] Automated tests run with axe or equivalent.
- [ ] Manual keyboard navigation tested.
- [ ] Screen reader behavior verified.

### QA Phase
- [ ] Full WCAG 2.2 AA audit completed.
- [ ] Assistive technology compatibility verified.
- [ ] Mobile accessibility tested.
- [ ] RTL accessibility tested.
- [ ] Accessibility statement published.

---

## Accessibility Statement

WathiqCare Enterprise is committed to providing an accessible experience for all users. We aim to meet or exceed WCAG 2.2 Level AA and welcome feedback on accessibility barriers.

---

## Training & Culture

- Designers and engineers complete accessibility training during onboarding.
- Accessibility is a required criterion in design reviews and code reviews.
- User research includes participants with disabilities.
- Accessibility regressions are treated as high-priority bugs.
