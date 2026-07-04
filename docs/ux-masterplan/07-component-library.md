# WathiqCare Enterprise UX 2.0 — Component Library

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Overview

The Wathiq Design System (WDS) component library provides reusable, accessible, and well-documented UI building blocks. Components are designed for healthcare workflows: clarity, safety, and efficiency come first.

---

## Component Inventory

### 1. Layout Components

| Component | Purpose |
|---|---|
| `AppShell` | Application frame with header, navigation, and content area. |
| `PageLayout` | Standard page container with title, actions, and footer. |
| `ThreePaneLayout` | Physician workspace: context, work surface, insight panels. |
| `Card` | Contained surface for related information. |
| `Drawer` | Slide-out panel for secondary actions or detail. |
| `Modal` | Focused dialog for critical decisions or confirmations. |
| `EmptyState` | Illustrated guidance when no data exists. |
| `Skeleton` | Loading placeholder that mirrors content structure. |

### 2. Navigation Components

| Component | Purpose |
|---|---|
| `TopNav` | Primary application navigation. |
| `SideNav` | Secondary or module-specific navigation. |
| `Breadcrumbs` | Hierarchical location indicator. |
| `Tabs` | Switch between related views. |
| `Stepper` | Multi-step workflow progress. |
| `Pagination` | Large list navigation. |

### 3. Data Display Components

| Component | Purpose |
|---|---|
| `DataTable` | Sortable, filterable tabular data. |
| `PatientCard` | Compact patient identity summary. |
| `EncounterCard` | Encounter context summary. |
| `StatusBadge` | Semantic status indicator. |
| `Timeline` | Chronological event list. |
| `MetricCard` | Key number with label and trend. |
| `RiskBadge` | Risk severity with icon and label. |

### 4. Input Components

| Component | Purpose |
|---|---|
| `TextInput` | Single-line text entry. |
| `TextArea` | Multi-line text entry. |
| `Select` | Single or multiple selection from a list. |
| `Combobox` | Searchable selection with autocomplete. |
| `Checkbox` | Binary choice. |
| `RadioGroup` | Mutually exclusive choices. |
| `Switch` | Toggle a setting. |
| `DatePicker` | Date and time selection. |
| `SignaturePad` | Capture drawn signature. |
| `OTPInput` | One-time password entry. |
| `BilingualInput` | Side-by-side EN/AR text entry. |

### 5. Feedback Components

| Component | Purpose |
|---|---|
| `Alert` | Contextual message (info, success, warning, danger). |
| `Banner` | Persistent top-level alert. |
| `Toast` | Short-lived confirmation or notification. |
| `Tooltip` | Supplementary information on hover/focus. |
| `InlineError` | Field-level validation message. |
| `ProgressBar` | Step or process progress. |
| `Spinner` | Loading indicator. |

### 6. Action Components

| Component | Purpose |
|---|---|
| `Button` | Primary, secondary, tertiary, and danger variants. |
| `IconButton` | Action represented by icon only. |
| `ButtonGroup` | Related actions grouped together. |
| `SplitButton` | Primary action with secondary options. |
| `ActionMenu` | Overflow actions in a dropdown. |

### 7. Consent-Specific Components

| Component | Purpose |
|---|---|
| `ConsentTaskCard` | Summary of a consent task with status and actions. |
| `KnowledgePackageCard` | Clinical knowledge summary with risks and alternatives. |
| `DisclosureEditor` | Bilingual consent content editor. |
| `ParticipantForm` | Interpreter, witness, guardian entry. |
| `SignatureCapture` | Real signature capture with mode selection. |
| `ConfirmationView` | Patient-friendly confirmation screen. |
| `AuditTimeline` | Immutable record of consent events. |

---

## Component Specifications

### Button

| Variant | Usage | State |
|---|---|---|
| Primary | Main action on a screen | Default, hover, active, focus, disabled, loading |
| Secondary | Alternative action | Default, hover, active, focus, disabled, loading |
| Tertiary | Low-emphasis action | Default, hover, active, focus, disabled |
| Danger | Destructive action | Default, hover, active, focus, disabled, loading |
| Ghost | Icon or inline action | Default, hover, active, focus, disabled |

**Rules:**
- Only one primary button per view.
- Loading state preserves layout width.
- Disabled state includes a tooltip explaining why when helpful.

### Card

**Anatomy:**
- Header (optional): title + action.
- Body: content.
- Footer (optional): actions or metadata.

**Rules:**
- Cards do not nest more than two levels deep.
- Shadow is used sparingly; borders are preferred for structure.

### Alert / Banner

| Severity | Color | Icon | Usage |
|---|---|---|---|
| Info | Cyan | Info circle | Neutral guidance |
| Success | Green | Check circle | Completion or healthy state |
| Warning | Amber | Alert triangle | Attention needed, non-blocking |
| Danger | Red | X octagon | Blocking issue or critical risk |

**Rules:**
- Banners are reserved for persistent, important messages.
- Alerts can be dismissible unless blocking.
- Danger alerts require an explicit user action to proceed.

### Status Badge

| Status | Color | Example |
|---|---|---|
| Draft | Neutral | Not yet sent |
| Sent | Blue | Awaiting patient |
| Opened | Purple | Patient viewing |
| Signed | Green | Agreement captured |
| Declined | Red | Refusal captured |
| Expired | Gray | Link no longer valid |
| Needs Review | Amber | Exception or question |

### Signature Pad

**Requirements:**
- Minimum drawing area: 300×150px on mobile, 500×200px on desktop.
- Clear canvas action.
- Undo/redo support.
- Accessibility fallback: typed name attestation.
- High contrast stroke against background.

### Bilingual Input

**Requirements:**
- Side-by-side fields for EN and AR.
- Tabbed fallback on narrow viewports.
- Visual indication of required language(s).
- Character count and validation per field.

---

## Component States & Behaviors

### Loading
- Use `Skeleton` for initial page load.
- Use `Spinner` inline for button or section loading.
- Avoid full-screen spinners except for route transitions.

### Error
- Field errors appear inline below the input.
- Form errors appear as an alert above the form.
- Page-level errors use a dedicated error state with recovery action.

### Empty
- Empty states explain why nothing is shown.
- Include a primary action when creation is expected.
- Use illustrations sparingly; icon + text is often sufficient.

### Disabled
- Disabled elements maintain readable contrast.
- When the reason is not obvious, provide a tooltip or helper text.

---

## Documentation & Governance

- Each component has a Figma master, Storybook story, and usage guidelines.
- Components are versioned.
- Breaking changes require a migration plan.
- New components are proposed via RFC and reviewed by design, accessibility, and engineering.
