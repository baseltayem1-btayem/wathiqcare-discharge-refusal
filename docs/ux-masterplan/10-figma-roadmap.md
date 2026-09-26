# WathiqCare Enterprise UX 2.0 — Figma Roadmap

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

This roadmap defines the Figma design deliverables required to implement WathiqCare Enterprise UX 2.0. Deliverables are organized by phase and include libraries, flows, prototypes, and documentation.

---

## Phase 1: Foundation (Weeks 1–3)

### Deliverables

1. **WDS — Color & Typography**
   - Color primitives and semantic tokens.
   - Typography scale for LTR and RTL.
   - Dark theme variants.

2. **WDS — Icon Library**
   - Curated icon set based on Lucide.
   - Sized variants (16px, 20px, 24px).
   - Semantic usage guidelines.

3. **WDS — Spacing & Elevation**
   - Spacing tokens.
   - Shadow and elevation tokens.
   - Grid and layout templates.

4. **Information Architecture Map**
   - Sitemap for Clinical, Patient, Compliance, and Admin domains.
   - User flow diagrams for primary tasks.

### Acceptance Criteria
- [ ] All foundation libraries published to Figma team library.
- [ ] Tokens are exportable to development-friendly JSON.
- [ ] IA map reviewed with product, engineering, and clinical stakeholders.

---

## Phase 2: Components (Weeks 4–7)

### Deliverables

1. **WDS — Layout Components**
   - App shell, page layout, three-pane layout, cards, drawers, modals.

2. **WDS — Navigation Components**
   - Top nav, side nav, breadcrumbs, tabs, stepper, pagination.

3. **WDS — Data Display Components**
   - Data table, patient card, encounter card, status badge, timeline, metric card.

4. **WDS — Input Components**
   - Text inputs, selects, checkboxes, radios, signature pad, OTP input, bilingual input.

5. **WDS — Feedback Components**
   - Alerts, banners, toasts, tooltips, inline errors, progress indicators.

6. **WDS — Consent-Specific Components**
   - Consent task card, knowledge package card, disclosure editor, participant form, confirmation view, audit timeline.

### Acceptance Criteria
- [ ] All components include default, hover, focus, active, disabled, error, and loading states.
- [ ] Components are accessible and annotated.
- [ ] Component documentation pages published in Figma.

---

## Phase 3: Physician Workspace (Weeks 8–11)

### Deliverables

1. **Physician Dashboard**
   - Inbox, filters, quick actions, notifications.

2. **Consent Task Flow**
   - Confirm context.
   - Select procedure.
   - Review knowledge package.
   - Personalize disclosures.
   - Add participants.
   - Physician review & acknowledge.
   - Monitor & follow up.

3. **Responsive Variants**
   - Desktop three-pane layout.
   - Tablet two-pane layout.
   - Mobile single-column flow.

4. **Interactive Prototype**
   - Clickable prototype for standard consent task.
   - Alert override and decline flows.

### Acceptance Criteria
- [ ] Prototype covers the full standard task in under 3 minutes.
- [ ] All screens reviewed by clinical safety reviewer.
- [ ] RTL variants produced.

---

## Phase 4: Patient Journey (Weeks 12–15)

### Deliverables

1. **Secure Link Landing**
2. **Identity Verification**
3. **Welcome & What to Expect**
4. **Procedure Summary**
5. **Risks & Benefits**
6. **Ask Questions**
7. **Decision Screen**
8. **Decline Flow**
9. **Signature Capture**
10. **Confirmation Screen**
11. **Error & Recovery Screens**

### Responsive Variants
- Mobile portrait and landscape.
- Tablet bedside view.
- Desktop portal view.

### Acceptance Criteria
- [ ] Prototype covers full patient journey in under 5 minutes.
- [ ] Plain-language content reviewed by health literacy expert.
- [ ] Arabic RTL screens produced and reviewed.

---

## Phase 5: Compliance & Administration (Weeks 16–18)

### Deliverables

1. **Compliance Dashboard**
   - Consent records, audit trail, reports, exceptions.

2. **Administration Console**
   - Organization, users, workflows, templates, integrations, branding.

3. **Reports & Data Visualization**
   - Completion rates, exception trends, turnaround time.

### Acceptance Criteria
- [ ] Compliance screens support audit workflows.
- [ ] Admin console is navigable without training for power users.
- [ ] Reports are accessible and printable.

---

## Phase 6: Polish & Handoff (Weeks 19–20)

### Deliverables

1. **Design Annotation**
   - Spacing, behavior, and interaction notes on all key screens.

2. **Redline Specs**
   - Detailed measurements and token references.

3. **Prototype Library**
   - Organized prototypes for usability testing and stakeholder demos.

4. **Design System Documentation**
   - Usage guidelines, do’s and don’ts, content patterns.

### Acceptance Criteria
- [ ] Engineering handoff package complete.
- [ ] Usability test plan drafted.
- [ ] Design system governance model documented.

---

## Figma File Structure

```
WathiqCare Enterprise UX 2.0
├── 00 — Foundations
│   ├── Color
│   ├── Typography
│   ├── Spacing & Elevation
│   └── Icons
├── 01 — Components
│   ├── Layout
│   ├── Navigation
│   ├── Data Display
│   ├── Inputs
│   ├── Feedback
│   └── Consent Specific
├── 02 — Physician Workspace
├── 03 — Patient Journey
├── 04 — Compliance & Admin
├── 05 — Prototypes
└── 06 — Archive
```

---

## Collaboration Rituals

| Ritual | Frequency | Participants |
|---|---|---|
| Design standup | Daily | Design team |
| Design critique | Weekly | Design, Product, Engineering |
| Clinical review | Bi-weekly | Clinical advisors, Compliance |
| Stakeholder demo | Bi-weekly | Leadership, Pilot users |
| Handoff review | Per phase | Design, Engineering QA |
