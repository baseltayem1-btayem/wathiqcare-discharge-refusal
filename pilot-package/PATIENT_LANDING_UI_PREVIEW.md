# Patient Landing UI Preview — v1.1 Controlled Wiring

**Phase:** Controlled First UI Wiring (Patient Landing only)
**Branch:** `phase24-evidence-package-final`
**Feature flag:** `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` (default **OFF**)
**Status:** Preview-only / local development. **Not pushed. Not deployed.**
**Related:**
[FIGMA_TO_CODE_MAPPING.md](FIGMA_TO_CODE_MAPPING.md),
[UI_INTEGRATION_CHANGELOG.md](UI_INTEGRATION_CHANGELOG.md),
[PRODUCTION_ISSUANCE_ROUTE_AUDIT.md](PRODUCTION_ISSUANCE_ROUTE_AUDIT.md)

---

## 1. Scope

| In scope | Out of scope (intentionally) |
| --- | --- |
| Patient landing / home visual block at `/sign/[token]/workflow` | Education content rendering |
| Step indicator visual (`StepIndicatorV11`) | OTP request / verify pipeline |
| Hero header (`PatientHeroSection`) | Decision capture (accept / refuse) |
| Trust banner (`TrustBanner`) | Signature capture (`TabletSignaturePad` untouched) |
| Procedure summary card (`ProcedureSummaryCard`) | Confirmation card |
| Process preview (`WhatToExpectCard`) | Audit chain, evidence generation, secure-link validation |

Only the **top of the page** (the step indicator and the welcome header)
is swapped. Everything below — `Educational Materials Status`, education
detail, decision, OTP, signature, refusal, confirmation — continues to
render its legacy markup with no behavioural changes.

The patient landing visual is wired through a single conditional in
[apps/web/src/components/modules/PublicSigningWorkflow.tsx](../apps/web/src/components/modules/PublicSigningWorkflow.tsx)
and is rendered by
[apps/web/src/components/modules/public-signing/PatientLandingV11.tsx](../apps/web/src/components/modules/public-signing/PatientLandingV11.tsx).

---

## 2. Flag behaviour

| Flag value | Behaviour |
| --- | --- |
| `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` unset / `false` / `0` / `off` | **Legacy landing** rendered. Identical to pre-wiring DOM and CSS. |
| `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=1` (or `true`/`on`) | v1.1 landing block replaces the legacy step indicator + header section. All downstream stages (education, decision, OTP, signature, confirmation) remain on legacy markup. |

The flag is read at module load by
[apps/web/src/lib/config/ui-refresh-flag.ts](../apps/web/src/lib/config/ui-refresh-flag.ts).
The wrapper at
[apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx](../apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx)
applies the scoped `data-ui-refresh="v1.1"` attribute that activates the
token CSS in
[apps/web/src/styles/ui-refresh-v1.1.css](../apps/web/src/styles/ui-refresh-v1.1.css).

---

## 3. Components wired

| Component | Role on landing | File |
| --- | --- | --- |
| `StepIndicatorV11` | Pill stepper showing current step of total | [StepIndicatorV11.tsx](../apps/web/src/components/ui-refresh/StepIndicatorV11.tsx) |
| `PatientHeroSection` | Title + bilingual subtitle (consent reference · version label) | [PatientHeroSection.tsx](../apps/web/src/components/ui-refresh/PatientHeroSection.tsx) |
| `TrustBanner` | Lock badge + privacy/encryption message | [TrustBanner.tsx](../apps/web/src/components/ui-refresh/TrustBanner.tsx) |
| `ProcedureSummaryCard` | Procedure label/value with physician and reference rows | [ProcedureSummaryCard.tsx](../apps/web/src/components/ui-refresh/ProcedureSummaryCard.tsx) |
| `WhatToExpectCard` | Ordered process preview built from the live `stages[]` | [WhatToExpectCard.tsx](../apps/web/src/components/ui-refresh/WhatToExpectCard.tsx) |

All five are pure presentational. None of them mutates state, calls an
API, or owns OTP / signature / audit / evidence concerns.

---

## 4. Preserved invariants

The following are guaranteed unchanged by this commit:

