# Login Visual Baseline Review

**Sprint:** VE-01 — Login Experience  
**Date:** 2026-06-28  
**Scope:** `apps/web/src/app/login/page.tsx` only  
**Status:** Proposed visual baseline for WathiqCare Enterprise UI

---

## What Changed

The login page was modernized to enterprise healthcare standards while preserving all existing authentication logic:

- **Layout:** Two-column split with a branded left panel and a focused form right panel. On mobile, the brand panel collapses above the form card for a single-column reading flow.
- **Typography:** Clear hierarchy using the WathiqCare type system (`--font-inter`, `--font-arabic`). Eyebrow, headline, lead, and body text are now distinct.
- **Colors:** Migrated to WathiqCare design tokens (`--wc-navy`, `--wc-navy-mid`, `--wc-blue`, `--wc-gold`, `--wc-bg`, `--wc-surface`). The brand side uses a deep navy gradient with subtle gold/blue orb accents; the form side uses a clean light surface.
- **Card:** Larger radius (`28px` desktop, `32px` on `sm`), soft layered shadow, and a calm border using `--wc-border`.
- **Inputs:** 54 px height, rounded 12 px, icon prefix, visible focus ring (`--wc-blue` with translucent ring), and consistent placeholder color.
- **Buttons:** Primary CTA is full-width with a navy gradient and hover lift; secondary IMC button is dashed and clearly disabled.
- **Accessibility:** Added `aria-live="polite"` to the error alert, `aria-pressed` on the password visibility toggle, `aria-label` on the eye button, `aria-disabled` on disabled controls, and `focus-visible` rings throughout.
- **Mobile responsiveness:** Breakpoints at `639px` and `1023px` adjust padding, brand panel height, font sizes, and card radius.
- **RTL support:** Full Arabic mirroring, Arabic fonts, logical padding, and RTL-appropriate arrow icons (`ArrowUpLeft` in RTL contexts).

A supporting fix in `apps/web/src/app/layout.tsx` made the root layout async so the `wathiqcare_lang` cookie is correctly awaited, enabling server-side RTL rendering.

---

## Visual Design Rationale

The new login screen follows enterprise healthcare patterns: high trust signals on the brand side (logo, trust badge, value propositions) and low-friction authentication on the form side. The navy gradient conveys stability and compliance, while the white card and generous whitespace keep the form approachable. The design intentionally avoids decorative noise so clinical users can complete authentication quickly.

---

## Desktop EN Assessment

- **Strengths:** Clean two-column layout, strong contrast, readable form hierarchy, clear CTA, useful trust features.
- **Weaknesses:** None blocking.
- **Verdict:** Ready as baseline.

## Desktop AR Assessment

- **Strengths:** Correct RTL direction, Arabic headline and body copy, mirrored layout, Arabic footer links, RTL arrow icons.
- **Weaknesses:** Email placeholder remains LTR (`example@hospital.sa`), which is technically correct for email addresses but may feel slightly unpolished in an otherwise fully Arabic form.
- **Verdict:** Ready as baseline; placeholder is standard for email fields.

## Mobile EN Assessment

- **Strengths:** Single-column stack works well, brand panel remains readable, form card is full-width and tappable, CTA remains prominent.
- **Weaknesses:** None blocking.
- **Verdict:** Ready as baseline.

## Mobile AR Assessment

- **Strengths:** RTL stacking is natural, brand panel and form both mirror correctly, touch targets are large.
- **Weaknesses:** Same email placeholder note as desktop AR.
- **Verdict:** Ready as baseline.

---

## Accessibility Notes

- Visible focus rings on links, inputs, buttons, and the password toggle.
- Error message uses `role="alert"` and `aria-live="polite"`.
- Form inputs have explicit labels and correct `autoComplete` attributes.
- Disabled IMC button is marked `aria-disabled="true"` and `disabled`.
- Reduced-motion users get static transitions via `prefers-reduced-motion`.

## RTL Notes

- Server now renders `dir="rtl"` and `lang="ar"` when the `wathiqcare_lang` cookie is `ar`.
- Logical CSS properties (`padding-inline`, `start`/`end`) are used for layout.
- Arabic font stack is applied to headlines and body text.
- Directional icons are mirrored (`ArrowUpLeft` for RTL home/contact links).

---

## Known Limitations

1. **Email placeholder is LTR in Arabic inputs.** Email addresses are universally LTR, so this is standard behavior, but it is the only non-Arabic element in the Arabic form.
2. **Language pill is an indicator, not a switcher.** Users must change language via the existing language mechanism (cookie/localStorage/path); there is no on-page toggle.
3. **IMC button is disabled.** This matches the existing product state and is not a visual regression.
4. **Forgot password is disabled.** This also matches the existing product state.

---

## Recommendation

**APPROVE AS VISUAL BASELINE**

The login page meets enterprise healthcare visual standards, supports both LTR and RTL layouts, is accessible, and is responsive across desktop and mobile. The known limitations are pre-existing functional constraints or standard email-field behavior, not visual blockers. This design can serve as the visual baseline for subsequent VE sprints.
