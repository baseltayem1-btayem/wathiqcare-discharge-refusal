# UI Integration Changelog — v1.1 (Figma Design Refresh)

**Feature flag:** `FEATURE_UI_REFRESH_V1_1` (env: `NEXT_PUBLIC_FF_UI_REFRESH_V1_1`)
**Default:** `OFF` (legacy UI unchanged)
**Branch:** `phase24-evidence-package-final`
**Status:** SCAFFOLD ONLY — no visual changes ship to users yet.

---

## 1. Intent

Safely integrate the approved Figma design system into the existing
WathiqCare informed-consent issuance flow and the public patient-signing
workflow, **without touching any production legal workflow code**.

This first commit lands only the safe rails:

1. A build-time feature flag that defaults to OFF.
2. A CSS variable token layer scoped under `[data-ui-refresh="v1.1"]`
   so it is inert unless explicitly mounted.
3. A `UIRefreshBoundary` client wrapper that mounts the scope at the
   route entry points for the two in-scope surfaces.

When `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` is unset/`false`, **every byte of
the rendered DOM and behaviour is identical to v1.0.1**.

---

## 2. Safety guarantees

| Surface | State |
| --- | --- |
| OTP request / validation logic | UNCHANGED |
| Public signing workflow logic (`PublicSigningWorkflow.tsx`) | UNCHANGED |
| Audit chain emitters | UNCHANGED |
| Evidence-package generation | UNCHANGED |
| Secure-link validation (`getSigningTokenContext`) | UNCHANGED |
| Legal sequencing / step gating | UNCHANGED |
| Backend API routes / payload contracts | UNCHANGED |
| Prisma schema / migrations | UNCHANGED |
| Consent-type registry & restriction (v1.0.1) | UNCHANGED |

The boundary wrapper is presentation-only: when disabled it renders
a `<>{children}</>` fragment; when enabled it renders a single
`<div data-ui-refresh="v1.1">` around the existing tree. No props,
state, or render order of child components is altered.

---

## 3. Scope (v1.1)

In scope for visual refresh (styling-only, behind the flag):

- Issuance flow (`/modules/informed-consents/create`)
  - Header, patient info card, consent type selector
  - Workflow stepper visuals
  - Education screens (Phase 22 content panels)
  - Consent review / medical explanation form
  - Signature panel visuals
  - Legal readiness card
- Public signing workflow (`/sign/[token]/workflow`)
  - Education screens
  - Consent review
  - OTP UI (input + resend affordance — **no logic change**)
  - Signature UI (canvas frame, instructions — **no capture change**)
  - Confirmation screen

Explicitly out of scope: anything that mutates server state, anything
that touches OTP/signing/audit/evidence/secure-link/legal sequencing.

---

## 4. Files added

| Path | Purpose |
| --- | --- |
| `apps/web/src/lib/config/ui-refresh-flag.ts` | Build-time flag reader. Exports `FEATURE_UI_REFRESH_V1_1`, `UI_REFRESH_ATTR`, `UI_REFRESH_ATTR_VALUE`. |
| `apps/web/src/styles/ui-refresh-v1.1.css` | Token layer (colour, type, spacing, radii, elevation, motion, focus ring, RTL hook, reduced-motion). Selectors scoped to `[data-ui-refresh="v1.1"]`. |
| `apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx` | Client wrapper. Pass-through fragment when flag is off. |
| `pilot-package/UI_INTEGRATION_CHANGELOG.md` | This document. |

## 5. Files modified

| Path | Change |
| --- | --- |
| `apps/web/app/modules/informed-consents/create/page.tsx` | Wraps `<InformedConsentsModulePageNew>` in `<UIRefreshBoundary surface="issuance">`. No prop, auth, or access-control change. |
| `apps/web/app/sign/[token]/workflow/page.tsx` | Wraps `<PublicSigningWorkflow>` in `<UIRefreshBoundary surface="public-signing">`. Secure-link validation order and `notFound()` handling preserved. |

No other files touched in this commit.

---

## 6. Activation matrix

| Environment | Flag value | Effect |
| --- | --- | --- |
| Local dev | Unset (default) | Legacy UI |
| Local dev | `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=1` | Boundary mounts; tokens load (no component opts in yet → still visually equivalent until next commit). |
| Vercel preview | Set per-preview only | Designer + QA review |
| Vercel staging | Unset | Legacy UI |
| Production | **Unset — DO NOT enable** | Legacy UI |

Per project policy: **no production exposure** of this flag until all
gates in §7 are green.

---

## 7. Required validation gates (before any production enablement)

| Gate | How verified |
| --- | --- |
| **G1 — Regression: existing component tests** | `pnpm --filter @wathiqcare/web test` (or workspace runner) green with flag ON and flag OFF. |
| **G2 — Smoke: 11-check production harness** | Run the v1.0.1 pilot smoke against a preview with the flag ON. Zero deviation from baseline. |
| **G3 — Smoke: OTP request → verify → sign → finalize** | End-to-end on a preview token. No OTP regressions. No audit-chain gaps. |
| **G4 — Smoke: secure-link validation** | Expired / tampered / replayed tokens still fail closed exactly as before. |
| **G5 — Smoke: evidence-package generation** | Generated PDF + sidecar bytes match the v1.0.1 sample for an identical input. |
| **G6 — Mobile validation** | Issuance + signing on iPad Safari and Android Chrome at 360/768/1024 widths. |
| **G7 — RTL validation** | Page rendered with `dir="rtl"` Arabic locale; layout mirrors, no clipped controls, no LTR leakage. |
| **G8 — Accessibility** | axe-core or Lighthouse a11y on both surfaces; focus order preserved; focus ring visible; `prefers-reduced-motion` honoured. |
| **G9 — Legal sequencing** | Education → review → OTP → signature → confirmation order unchanged; step gating verified via DOM snapshot diff between flag-on and flag-off renders. |

---

## 8. Rollback plan

This phase is rollback-safe by construction:

1. **Per-environment kill switch:** unset `NEXT_PUBLIC_FF_UI_REFRESH_V1_1`
   (or set it to `0`). Boundary becomes a fragment again on next render
   cycle / next build. No data, no state, no migration involved.
2. **Code-level revert:** revert the commit. The four added files and
   the two wrapper edits are isolated; nothing depends on them.
3. **Hot rollback:** if a production deployment ever ships with the
   flag accidentally enabled, redeploy the prior successful build —
   no schema, secret, or API contract change is needed.

---

## 9. Change log

| Date | Author | Change |
| --- | --- | --- |
| 2026-05-27 | Pilot Stabilization | Initial scaffold: flag, token layer, boundary, two route wraps. Default OFF. |

---

## 10. Next steps (out of this commit)

- Import the Figma token export and replace the placeholder values in
  `ui-refresh-v1.1.css`.
- Progressively opt-in individual presentation components (Header,
  ConsentTypeSelector, WorkflowStepper, OTP input visuals, signature
  canvas frame, confirmation card) by consuming `var(--wc-*)` tokens.
- Capture before/after screenshots per surface for the design review.
- Run gates G1–G9 on a Vercel preview; record results in this file.
