# WathiqCare Visual Excellence Sprint (VE-01)

**Principal Product Designer | WathiqCare Enterprise Edition**

**Sprint Goal:** Transform WathiqCare's visual quality to enterprise-grade healthcare standards while preserving every existing workflow, API, and business rule.

**Quality Targets:** Apple Health, Epic Systems, Oracle Health, Microsoft Fluent 2, Linear, Stripe Dashboard.

---

## 1. Design Philosophy

WathiqCare must feel **calm, precise, and trustworthy**. Every visual decision should reduce cognitive load, reinforce clinical safety, and communicate professionalism.

### Core Visual Principles

1. **Clarity over decoration.** Every pixel must serve understanding.
2. **Consistency over novelty.** Reuse patterns; do not invent new ones.
3. **Restraint over richness.** Use color, shadow, and motion sparingly.
4. **Accessibility by default.** Contrast, focus, and RTL are non-negotiable.
5. **Hierarchy through typography and spacing, not borders alone.**

---

## 2. Typography

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 32px | 40px | 600 | Page titles (logged-in) |
| `display-lg` | 28px | 36px | 600 | Page titles (marketing) |
| `heading-1` | 24px | 32px | 600 | Section headers |
| `heading-2` | 20px | 28px | 600 | Card titles |
| `heading-3` | 16px | 24px | 600 | Subsection titles |
| `body` | 14px | 22px | 400 | Body text |
| `body-lg` | 16px | 26px | 400 | Patient education text |
| `small` | 12px | 18px | 500 | Captions, metadata |
| `micro` | 11px | 16px | 600 | Badges, timestamps |

### Rules

- Body text is never smaller than 14px in clinical interfaces.
- Patient education text defaults to 16px for readability.
- Arabic line-height is 10% larger than English for the same token.
- Maximum paragraph width is 65 characters for patient content.
- Headings use a consistent weight ladder: 600 for titles, 400 for body, 500–600 for emphasis.
- Use `font-feature-settings: "tnum"` for numeric tables and timestamps.

### Arabic / English Consistency

- Arabic and English must share the same scale; only line-height and font-family differ.
- Mixed-language labels align to the start edge of their container (right in RTL, left in LTR).
- Bilingual cards use side-by-side columns on desktop, stacked on mobile.

---

## 3. Spacing

### Base Unit

Base unit: **4px**

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight inline gaps, icon padding |
| `space-2` | 8px | Button internal padding, small gaps |
| `space-3` | 12px | Card internal padding compact |
| `space-4` | 16px | Standard card padding |
| `space-5` | 20px | Section internal padding |
| `space-6` | 24px | Page section gaps |
| `space-8` | 32px | Major section separators |
| `space-10` | 40px | Page-level vertical rhythm |
| `space-12` | 48px | Hero / landing spacing |

### Spacing Rules

- Card internal padding: `space-4` (16px) standard, `space-5` (20px) for emphasis.
- Card-to-card gap: `space-4`.
- Section-to-section gap: `space-6` to `space-8`.
- Page horizontal padding: `space-4` mobile, `space-6` tablet, `space-8` desktop.
- Form label to input: `space-2`.
- Input to validation message: `space-2`.
- Button group gap: `space-3`.

---

## 4. Cards

### Card Anatomy

```
┌─────────────────────────────┐
│ Header (title + actions)    │  ← optional
├─────────────────────────────┤
│ Body                         │
│                              │
├─────────────────────────────┤
│ Footer (metadata/actions)    │  ← optional
└─────────────────────────────┘
```

### Visual Spec

