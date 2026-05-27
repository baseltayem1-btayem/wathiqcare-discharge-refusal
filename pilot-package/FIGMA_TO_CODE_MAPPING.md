# Figma → Code Mapping — WathiqCare UI Refresh v1.1

**Phase:** Safe Figma-to-Code UI Integration
**Branch:** `phase24-evidence-package-final`
**Feature flag:** `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` (default **OFF**)
**Status:** Preview-only / local development. **Not deployed.**
**Related:** [UI_INTEGRATION_CHANGELOG.md](UI_INTEGRATION_CHANGELOG.md),
[PRODUCTION_ISSUANCE_ROUTE_AUDIT.md](PRODUCTION_ISSUANCE_ROUTE_AUDIT.md),
[CONSENT_TYPE_READINESS_MATRIX.md](CONSENT_TYPE_READINESS_MATRIX.md)

---

## 1. Design source

| Item | Value |
| --- | --- |
| Upload | `Healthcare Consent Platform Design.zip` (80 KB) |
| Extract location | [design/figma/wathiqcare-v1.1/](../design/figma/wathiqcare-v1.1/) |
| Format | Vite + React + Tailwind v4 + shadcn token set |
| Provenance file | [design/figma/wathiqcare-v1.1/ATTRIBUTIONS.md](../design/figma/wathiqcare-v1.1/ATTRIBUTIONS.md) |
| Reference component file | [design/figma/wathiqcare-v1.1/src/app/App.tsx](../design/figma/wathiqcare-v1.1/src/app/App.tsx) (1,460 lines, all flows) |
| Reference theme file | [design/figma/wathiqcare-v1.1/src/styles/theme.css](../design/figma/wathiqcare-v1.1/src/styles/theme.css) |

The export was **inspected only**. No file from `design/figma/wathiqcare-v1.1/`
is imported, bundled, or shipped to the app — it serves as the canonical
visual reference for token + component mapping.

---

## 2. Safety exclusions

Per the integration brief, the following were **not touched in any way**:

| Concern | Touched? |
| --- | --- |
| OTP generation / validation / rate limiting | **No** |
| Signing workflow logic | **No** |
| Audit chain (hash continuity, witness matrix) | **No** |
| Evidence package generation | **No** |
| Secure-link validation | **No** |
| Legal sequencing (education → review → decision → OTP → signature → confirmation) | **No** |
| Backend APIs (`apps/api/**`, `apps/web/app/api/**`, `apps/web/src/lib/server/**`) | **No** |
| Prisma schema / migrations | **No** |
| Production environment variables | **No** |
| Existing production page render trees | **No (components are scaffold-only, not yet wired)** |

The visual refresh is gated behind `FEATURE_UI_REFRESH_V1_1`, which is
`false` by default. With the flag off, `UIRefreshBoundary` renders a
pass-through fragment (no DOM, no CSS scope), so legacy behaviour and
evidence/audit outputs are byte-for-byte identical.

---

## 3. Tokens mapped

All tokens are scoped to `[data-ui-refresh="v1.1"]` in
[apps/web/src/styles/ui-refresh-v1.1.css](../apps/web/src/styles/ui-refresh-v1.1.css).
They have **no effect** outside that scope.

### 3.1 Color

| Token (`--wc-*`) | Hex / value | Figma source (`theme.css`) | Notes |
| --- | --- | --- | --- |
| `--wc-color-bg` | `#F0F4F8` | `--background` | Page surface |
| `--wc-color-surface` | `#FFFFFF` | `--card` / `--popover` | Card surface |
| `--wc-color-surface-muted` | `#EDF1F7` | `--muted` | Quiet surface |
| `--wc-color-surface-secondary` | `#E8EEF6` | `--secondary` | Trust banner tint |
| `--wc-color-input-bg` | `#F5F8FC` | `--input-background` | Input fields |
| `--wc-color-border` | `rgba(27,79,138,0.12)` | `--border` | Hairline |
| `--wc-color-border-strong` | `rgba(27,79,138,0.20)` | Trust badge border | Medium-emphasis stroke |
| `--wc-color-text` | `#0D1B2A` | `--foreground` | Body text |
| `--wc-color-text-muted` | `#5A6B82` | `--muted-foreground` | Secondary text |
| `--wc-color-primary` | `#1B4F8A` | `--primary` | Navy / CTA |
| `--wc-color-primary-contrast` | `#FFFFFF` | `--primary-foreground` |  |
| `--wc-color-accent` | `#0F6B45` | `--accent` | Medical green |
| `--wc-color-accent-contrast` | `#FFFFFF` | `--accent-foreground` |  |
| `--wc-color-success` / `-soft` | `#0F6B45` / `#ECFDF5` | Confirmation icon pill | |
| `--wc-color-warning` / `-soft` | `#B45309` / `#FEF3C7` | Risk card | |
| `--wc-color-danger` / `-soft` | `#C41B1B` / `#FEE2E2` | `--destructive`, refusal | |
| `--wc-color-info` / `-soft` | `#1B4F8A` / `#DBEAFE` | Info card | |

### 3.2 Typography