| Concern | How it is preserved |
| --- | --- |
| Routes | `/sign/[token]/page.tsx` redirect to workflow is untouched; `/sign/[token]/workflow/page.tsx` still calls `getSigningTokenContext` and renders `<PublicSigningWorkflow token={token} />`. |
| APIs | No file under `apps/web/app/api/**`, `apps/web/src/lib/server/**`, or `apps/api/**` is modified. |
| OTP flow | `requestOtp` / `verifyOtp` handlers, OTP state, and timers are untouched. |
| Audit chain | `PATIENT_SIGNATURE_CAPTURED`, education ack, decision ack writes are not in this diff. |
| Evidence logic | Evidence event/package emission paths are not in this diff. |
| Secure-link validation | `getSigningTokenContext` server call still gates entry. |
| State management | `PublicSigningWorkflow` continues to own all `useState`/`useEffect` hooks. No state moved into `PatientLandingV11`. |
| Stage computation | The `stages[]` / `currentIndex` IIFE is unchanged — both the legacy and v1.1 paths consume the same computed values. |
| Refusal path | `isRefusalPath` branches in `stages[]` apply equally; the v1.1 landing reflects them via `WhatToExpectCard.items`. |

---

## 5. Validation matrix

Run on `localhost:3010` (or the local Next dev port) against a fresh
secure-link token. Default state validates legacy parity; flag-on state
validates the visual upgrade.

### 5.1 Functional no-regression (flag OFF)

| Check | Pass criterion |
| --- | --- |
| Default flag value | `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` unset → boundary returns `<>{children}</>` |
| DOM of legacy step indicator section | Present, identical class names (`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`) |
| DOM of legacy header section | Present, identical class names and inline text |
| Educational Materials Status section | Renders unchanged |
| Decision, OTP, signature, confirmation paths | Render unchanged |
| 11-check v1.0.1 smoke | All eleven checks pass (no regression vs `b61c457`) |

### 5.2 Visual upgrade (flag ON)

Set `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=1` in `apps/web/.env.local` and
restart `next dev`.

| Check | Pass criterion |
| --- | --- |
| Scope attribute | The landing block lives inside `[data-ui-refresh="v1.1"][data-ui-surface="public-signing"]` (set by `UIRefreshBoundary` on `/sign/[token]/workflow/page.tsx`) |
| Token isolation | No element outside that scope changes appearance |
| `StepIndicatorV11` | Pill bar with `Step N of M` text; current step is the widest pill in `--wc-color-primary` |
| `PatientHeroSection` | Navy rounded icon tile + bilingual title (en primary, ar subtitle for English visitor; swapped for Arabic) |
| `TrustBanner` | Lock icon + supplied message, `role="status"` |
| `ProcedureSummaryCard` | Procedure label/value + physician + reference rows with dividers |
| `WhatToExpectCard` | Numbered list of `stages[]` (e.g. 1. Education, 2. Consent Review, …) |
| Legacy step indicator + header | **Hidden** when flag is on |
| Everything below the landing | Still renders the existing layout (educational materials status, decision, OTP, signature, confirmation) |

### 5.3 Responsive / mobile

| Viewport | Check |
| --- | --- |
| 360 × 640 (iPhone SE) | All five cards stack; no horizontal scroll; tap targets ≥ 44 px |
| 414 × 896 (iPhone 11) | Hero text wraps cleanly; physician + reference rows do not overflow |
| 768 × 1024 (iPad portrait) | `ProcedureSummaryCard` rows remain single-column; step indicator wraps gracefully |
| 1280 × 800 (laptop) | Whole landing block sits at `max-w-5xl`, centred |

### 5.4 Accessibility