| Property | Value |
|---|---|
| Background | `surface-card` (#FFFFFF) |
| Border | 1px solid `color-neutral-200` (#E2E8F0) |
| Radius | 12px (`radius-lg`) |
| Shadow | `shadow-sm` default, `shadow-md` on hover/focus |
| Padding | 16px–20px |

### States

- **Default:** border `neutral-200`, shadow `sm`.
- **Hover:** border `primary-200`, shadow `md`.
- **Focus:** `shadow-focus` ring (primary color, 3px).
- **Selected:** border `primary-500`, background `primary-50`.
- **Disabled:** opacity 0.6, no hover elevation.

### Card Types

| Type | Usage |
|---|---|
| `Card` | General content containers |
| `CardInteractive` | Clickable list items, selectable rows |
| `CardAlert` | Important notices with semantic left border |
| `CardFlat` | Subtle grouping without elevation |

---

## 5. Buttons

### Button Variants

| Variant | Background | Border | Text | Usage |
|---|---|---|---|---|
| Primary | `primary-600` | `primary-600` | white | Main action on screen |
| Secondary | white | `neutral-300` | `neutral-900` | Alternative action |
| Tertiary | transparent | transparent | `primary-600` | Low-emphasis action |
| Danger | `danger-50` | `danger-200` | `danger-700` | Destructive action |
| Ghost | transparent | transparent | `neutral-600` | Inline icon action |

### Button Sizes

| Size | Height | Padding | Font |
|---|---|---|---|
| Small | 32px | 12px horizontal | 12px / 500 |
| Default | 40px | 16px horizontal | 14px / 600 |
| Large | 48px | 20px horizontal | 16px / 600 |

### States

- **Default:** defined above.
- **Hover:** darken background 5%, lift shadow slightly.
- **Active:** darken background 10%, inset shadow.
- **Focus:** `shadow-focus` ring.
- **Disabled:** opacity 0.5, cursor not-allowed.
- **Loading:** spinner replaces text, width preserved.

### Rules

- Only one Primary button per view.
- Danger buttons require a confirmation step for destructive actions.
- Icon + text buttons keep a 6px gap.

---

## 6. Forms

### Labels

- Font: `body` / 500.
- Color: `neutral-900`.
- Margin bottom: `space-2`.
- Required indicator: `*` in `danger-500`, with `aria-required="true"`.

### Inputs

| Property | Value |
|---|---|
| Height | 40px (default), 48px (large) |
| Padding | 12px horizontal |
| Border | 1px solid `neutral-300` |
| Radius | 8px |
| Focus | border `primary-500`, `shadow-focus` |
| Error | border `danger-500`, background `danger-50` |

### Validation Messages

- Error: `danger-600` text, 12px, with error icon.
- Helper text: `neutral-500`, 12px.
- Validation appears below input with `space-2` gap.

### Section Grouping

- Use `Card` with subtle background (`neutral-50`) for form sections.
- Section titles: `heading-3`.
- Section spacing: `space-6` between groups.

---

## 7. Navigation

### Topbar

- Height: 56px desktop, auto-wrap mobile.
- Background: gradient from `wc-navy` to `wc-navy-mid`.
- Left: brand mark.
- Right: notifications, language, user menu, logout.
- No version/build metadata visible.

### Sidebar

- Width: 240px desktop, full-screen drawer mobile.
- Background: `surface-card`.
- Active item: left border `primary-500`, background `primary-50`.
- Hover: background `neutral-50`.
- Icon + label with 12px gap.

### Breadcrumbs

- Font: `small`.
- Separator: `>` or `←` depending on direction.
- Current page: `neutral-900`, non-clickable.
- Parent pages: `primary-600`, hover underline.

### Page Titles

- `display-xl` for module landing pages.
- `heading-1` for sub-pages.
- Subtitle: `body` / `neutral-600`, max 1 line.

---

## 8. Tables

### Table Spec

| Property | Value |
|---|---|
| Header background | `neutral-50` |
| Header text | `small` / 600 / `neutral-700` |
| Row height | 52px |
| Row border | 1px solid `neutral-100` |
| Hover row | `neutral-50` |
| Cell padding | 12px 16px |

### Enhancements

- Sticky header with subtle bottom border.
- Column alignment: text left/start, numbers right/end, status center.
- Mobile: horizontal scroll with preserved column widths; do not squish text.
- Empty state: centered card with icon, message, and primary action.

---

## 9. Status Indicators

### Badge System

| Status | Background | Border | Text | Icon |
|---|---|---|---|---|
| Success | `#DCFCE7` | `#86EFAC` | `#166534` | CheckCircle |
| Warning | `#FEF3C7` | `#FCD34D` | `#92400E` | AlertTriangle |
| Critical | `#FEE2E2` | `#FCA5A5` | `#991B1B` | XCircle |
| Info | `#E0F2FE` | `#7DD3FC` | `#075985` | Info |
| Draft | `#F1F5F9` | `#CBD5E1` | `#475569` | Pencil |
| Signed | `#DCFCE7` | `#86EFAC` | `#166534` | FileCheck |
| Pending | `#FEF3C7` | `#FCD34D` | `#92400E` | Clock |
| Expired | `#FEE2E2` | `#FCA5A5` | `#991B1B` | CalendarX |

### Rules

- Always pair status with text; never rely on color alone.
- Use icons consistently across the app.
- Critical/warning badges in patient-facing UI must include plain-language explanation.

---

## 10. Patient Experience

### Education Screen

- Use a clear step indicator at top.
- One concept per card.
- Risks grouped by severity with plain-language labels.
- Bilingual content in side-by-side columns on desktop, stacked on mobile.
- Progress saved indicator (subtle, non-intrusive).

### OTP Screen

- Large, tappable inputs.
- Clear trust signals (lock icon, organization name).
- Countdown timer and resend action.
- Error state with recovery instruction.

### Signature Screen

- Full-width signature pad.
- Rotate-to-landscape prompt on mobile.
- Clear label: "Draw your signature to confirm."
- Undo/clear actions.

### Confirmation Screen

- Large success icon with confirmation code.
- What happens next.
- Download/email copy option.
- Contact support link.
- No raw hashes or technical identifiers visible.

### Loading States

- Skeleton screens that mirror content structure.
- No spinners on full pages unless unavoidable.
- Loading buttons preserve width to prevent layout shift.

### Empty States

- Friendly illustration or icon.
- Plain-language explanation.
- Primary action when applicable.

---

## 11. Physician Experience

### Workspace

- Clean three-zone layout: context, work surface, insight.
- Clear primary action at each step.
- Knowledge package presented as a scannable card with progressive disclosure.
- Risk flags use the badge system and include explanation.

### Timeline

- Vertical timeline with clear nodes.
- Each event: actor, action, timestamp.
- Group related events.
- Use subtle separators between days.

### Knowledge Package Presentation

- Procedure summary card at top.
- Risks in collapsible sections by severity.
- Alternatives and no-intervention option given equal weight.
- Source/rule explanation available on demand.

### Clinical Readability

- Avoid all-caps except for micro labels.
- Use sentence case for buttons and labels.
- Medical terms include inline plain-language definitions when shown to patients.

---

## 12. Animations

### Principles

- Motion communicates state change, never entertains.
- Prefer opacity and transform; avoid layout-triggering animations.
- Respect `prefers-reduced-motion`.

### Timing

| Token | Duration | Usage |
|---|---|---|
| `duration-instant` | 0ms | Instant feedback |
| `duration-fast` | 150ms | Hover, toggles |
| `duration-normal` | 250ms | Panel transitions |
| `duration-slow` | 350ms | Page transitions, modals |

### Easing

- `ease-out` for elements entering.
- `ease-in-out` for state changes.
- No bounce or elastic effects.

### Allowed Motions

- Button hover: background/color 150ms.
- Card hover: shadow/border 150ms.
- Modal enter: opacity + translateY 250ms.
- Toast enter/exit: opacity + translateX 250ms.
- Skeleton pulse: opacity shimmer 1.5s infinite.

---

## 13. Accessibility

### Contrast

- Text contrast ≥ 4.5:1 for body text.
- Large text and UI components ≥ 3:1.
- Patient education text uses highest contrast combinations.

### Focus Rings

- All interactive elements have visible focus indicators.
- Focus ring: 3px solid `primary-500` with 2px offset.
- Focus-visible only; do not show on mouse click.

### Keyboard Navigation

- Logical tab order.
- `Esc` closes modals, drawers, menus.
- Trap focus inside active modals.
- Skip-to-content link on all pages.

### RTL Visual Review

- All components must flip correctly in RTL.
- Icons that imply direction (arrows, chevrons) must mirror.
- Timeline and step indicators progress right-to-left in RTL.
- Sidebar drawer opens from the right in RTL.

---

## 14. Implementation Notes

- All changes are visual only.
- Use existing WDS tokens where possible; extend only when necessary.
- Update `docs/ux-masterplan/04-design-system.md` if new tokens are introduced.
- Every change must be verified in LTR and RTL, desktop and mobile.

---

## 15. Success Metrics

| Metric | Target |
|---|---|
| Visual consistency score (design review) | ≥ 8/10 |
| Accessibility violations (axe) | 0 critical/high |
| Patient task completion confidence | ≥ 4.2/5 |
| Physician SUS score | ≥ 80 |
| Mobile usability issues | ≤ 2 minor |
| RTL layout bugs | 0 critical |
