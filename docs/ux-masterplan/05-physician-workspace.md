# WathiqCare Enterprise UX 2.0 — Physician Workspace

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

The physician workspace is the cockpit of WathiqCare. It must transform complex clinical information into a fast, confident, and defensible consent workflow. The design goal is to reduce the standard consent creation task to **under three minutes** while preserving clinical rigor and patient safety.

---

## Workspace Layout

### Three-Column Architecture

```
┌─────────────────┬───────────────────────────────┬─────────────────┐
│  Context Panel  │        Work Surface           │  Insight Panel  │
│  ( collapsible) │                               │  (collapsible)  │
├─────────────────┼───────────────────────────────┼─────────────────┤
│ Patient summary │  Step content                 │ Clinical alerts │
│ Encounter info  │  Primary action               │ Knowledge       │
│ Recent history  │  Secondary actions            │ Timeline/status │
│                 │                               │ Suggested next  │
└─────────────────┴───────────────────────────────┴─────────────────┘
```

### Breakpoints

- **Desktop (≥1280px):** Three columns.
- **Tablet (768–1279px):** Context panel collapses to a header; insight panel becomes a bottom sheet.
- **Mobile (<768px):** Single column with step-by-step cards.

---

## The Consent Task Flow

### Step 1: Confirm Context

**Purpose:** Ensure the physician is working on the right patient and encounter.

#### Layout
- Patient card: name, MRN, DOB, gender, language preference.
- Encounter card: type, date/time, location, attending physician, diagnosis/procedure context.
- Primary action: **Start Consent**.

#### Design Rules
- Patient identity is prominent and visually anchored.
- Mismatch warnings are shown before the physician proceeds.
- Language preference pre-selects the patient-facing content language.

---

### Step 2: Select Procedure

**Purpose:** Identify the procedure or intervention requiring consent.

#### Layout
- Searchable procedure directory.
- Recently used procedures.
- Specialty-filtered categories.
- Selected procedure card with code and description.

#### Design Rules
- Search supports synonyms and local terminology.
- Each result shows procedure name, code, and default consent type.
- Hover or focus reveals a short description.

---

### Step 3: Review Knowledge Package

**Purpose:** Surface clinically relevant content assembled from rules, guidelines, and encounter data.

#### Layout
- **Summary card:** procedure name, indication, recommended disclosure level.
- **Risks section:** categorized by frequency and severity.
- **Alternatives section:** including no-intervention option.
- **Anesthesia / sedation section:** if applicable.
- **Post-procedure section:** recovery expectations, follow-up.
- **Rule explanation:** why this content was selected.

#### Design Rules
- Risks use a layered disclosure: “Common,” “Serious,” “Rare.”
- Each risk has a patient-friendly summary and a clinical detail toggle.
- The physician can add, remove, or edit disclosures with a documented reason.
- Changes are tracked in the audit trail.

---

### Step 4: Personalize Disclosures

**Purpose:** Adapt consent content to the individual patient.

#### Layout
- Bilingual editor (EN/AR side-by-side or tabbed).
- Patient-specific factors (allergies, comorbidities, medications).
- Free-text physician notes.
- Material risks checklist with confirmation.

#### Design Rules
- Side-by-side bilingual editing is default for bilingual deployments.
- Warnings appear if required sections are empty or incomplete.
- Physician notes are distinguished from template content.

---

### Step 5: Add Participants

**Purpose:** Document interpreter, witness, or guardian involvement when required.

#### Layout
- Interpreter: name, ID, language, certification, mode (in-person/video/phone).
- Witness: name, role, ID.
- Guardian: relationship, authority documentation.

#### Design Rules
- Only shown when clinically or legally required.
- Validation ensures required fields are complete before send.
- Interpreter declaration is captured separately from physician attestation.

---

### Step 6: Physician Review & Acknowledge

**Purpose:** Confirm that the physician has reviewed the content and attests to its accuracy.

#### Layout
- Final consent preview (as patient will see it).
- Clinical alert summary.
- Attestation checkbox with legally approved language.
- Primary action: **Send to Patient**.

#### Design Rules
- Alerts must be acknowledged explicitly; dismissed alerts are logged.
- The preview matches the patient experience exactly.
- Send options: secure link (email/SMS), QR code for bedside, patient portal.

---

### Step 7: Monitor & Follow Up

**Purpose:** Track consent status and respond to patient actions.

#### Layout
- Status timeline: sent → opened → in review → signed/declined/expired.
- Notifications for completion, decline, or timeout.
- Quick actions: resend, revoke, edit before signature, view record.

#### Design Rules
- Status is visually clear and color-coded.
- Urgent unsigned consents are surfaced in a priority inbox.
- Declined consents trigger a follow-up workflow.

---

## Key Workspace Components

### Global Header
- Logo / app switcher.
- Global search.
- Notification bell.
- User menu (profile, preferences, help, logout).
- No system metadata, version numbers, or debug badges.

### Clinical Alert Banner
- Appears only when there is actionable information.
- Distinguishes blocking, warning, and informational alerts.
- Each alert has a clear action and a documented dismissal.

### Consent Task Inbox
- Default landing view for physicians.
- Columns: patient, procedure, urgency, status, due time, actions.
- Inline quick actions for common tasks.
- Bulk selection for coordinators.

### Knowledge Card
- Compact, scannable summary of clinical guidance.
- Expandable for detail.
- Shows confidence level and source.

---

## Interaction Patterns

### Progressive Disclosure
- Always show the decision-critical information first.
- Hide detail behind consistent “Show more” affordances.
- Never require the user to open detail to complete the task.

### Inline Editing
- Edit disclosures directly in the preview card.
- Changes are auto-saved with a subtle status indicator.
- Undo/redo is available for recent changes.

### Keyboard Shortcuts
- `/` to search.
- `Esc` to close panels.
- `Cmd/Ctrl + Enter` to send from review step.
- Full keyboard navigability for all primary actions.

---

## Physician Workspace Success Metrics

| Metric | Target |
|---|---|
| Time to send standard consent | ≤ 3 minutes |
| Alert override documentation rate | 100% |
| Task abandonment rate | < 5% |
| Error correction rate | < 3% |
| Subjective ease score (SUS) | ≥ 80 |