| Check | Pass criterion |
| --- | --- |
| Step indicator | `role="group"` + `aria-label="Step N of M"` |
| Trust banner | `role="status"` |
| Hero heading | Exactly one `<h1>` per page (replacement preserves the single-h1 invariant) |
| Focus ring | Tab cycles through visible focusable elements with the `--wc-focus-ring` indicator |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` clamps transitions to 0 ms |
| Colour contrast | Body text on `--wc-color-bg` ≈ 16:1; CTA text on `--wc-color-primary` ≈ 9.6:1 |
| Keyboard navigation | All interactive landing elements reachable; existing keyboard flow for downstream stages unchanged |

### 5.5 RTL

| Check | Pass criterion |
| --- | --- |
| Set browser locale or `lang` prop to `ar` | Cards switch alignment via `textAlign("ar")` and `rowDir("ar")` |
| Bidirectional titles | Arabic title becomes primary heading; English becomes subtitle |
| Icons | Lock and Stethoscope/Building flip to the leading edge of the row |
| Numerals | Step indicator continues to render Arabic-Indic acceptable digits (renderer-driven) |

### 5.6 Recommended screenshots

Embed the following screenshots when running the manual validation pass:

- `docs/preview/landing-legacy-en.png` — Flag OFF, English, desktop
- `docs/preview/landing-v11-en.png` — Flag ON, English, desktop
- `docs/preview/landing-v11-ar.png` — Flag ON, Arabic, desktop
- `docs/preview/landing-v11-mobile.png` — Flag ON, 360 × 640
- `docs/preview/landing-v11-tablet.png` — Flag ON, 768 × 1024

> Screenshots were not captured by this commit; the operator running
> the preview validation should capture them on the local Vercel/Next
> dev server and attach them to the PR before the next gated commit
> (Education wiring). Capturing them here would require running the
> dev server and an OTP-bearing token, which is out of scope for a
> code-only commit.

---

## 6. Manual validation steps

```powershell
# 1. From repo root
cd C:\work\wathiqcare-discharge-refusal-main\apps\web

# 2. Confirm flag is OFF (default)
Get-Content .env.local | Select-String "NEXT_PUBLIC_FF_UI_REFRESH_V1_1"
# Expect: no match (default OFF).

# 3. Start dev server
pnpm dev    # or: npm run dev

# 4. Open the workflow page with a valid token in a browser
#    http://localhost:3010/sign/<TOKEN>/workflow

# 5. Visual baseline: confirm the legacy step indicator + WathiqCare
#    Secure Sign header are present. Capture screenshot.

# 6. Enable the flag for the preview only
Add-Content -Path .env.local -Value "`nNEXT_PUBLIC_FF_UI_REFRESH_V1_1=1"

# 7. Restart dev server, hard-refresh the workflow URL.

# 8. Confirm v1.1 landing block: StepIndicatorV11, PatientHeroSection,
#    TrustBanner, ProcedureSummaryCard, WhatToExpectCard. Capture
#    screenshot.

# 9. Toggle locale to ar (browser language or future lang prop) and
#    confirm RTL layout. Capture screenshot.

# 10. Run the 11-check v1.0.1 smoke against the same token to confirm
#     OTP/signing/audit/evidence behaviour is unchanged.
```

---

## 7. Rollback plan

This wiring is **fully reversible at three levels**:

1. **Configuration rollback (no code change).** Set
   `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=` (empty) or remove it from
   `apps/web/.env.local`, restart the dev server. The boundary
   returns a pass-through fragment and the legacy step indicator +
   header render exactly as before. The wiring code paths are
   compiled but inert.
2. **Code rollback (revert this commit).** `git revert <hash>` of the
   "wire v1.1 landing" commit restores the previous file states
   verbatim. The components in `apps/web/src/components/ui-refresh/`
   and the design import remain in place for the next attempt.
3. **Repository rollback (revert the whole UI-refresh thread).** Revert
   the three commits in order: this commit, `fc64713`
   (mapping/scaffold), and `26b170b` (boundary scaffold). The repo
   returns to the v1.0.1 baseline.

No database, no API, no audit, no evidence rollback is required because
none of those surfaces were modified.

---

## 8. Files changed in this commit

| Path | Change |
| --- | --- |
| [apps/web/src/components/modules/public-signing/PatientLandingV11.tsx](../apps/web/src/components/modules/public-signing/PatientLandingV11.tsx) | **NEW** — composes the five v1.1 components into a landing block |
| [apps/web/src/components/modules/PublicSigningWorkflow.tsx](../apps/web/src/components/modules/PublicSigningWorkflow.tsx) | Added flag import + conditional render of v1.1 landing vs legacy step indicator + header. No other lines changed. |
| [pilot-package/PATIENT_LANDING_UI_PREVIEW.md](PATIENT_LANDING_UI_PREVIEW.md) | This document. |

No schema, API, or env-var changes. The flag stays OFF in every
environment until explicitly approved.