| Token | Value | Notes |
| --- | --- | --- |
| `--wc-font-sans` | `"Inter", "Noto Sans Arabic", system-ui, …` | Default |
| `--wc-font-arabic` | `"Noto Sans Arabic", "Inter", system-ui, …` | RTL surfaces |
| `--wc-font-mono` | `"JetBrains Mono", ui-monospace, …` | Hashes, MRN, OTP cells |
| `--wc-font-size-{xs..2xl}` | `0.75rem → 1.5rem` | 8-step scale |
| `--wc-font-weight-{normal,medium,semibold,bold}` | `400 / 500 / 600 / 700` | |
| `--wc-line-height-{tight,snug,normal,relaxed}` | `1.25 / 1.375 / 1.5 / 1.625` | |

Note: fonts are **not** auto-loaded from Google Fonts by the scaffold —
the parent app is responsible for the font-loading strategy. The
fallback stack guarantees readable rendering if the webfont is absent.

### 3.3 Spacing, radius, elevation, motion

| Group | Tokens | Source |
| --- | --- | --- |
| Spacing (4-pt grid) | `--wc-space-{1..12}` | Implicit from Figma `gap-2`/`p-4`/`p-5` patterns |
| Radius | `--wc-radius-{sm,md,lg,xl,pill}` (base `0.5rem`) | `theme.css --radius` |
| Elevation | `--wc-shadow-{sm,md,lg}` | Tailwind `shadow-sm` analogue, recoloured for `#0D1B2A` ink |
| Motion | `--wc-motion-{fast,base}`, `--wc-motion-easing` | `120ms / 200ms / cubic-bezier(0.2,0.8,0.2,1)` |
| Focus ring | `--wc-focus-ring` | 2 px bg + 2 px `--wc-color-primary` (WCAG 2.1 AA contrast) |
| Reduced motion | Honoured via `@media (prefers-reduced-motion: reduce)` | A11y compliance |

---

## 4. Components created

All under [apps/web/src/components/ui-refresh/](../apps/web/src/components/ui-refresh/).
Every export is **client-side**, **stateless** except where noted, and
exposes localised strings via props (no hardcoded medical copy).

| Component | File | Maps to Figma reference | State |
| --- | --- | --- | --- |
| `UIRefreshBoundary` | [UIRefreshBoundary.tsx](../apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx) | Token scope wrapper | Stateless |
| `StepIndicatorV11` | [StepIndicatorV11.tsx](../apps/web/src/components/ui-refresh/StepIndicatorV11.tsx) | `StepIndicator` (App.tsx ~L262) | Stateless |
| `TrustBanner` | [TrustBanner.tsx](../apps/web/src/components/ui-refresh/TrustBanner.tsx) | `SecureNoticeBadge` (~L287) | Stateless |
| `PatientHeroSection` | [PatientHeroSection.tsx](../apps/web/src/components/ui-refresh/PatientHeroSection.tsx) | `LandingScreen` header (~L420) | Stateless |
| `ProcedureSummaryCard` | [ProcedureSummaryCard.tsx](../apps/web/src/components/ui-refresh/ProcedureSummaryCard.tsx) | Landing consent-info card (~L432) | Stateless |
| `EducationCard` | [EducationCard.tsx](../apps/web/src/components/ui-refresh/EducationCard.tsx) | Education card primitive (~L490) | Stateless |
| `WhatToExpectCard` | [WhatToExpectCard.tsx](../apps/web/src/components/ui-refresh/WhatToExpectCard.tsx) | Adapted from "What is" card (~L490) | Stateless |
| `RiskBenefitCards` | [RiskBenefitCards.tsx](../apps/web/src/components/ui-refresh/RiskBenefitCards.tsx) | Benefits + Risks pair (~L500–L545) | Stateless |
| `FAQAccordion` | [FAQAccordion.tsx](../apps/web/src/components/ui-refresh/FAQAccordion.tsx) | FAQ card (~L560) | Internal `openId` (controllable) |
| `OTPVisualPanel` | [OTPVisualPanel.tsx](../apps/web/src/components/ui-refresh/OTPVisualPanel.tsx) | `OTPScreen` (~L860) | **Controlled — visual only** |
| `SignatureVisualPanel` | [SignatureVisualPanel.tsx](../apps/web/src/components/ui-refresh/SignatureVisualPanel.tsx) | `SignatureScreen` (~L960) | **Controlled — visual only** |
| `ConfirmationCard` | [ConfirmationCard.tsx](../apps/web/src/components/ui-refresh/ConfirmationCard.tsx) | `ConfirmationScreen` (~L1050) | Stateless |

Barrel export: [index.ts](../apps/web/src/components/ui-refresh/index.ts).

### Component contract — OTP and Signature panels

These two components render the **visual shell only** and explicitly do
not own the OTP or signature pipeline:

- They expose `value`/`onChange`, `onVerify`, `onResend`, `onConfirm`,
  `onStrokeStart`, `onStrokeEnd`, `onClear` props that the caller wires
  to the **existing** API surface.
- They do **not** generate codes, hashes, timestamps, certificates, or
  audit events.
