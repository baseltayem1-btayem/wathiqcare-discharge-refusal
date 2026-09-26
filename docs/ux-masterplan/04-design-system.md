# WathiqCare Enterprise UX 2.0 — Design System

**Principal Product Designer | WathiqCare Enterprise Edition**

---

## Design System Name

**Wathiq Design System (WDS)**

A calm, precise, and inclusive visual language for healthcare enterprise software.

---

## Influences

| Reference | What We Adopt |
|---|---|
| **Microsoft Fluent** | Structured layouts, accessible components, purposeful motion, depth tokens. |
| **Apple Health** | Human-centered density, calm color palettes, clear data hierarchy. |
| **Linear** | Fast, keyboard-friendly interactions, refined focus states, subtle delight. |
| **Stripe Dashboard** | Information density without clutter, excellent empty and loading states. |
| **Epic / Oracle Health** | Clinical safety conventions, status semantics, workflow predictability. |

---

## Color System

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `color-primary-50` | `#EEF4FF` | Hover backgrounds, light fills |
| `color-primary-100` | `#D9E6FF` | Selected states |
| `color-primary-500` | `#2563EB` | Primary actions, links |
| `color-primary-600` | `#1D4ED8` | Primary hover |
| `color-primary-700` | `#1E40AF` | Active/pressed |

### Semantic Palette

| Token | Hex | Usage |
|---|---|---|
| `color-success-500` | `#16A34A` | Completed, agreed, healthy |
| `color-warning-500` | `#D97706` | Pending, attention needed |
| `color-danger-500` | `#DC2626` | Blocking error, declined, critical alert |
| `color-info-500` | `#0891B2` | Informational note, explanation |

### Neutral Palette

| Token | Hex | Usage |
|---|---|---|
| `color-neutral-0` | `#FFFFFF` | Surfaces |
| `color-neutral-50` | `#F8FAFC` | Page background |
| `color-neutral-100` | `#F1F5F9` | Subtle separators |
| `color-neutral-200` | `#E2E8F0` | Borders |
| `color-neutral-400` | `#94A3B8` | Placeholder, disabled |
| `color-neutral-600` | `#475569` | Secondary text |
| `color-neutral-900` | `#0F172A` | Primary text |

### Extended Clinical Palette

| Token | Usage |
|---|---|
| `color-clinical-urgent` | Time-critical actions |
| `color-clinical-routine` | Standard workflow steps |
| `color-clinical-optional` | Optional or supplementary content |

### Dark Mode
A companion dark theme is defined for low-light clinical settings. Contrast ratios remain ≥ 4.5:1 for text and ≥ 3:1 for UI components.

---

## Typography

### Typeface

- **Primary:** Inter (or system sans-serif fallback)
- **Monospace:** IBM Plex Mono for code, IDs, timestamps
- **Arabic:** Noto Sans Arabic for RTL content

### Scale

| Token | Size | Line Height | Usage |
|---|---|---|---|
| `text-display` | 32px / 2rem | 40px | Page titles |
| `text-heading-1` | 24px / 1.5rem | 32px | Section headers |
| `text-heading-2` | 20px / 1.25rem | 28px | Card titles |
| `text-heading-3` | 16px / 1rem | 24px | Subsection titles |
| `text-body` | 14px / 0.875rem | 22px | Body text |
| `text-small` | 12px / 0.75rem | 18px | Captions, metadata |
| `text-micro` | 11px / 0.6875rem | 16px | Timestamps, badges |

### Typography Rules
- Body text is never smaller than 14px in clinical interfaces.
- Arabic line-height is increased by 10% for readability.
- Maximum line length for patient education: 65 characters.

---

## Spacing & Layout

### Spacing Scale

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

### Layout Grid

- **Desktop:** 12-column grid, max content width 1440px, gutters 24px.
- **Tablet:** 8-column grid, gutters 16px.
- **Mobile:** 4-column grid, gutters 16px, full-bleed cards.

### Surfaces

| Token | Usage |
|---|---|
| `surface-page` | Application background |
| `surface-card` | Cards, panels, dialogs |
| `surface-elevated` | Floating elements, dropdowns, toasts |
| `surface-overlay` | Modals, overlays |

### Elevation

| Token | Shadow | Usage |
|---|---|---|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle separators |
| `shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) | Cards, dropdowns |
| `shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) | Modals, drawers |
| `shadow-focus` | 0 0 0 3px rgba(37,99,235,0.3) | Focus rings |

---

## Iconography

- **Library:** Lucide Icons (consistent, accessible, open-source).
- **Size:** 16px default, 20px for actions, 24px for empty states.
- **Rules:**
  - Icons are paired with text labels for critical actions.
  - Icon color inherits semantic meaning.
  - Decorative icons are hidden from screen readers.

---

## Motion & Animation

### Principles

- Motion is functional, not decorative.
- Transitions communicate state change, not entertainment.
- Animations respect `prefers-reduced-motion`.

### Timing

| Token | Duration | Usage |
|---|---|---|
| `duration-instant` | 0ms | Instant feedback |
| `duration-fast` | 150ms | Hover, toggles |
| `duration-normal` | 250ms | Panel transitions |
| `duration-slow` | 350ms | Page transitions, modals |

### Easing

- `ease-out` for elements entering the viewport.
- `ease-in-out` for elements changing state.
- No bouncing or elastic effects in clinical contexts.

---

## Shape & Borders

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Buttons, inputs, badges |
| `radius-md` | 8px | Cards, panels |
| `radius-lg` | 12px | Modals, dialogs |
| `radius-full` | 9999px | Pills, avatars |

- Borders use `color-neutral-200` by default.
- Focus rings use `shadow-focus` with primary color.

---

## Data Visualization

### Charts in Compliance & Reports

- Use accessible colors with patterns or labels; do not rely on color alone.
- Default to simple bar, line, and donut charts.
- Always show value labels directly or on hover.
- Avoid 3D, shadows, or decorative effects.

---

## Voice & Tone

### Clinical Voice
- Precise, neutral, professional.
- Avoid alarmist language; use “important” instead of “urgent” when possible.
- Use active voice: “The care team will…” not “It will be…”

### Patient Voice
- Warm, plain, respectful.
- Define medical terms inline.
- Use short sentences and concrete examples.

### Error Voice
- Apologize without blame.
- Explain what happened, why it matters, and what to do next.
- Never show raw error codes to patients.

---

## Design System Governance

- **Source of truth:** Figma library + token JSON.
- **Review cadence:** Monthly design system office hours.
- **Contribution:** Proposals via RFC; changes require design + accessibility + engineering review.
- **Documentation:** Storybook (or equivalent) for components and usage examples.
