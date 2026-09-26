# WathiqCare Visual Excellence Sprint — Design Consistency Checklist

**Principal Product Designer | WathiqCare Enterprise Edition**

**Sprint:** VE-01  
**Purpose:** Ensure every visual element across WathiqCare meets enterprise-grade consistency standards.

---

## How to Use This Checklist

Review every major screen and component against the criteria below. Mark each item **Pass**, **Fail**, or **N/A**. Any **Fail** must be addressed before the sprint is considered complete.

---

## 1. Typography

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 1.1 | Body text is never smaller than 14px in clinical interfaces. | [ ] | [ ] | [ ] |
| 1.2 | Patient education text is 16px or larger. | [ ] | [ ] | [ ] |
| 1.3 | Headings use a consistent scale (display-xl → heading-3). | [ ] | [ ] | [ ] |
| 1.4 | Line heights are appropriate (body 1.5–1.6, headings 1.2–1.3). | [ ] | [ ] | [ ] |
| 1.5 | Arabic text has 10% extra line height compared to English. | [ ] | [ ] | [ ] |
| 1.6 | Font weights are consistent (titles 600, body 400, emphasis 500–600). | [ ] | [ ] | [ ] |
| 1.7 | No more than two typefaces are used in a single view. | [ ] | [ ] | [ ] |
| 1.8 | Medical terms shown to patients include plain-language definitions. | [ ] | [ ] | [ ] |
| 1.9 | Text truncation is avoided; content wraps or is expanded. | [ ] | [ ] | [ ] |
| 1.10 | Tabular numbers are used for IDs, dates, and metrics. | [ ] | [ ] | [ ] |

---

## 2. Spacing

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 2.1 | All spacing is based on the 4px grid system. | [ ] | [ ] | [ ] |
| 2.2 | Card internal padding is 16px or 20px consistently. | [ ] | [ ] | [ ] |
| 2.3 | Card-to-card gap is 16px. | [ ] | [ ] | [ ] |
| 2.4 | Section-to-section gap is 24px or 32px. | [ ] | [ ] | [ ] |
| 2.5 | Page horizontal padding adapts by breakpoint (16/24/32px). | [ ] | [ ] | [ ] |
| 2.6 | Form label-to-input gap is 8px. | [ ] | [ ] | [ ] |
| 2.7 | Input-to-validation-message gap is 8px. | [ ] | [ ] | [ ] |
| 2.8 | Button group gap is 12px. | [ ] | [ ] | [ ] |
| 2.9 | No arbitrary magic numbers in spacing values. | [ ] | [ ] | [ ] |
| 2.10 | Whitespace is generous enough to reduce cognitive load. | [ ] | [ ] | [ ] |

---

## 3. Cards

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 3.1 | Card border radius is consistently 12px. | [ ] | [ ] | [ ] |
| 3.2 | Card border is 1px solid `neutral-200`. | [ ] | [ ] | [ ] |
| 3.3 | Card background is white or `surface-card`. | [ ] | [ ] | [ ] |
| 3.4 | Card shadow is `shadow-sm` default, `shadow-md` hover/focus. | [ ] | [ ] | [ ] |
| 3.5 | Card hover has visible but subtle state change. | [ ] | [ ] | [ ] |
| 3.6 | Card focus ring uses `shadow-focus`. | [ ] | [ ] | [ ] |
| 3.7 | Card header, body, and footer spacing is consistent. | [ ] | [ ] | [ ] |
| 3.8 | No cards are nested more than two levels deep. | [ ] | [ ] | [ ] |
| 3.9 | Alert cards use semantic left border. | [ ] | [ ] | [ ] |
| 3.10 | Disabled cards use reduced opacity, not grayscale confusion. | [ ] | [ ] | [ ] |

---

## 4. Buttons

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 4.1 | Only one Primary button per view. | [ ] | [ ] | [ ] |
| 4.2 | Primary, Secondary, Tertiary, Danger, and Ghost variants exist and are used correctly. | [ ] | [ ] | [ ] |
| 4.3 | Button heights are consistent (small 32px, default 40px, large 48px). | [ ] | [ ] | [ ] |
| 4.4 | Button padding follows the scale (small 12px, default 16px, large 20px). | [ ] | [ ] | [ ] |
| 4.5 | Button hover state is visible and consistent. | [ ] | [ ] | [ ] |
| 4.6 | Button focus ring is visible. | [ ] | [ ] | [ ] |
| 4.7 | Button disabled state is clearly non-interactive. | [ ] | [ ] | [ ] |
| 4.8 | Button loading state preserves layout width. | [ ] | [ ] | [ ] |
| 4.9 | Danger buttons trigger a confirmation step. | [ ] | [ ] | [ ] |
| 4.10 | Icon + text buttons have 6px gap. | [ ] | [ ] | [ ] |

---