- They do **not** persist or transmit user input.
- They have **no default action handlers**, so a caller cannot
  accidentally bypass the real pipeline.

A component-level docblock at the top of each file reaffirms these
constraints for future contributors.

---

## 5. Screens affected

| Screen | First-integration scope | Status |
| --- | --- | --- |
| Patient landing | Visual upgrade only (hero + identity + summary + trust banner) | **Scaffolded — not yet wired** |
| Patient education | Visual section scaffold (cards + FAQ + risk/benefit) | **Scaffolded — not yet wired** |
| Step indicator | Visual improvement | **Scaffolded — not yet wired** |
| Consent review | Out of scope this phase | Untouched |
| Decision (accept / refuse) | Out of scope this phase | Untouched |
| OTP | Visual shell only — exposed but **not wired** | Scaffolded |
| Signature | Visual shell only — exposed but **not wired** | Scaffolded |
| Confirmation | Visual shell only — exposed but **not wired** | Scaffolded |

> **Important:** the components are created but are **not yet rendered**
> by any production page. The existing routes
> `/sign/[token]/workflow` and `/modules/informed-consents/create`
> continue to render their current trees under `UIRefreshBoundary`,
> which is a pass-through fragment while the flag is `false`.
>
> Wiring the scaffolded components into the legacy render trees is a
> **subsequent gated commit** that requires:
> 1. Side-by-side visual approval on a Vercel preview with the flag on.
> 2. v1.0.1 11-check smoke parity confirmed.
> 3. Explicit user approval.

---

## 6. Validation checklist

| Check | How | Result |
| --- | --- | --- |
| Tokens are scoped to `[data-ui-refresh="v1.1"]` | Code review of [ui-refresh-v1.1.css](../apps/web/src/styles/ui-refresh-v1.1.css) | ✅ — single selector, no globals |
| Boundary is inert when flag is off | Code review of [UIRefreshBoundary.tsx](../apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx) | ✅ — returns `<>{children}</>` |
| No new global CSS rules | grep `:root`, `body`, `html` outside scope | ✅ |
| No backend / API / schema files modified | `git diff --name-only` | ✅ — only `apps/web/src/components/ui-refresh/**`, `apps/web/src/styles/ui-refresh-v1.1.css`, `design/figma/**`, and this doc |
| No OTP/signature/audit/evidence/secure-link/sequencing files modified | path scan | ✅ |
| TypeScript clean for new files | language service | ✅ — all 11 components + index + utils clean |
| A11y: focus ring uses scoped token | Code review | ✅ — `var(--wc-focus-ring)` on interactive elements |
| A11y: ARIA attributes valid | language service | ✅ — `aria-expanded`, `aria-controls`, `aria-label`, `role` present |
| RTL: every flex row honours `lang === "ar"` | Code review | ✅ — via `rowDir()` helper |
| High contrast: text on backgrounds | Visual check vs. tokens | ✅ — `#0D1B2A` on `#F0F4F8` ≈ 16:1; `#FFFFFF` on `#1B4F8A` ≈ 9.6:1 |
| No medical-advice copy hardcoded | Code review | ✅ — every string is a prop |
| No legal-wording hardcoded | Code review | ✅ — no consent body text, no eIDAS / PDPL clauses inside the components |

### Manual preview validation (when caller wires a screen)

When (and only when) a future commit wires these into an existing
screen, run on a Vercel preview:

1. Default state (`FEATURE_UI_REFRESH_V1_1=false`): DOM matches the
   pre-flag baseline byte-for-byte.
2. Flag on: only the targeted surface renders with v1.1 tokens.
   Adjacent surfaces are unchanged.
3. v1.0.1 11-check smoke against the same preview confirms hash
   continuity for OTP, signature, audit, evidence, PDF.
4. RTL pass — both languages.
5. Keyboard-only pass — Tab order, focus rings, Enter/Space activate
   accordion + buttons.
6. Reduced-motion pass — accordion still functions; transition
   durations clamp to 0.

---

## 7. Rollback plan

This phase is fully rollback-safe at three levels:

1. **Hot configuration:** set `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=false`
   (default) — the boundary returns a pass-through fragment and the
   scoped CSS is inert. No code change required.
2. **Code-level revert:** revert the commit — eight component files,
   token CSS, and this doc are removed. The unrelated `design/figma/`
   import folder is preserved as a reference artefact.
3. **Schema / migration:** none touched, nothing to roll back.

---

## 8. If the export had been insufficient

The brief required: "if the ZIP does not contain usable code or
tokens, do not guess. Create the component scaffold and mapping
document, then ask for screenshots or token JSON."

The export **was** sufficient: it contained both a complete
`theme.css` token set and a 1,460-line component reference covering
all six patient screens, the physician dashboard, and the legal
panel. No design guessing was required for tokens (§3) or layout (§4).

---

## 9. Change log

| Date | Author | Change |
| --- | --- | --- |
| 2026-05-27 | Pilot UI Integration | Initial Figma → code mapping. Scoped tokens populated from `theme.css`. Eleven presentational components scaffolded under `apps/web/src/components/ui-refresh/`. Flag remains OFF; no production page wiring in this commit. |
