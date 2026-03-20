# Wathiq Care RTL and i18n Requirements

Status: Active (Mandatory)
Effective date: 2026-03-13
Applies to: All frontend UI content, components, and workflows

## 1) Purpose

Define strict bilingual and bidirectional requirements for Wathiq Care UI.
Arabic and English parity is mandatory, not optional.

## 2) Language and Locale Baseline

Required supported languages:
- Arabic (`ar`)
- English (`en`)

Requirements:
- Every user-facing string MUST exist in both Arabic and English.
- Language switching MUST be available across the full application shell and feature modules.
- Locale-specific formatting MUST be correct for each active language (dates, numbers, and time).

## 3) Directionality Baseline (Bidi)

Hard rules:
- Arabic active -> UI direction MUST be RTL.
- English active -> UI direction MUST be LTR.
- Direction MUST be controlled at app-shell level and inherited by all modules/components.
- Direction switching MUST be runtime-safe without layout corruption.

Forbidden:
- Partial RTL-only fixes on selected pages
- Mirroring with ad hoc CSS overrides while base components remain LTR-biased
- Hard-coded left/right assumptions in component styles

## 4) Angular i18n and RTL Implementation Requirements

The implementation SHALL:
- Use Angular-compatible i18n architecture for all text resources
- Keep translation keys structured by feature/module
- Separate translatable strings from component logic
- Support lazy-loaded translation resources for modular growth
- Use logical CSS properties and direction-aware layout patterns
- Ensure Angular routing and reactive form flows remain correct after language and direction switches

## 5) Content Parity Requirements

Arabic and English SHALL remain semantically equivalent for:
- Navigation labels
- Workflow statuses and action labels
- Validation and error messages
- Alerts, notifications, and dialog content
- Table headers, filters, and empty states
- Document and media metadata labels

No release may include placeholder or missing language entries for production workflows.

## 6) Component-Level RTL/LTR Requirements

Every shared component used in healthcare workflows MUST support RTL and LTR correctly:
- Sidebar and top navigation alignment
- Form field labels, hints, helper text, and validation placement
- Table sorting/filtering controls and pagination
- Modal/dialog action button ordering
- Notification and alert placement
- Chart legends, axis labels, and directional annotations
- File upload/download controls and attachment lists

## 7) Healthcare Workflow-Specific Usability Requirements

Bilingual + bidi support MUST preserve clinical usability:
- Multi-step forms remain understandable in both languages
- Escalation and risk states are clear and consistent in Arabic and English
- Case timelines and status progression remain readable in both directions
- No workflow action is hidden or ambiguous after direction switch

## 8) Responsive and Tablet Requirements

On tablet and desktop, bilingual and bidi behavior MUST remain correct for:
- Navigation shell
- Long forms and multi-column layouts
- Dense data tables
- Dialogs and approval flows

Direction switching MUST not break touch usability or overflow controls.

## 9) Acceptance Gates for i18n/RTL (Pre-Implementation and Pre-Release)

### Gate I18N-1: Resource Completeness
Required evidence:
- Translation key inventory for `ar` and `en`
Pass condition:
- 100 percent key availability in both languages for in-scope features

### Gate I18N-2: Directionality Integrity
Required evidence:
- RTL and LTR UI verification notes for shell + shared components
Pass condition:
- No broken alignment, clipped text, or reversed interaction flows

### Gate I18N-3: Workflow Parity
Required evidence:
- Bilingual walkthrough for target healthcare workflows
Pass condition:
- Same business capability and clarity in both languages

### Gate I18N-4: Tablet Validation
Required evidence:
- Tablet screenshots or demo proof in both `ar` (RTL) and `en` (LTR)
Pass condition:
- Critical workflows complete successfully on tablet without workaround

If any gate fails, implementation or release MUST NOT proceed.

## 10) Review and Exception Policy

- Teams MUST document any mismatch before changing code.
- Reviewers SHALL block changes lacking bilingual and bidi proof.
- Exceptions require formal approval from architecture and product leadership.