## 5. Forms

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 5.1 | Labels use body/500 weight and `neutral-900`. | [ ] | [ ] | [ ] |
| 5.2 | Required fields show `*` in danger color and `aria-required`. | [ ] | [ ] | [ ] |
| 5.3 | Input height is 40px (default) or 48px (large). | [ ] | [ ] | [ ] |
| 5.4 | Input radius is 8px. | [ ] | [ ] | [ ] |
| 5.5 | Input border color changes on focus. | [ ] | [ ] | [ ] |
| 5.6 | Input focus uses `shadow-focus`. | [ ] | [ ] | [ ] |
| 5.7 | Error inputs use `danger-500` border and `danger-50` background. | [ ] | [ ] | [ ] |
| 5.8 | Validation messages are 12px and include an icon. | [ ] | [ ] | [ ] |
| 5.9 | Form sections are visually grouped with consistent spacing. | [ ] | [ ] | [ ] |
| 5.10 | Placeholder text is `neutral-400` and not used as a label. | [ ] | [ ] | [ ] |

---

## 6. Navigation

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 6.1 | Topbar height is 56px desktop, auto-wrap mobile. | [ ] | [ ] | [ ] |
| 6.2 | Topbar contains no debug metadata. | [ ] | [ ] | [ ] |
| 6.3 | Sidebar items have consistent icon size and label spacing. | [ ] | [ ] | [ ] |
| 6.4 | Active sidebar item has visible accent. | [ ] | [ ] | [ ] |
| 6.5 | Breadcrumbs use consistent separator and styling. | [ ] | [ ] | [ ] |
| 6.6 | Page titles use `display-xl` or `heading-1` consistently. | [ ] | [ ] | [ ] |
| 6.7 | Context-aware actions appear in the toolbar. | [ ] | [ ] | [ ] |
| 6.8 | Mobile navigation uses a drawer with overlay. | [ ] | [ ] | [ ] |
| 6.9 | RTL navigation mirrors correctly. | [ ] | [ ] | [ ] |
| 6.10 | Skip-to-content link is available. | [ ] | [ ] | [ ] |

---

## 7. Tables

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 7.1 | Table header background is `neutral-50`. | [ ] | [ ] | [ ] |
| 7.2 | Table header text is 12px / 600 / `neutral-700`. | [ ] | [ ] | [ ] |
| 7.3 | Table row height is 52px. | [ ] | [ ] | [ ] |
| 7.4 | Table row hover is `neutral-50`. | [ ] | [ ] | [ ] |
| 7.5 | Table header is sticky on scroll. | [ ] | [ ] | [ ] |
| 7.6 | Text columns align start, numbers align end, status center. | [ ] | [ ] | [ ] |
| 7.7 | Mobile tables use horizontal scroll, not squished text. | [ ] | [ ] | [ ] |
| 7.8 | Empty table shows a designed empty state. | [ ] | [ ] | [ ] |
| 7.9 | Loading table shows skeleton rows matching structure. | [ ] | [ ] | [ ] |
| 7.10 | No more than one table style in the app. | [ ] | [ ] | [ ] |

---

## 8. Status Indicators

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 8.1 | Success badges use green palette with check icon. | [ ] | [ ] | [ ] |
| 8.2 | Warning badges use amber palette with triangle icon. | [ ] | [ ] | [ ] |
| 8.3 | Critical badges use red palette with x icon. | [ ] | [ ] | [ ] |
| 8.4 | Info badges use cyan/blue palette with info icon. | [ ] | [ ] | [ ] |
| 8.5 | Draft status uses neutral palette. | [ ] | [ ] | [ ] |
| 8.6 | Signed status uses success palette. | [ ] | [ ] | [ ] |
| 8.7 | Pending status uses warning palette. | [ ] | [ ] | [ ] |
| 8.8 | Expired status uses critical palette. | [ ] | [ ] | [ ] |
| 8.9 | Status is communicated by text + icon, not color alone. | [ ] | [ ] | [ ] |
| 8.10 | Patient-facing critical/warning statuses include explanation. | [ ] | [ ] | [ ] |

---

## 9. Patient Experience

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 9.1 | Landing screen has clear trust signals and primary action. | [ ] | [ ] | [ ] |
| 9.2 | OTP screen has large, accessible inputs. | [ ] | [ ] | [ ] |
| 9.3 | OTP screen shows organization branding. | [ ] | [ ] | [ ] |
| 9.4 | Education screen presents one concept per card. | [ ] | [ ] | [ ] |
| 9.5 | Risks are grouped by severity. | [ ] | [ ] | [ ] |
| 9.6 | Decision options have equal visual weight. | [ ] | [ ] | [ ] |
| 9.7 | Signature pad is full-width on mobile. | [ ] | [ ] | [ ] |
| 9.8 | Signature screen prompts rotate-to-landscape on small devices. | [ ] | [ ] | [ ] |
| 9.9 | Confirmation screen shows a short confirmation code, not a hash. | [ ] | [ ] | [ ] |
| 9.10 | Loading states use skeletons, not spinners, where possible. | [ ] | [ ] | [ ] |

---

## 10. Physician Experience

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 10.1 | Workspace has clear primary action per step. | [ ] | [ ] | [ ] |
| 10.2 | Knowledge package summary is scannable. | [ ] | [ ] | [ ] |
| 10.3 | Risk flags use standardized badges and explanations. | [ ] | [ ] | [ ] |
| 10.4 | Timeline is visually clear with actor/action/timestamp. | [ ] | [ ] | [ ] |
| 10.5 | No mock or demo data visible in production context. | [ ] | [ ] | [ ] |
| 10.6 | Clinical text uses sentence case, not all-caps. | [ ] | [ ] | [ ] |
| 10.7 | Section spacing supports clinical scanning. | [ ] | [ ] | [ ] |
| 10.8 | Alerts and banners do not overlap primary actions. | [ ] | [ ] | [ ] |
| 10.9 | Right-to-left layout preserves clinical hierarchy. | [ ] | [ ] | [ ] |
| 10.10 | Workspace is usable at 1280px width and above. | [ ] | [ ] | [ ] |

---

## 11. Animations

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 11.1 | Animations use opacity and transform primarily. | [ ] | [ ] | [ ] |
| 11.2 | Hover transitions are 150ms. | [ ] | [ ] | [ ] |
| 11.3 | Panel/modal transitions are 250–350ms. | [ ] | [ ] | [ ] |
| 11.4 | No bounce, elastic, or playful effects. | [ ] | [ ] | [ ] |
| 11.5 | `prefers-reduced-motion` is respected. | [ ] | [ ] | [ ] |
| 11.6 | Loading skeleton uses subtle shimmer. | [ ] | [ ] | [ ] |
| 11.7 | Button loading does not cause layout shift. | [ ] | [ ] | [ ] |
| 11.8 | Toast notifications slide and fade smoothly. | [ ] | [ ] | [ ] |
| 11.9 | Modal enter/exit is smooth and predictable. | [ ] | [ ] | [ ] |
| 11.10 | No auto-playing animations without pause control. | [ ] | [ ] | [ ] |

---

## 12. Accessibility

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 12.1 | Body text contrast ≥ 4.5:1. | [ ] | [ ] | [ ] |
| 12.2 | Large text and UI components contrast ≥ 3:1. | [ ] | [ ] | [ ] |
| 12.3 | All interactive elements have visible focus indicators. | [ ] | [ ] | [ ] |
| 12.4 | Focus ring is 3px with 2px offset. | [ ] | [ ] | [ ] |
| 12.5 | Focus-visible only (not on mouse click). | [ ] | [ ] | [ ] |
| 12.6 | Tab order is logical. | [ ] | [ ] | [ ] |
| 12.7 | `Esc` closes modals, drawers, menus. | [ ] | [ ] | [ ] |
| 12.8 | Focus is trapped inside active modals. | [ ] | [ ] | [ ] |
| 12.9 | RTL layouts flip correctly (sidebar, timeline, stepper, chevrons). | [ ] | [ ] | [ ] |
| 12.10 | No information is conveyed by color alone. | [ ] | [ ] | [ ] |

---

## 13. Cross-Cutting Consistency

| # | Criterion | Pass | Fail | N/A |
|---|---|---|---|---|
| 13.1 | Same component name/style is used for the same concept everywhere. | [ ] | [ ] | [ ] |
| 13.2 | No competing visual languages remain in production. | [ ] | [ ] | [ ] |
| 13.3 | All colors reference design tokens, not hex literals. | [ ] | [ ] | [ ] |
| 13.4 | All spacing values reference spacing tokens. | [ ] | [ ] | [ ] |
| 13.5 | Shadows use token values, not ad-hoc CSS. | [ ] | [ ] | [ ] |
| 13.6 | Border radius is tokenized. | [ ] | [ ] | [ ] |
| 13.7 | No inline styles for visual properties. | [ ] | [ ] | [ ] |
| 13.8 | No hard-coded demo content in production UI. | [ ] | [ ] | [ ] |
| 13.9 | No debug/developer metadata visible to end users. | [ ] | [ ] | [ ] |
| 13.10 | Screenshots exist for every major surface before and after. | [ ] | [ ] | [ ] |

---

## Sign-Off

| Reviewer | Role | Date | Status |
|---|---|---|---|
|  | Product Design Lead |  |  |
|  | Engineering Lead |  |  |
|  | Accessibility Reviewer |  |  |
|  | Clinical Safety |  |  |

**Overall Status:**
- [ ] Enterprise Visual Ready
- [ ] Needs Minor Polish
- [ ] Needs Major Redesign

**Total Criteria:** 120  
**Passed:** ___  
**Failed:** ___  
**N/A:** ___  

**Notes:**
