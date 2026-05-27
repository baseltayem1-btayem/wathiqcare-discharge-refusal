# UI Refresh v1.1 — Re‑Enable Validation Report

Date: 2026-05-27
Branch: `phase24-evidence-package-final`
Source commit: `28403cc` (Safari hotfix HEAD)
New production deployment: **`wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app`** (alias `wathiqcare.online`)

## 1. Background

Prior v1.1 promotion was performed via `vercel redeploy` against the same build artifact after adding the production env flag. A subsequent investigation revealed `vercel env pull` returned `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=""` for the production scope, so the inlined value in the build was empty and the flag reader at [apps/web/src/lib/config/ui-refresh-flag.ts](apps/web/src/lib/config/ui-refresh-flag.ts) evaluated to `false`. v1.1 surfaces were effectively off in production.

This report records the **source‑true rebuild** that re‑enables v1.1.

## 2. Env operations performed

| Step | Command | Result |
|---|---|---|
| Remove existing entry | `vercel env rm NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --scope wathiqcare --yes` | Removed |
| Recreate with value `1` | `vercel env add NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --scope wathiqcare --value 1 --yes` | `Added Environment Variable NEXT_PUBLIC_FF_UI_REFRESH_V1_1 to Project wathiqcare-discharge-refusal` |
| List confirmation | `vercel env ls production --scope wathiqcare` | `NEXT_PUBLIC_FF_UI_REFRESH_V1_1 Encrypted Production <age>` |

> **CLI note.** `vercel env pull` for the production environment continued to render `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=""` for the new value, but the inlined value in the production build is `1` (see §4 DOM proof). Treat `vercel env pull` for `NEXT_PUBLIC_*` as advisory only in the current CLI version; the authoritative test is the rendered DOM.

The `--value <V> --yes` invocation is the non‑interactive method that bypasses the stdin trimming behaviour we observed with PowerShell pipes (which appended newlines/whitespace and produced an empty stored value on prior attempts).

## 3. Source‑true rebuild

```
vercel deploy --prod --scope wathiqcare --yes
```

| Field | Value |
|---|---|
| Source commit | `28403cc` (Safari hotfix HEAD on `phase24-evidence-package-final`) |
| Deployment URL | `https://wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app` |
| Production alias | `https://wathiqcare.online` (and `www.`, `api.`, project aliases) |
| Build time | Completed in 1m |
| Ready time | 2m |
| Build log | [docs/production/ui-refresh-reenable-deploy.log](docs/production/ui-refresh-reenable-deploy.log) |
| Supersedes | `wathiqcare-discharge-refusal-gvz0l5kif-wathiqcare.vercel.app` |

**Not** a `vercel redeploy` — this is a fresh build from source, so the new env value is inlined at build time.

## 4. DOM marker proof (post‑rebuild)

Token: `xYonm4RoYnXH9u3CDNGxFB6lPB131oRS5md2zWkP-Ko` → `/sign/<token>/workflow` (+`?lang=ar` for AR).

Driver: [__ui_refresh_reenable_walkthrough.cjs](__ui_refresh_reenable_walkthrough.cjs).
Aggregate: [docs/production/ui-refresh-reenable/reenable-walkthrough.json](docs/production/ui-refresh-reenable/reenable-walkthrough.json).

| Browser | Device / Viewport | Locale | `data-ui-refresh="v1.1"` count | `data-ui-surface` | `<html dir>` | `<html lang>` | Screenshot |
|---|---|---|---|---|---|---|---|
| WebKit (Safari) | iPhone 14 | en-US | **1** | `public-signing` | `ltr` | `en` | [workflow-safari-iphone14-en.png](docs/production/ui-refresh-reenable/workflow-safari-iphone14-en.png) |
| WebKit (Safari) | iPhone 14 | ar-SA | **1** | `public-signing` | `rtl` | `ar` | [workflow-safari-iphone14-ar.png](docs/production/ui-refresh-reenable/workflow-safari-iphone14-ar.png) |
| Chromium | Pixel 7 | en-US | **1** | `public-signing` | `ltr` | `en` | [workflow-android-pixel7-en.png](docs/production/ui-refresh-reenable/workflow-android-pixel7-en.png) |
| Chromium | Pixel 7 | ar-SA | **1** | `public-signing` | `rtl` | `ar` | [workflow-android-pixel7-ar.png](docs/production/ui-refresh-reenable/workflow-android-pixel7-ar.png) |
| Chromium | Desktop 1280×800 | en-US | **1** | `public-signing` | `ltr` | `en` | [workflow-desktop-1280-en.png](docs/production/ui-refresh-reenable/workflow-desktop-1280-en.png) |
| Chromium | Desktop 1280×800 | ar-SA | **1** | `public-signing` | `rtl` | `ar` | [workflow-desktop-1280-ar.png](docs/production/ui-refresh-reenable/workflow-desktop-1280-ar.png) |

Marker source: `<UIRefreshBoundary data-ui-surface="public-signing">` in [apps/web/src/components/modules/PublicSigningWorkflow.tsx](apps/web/src/components/modules/PublicSigningWorkflow.tsx) gated on `FEATURE_UI_REFRESH_V1_1` from [apps/web/src/lib/config/ui-refresh-flag.ts](apps/web/src/lib/config/ui-refresh-flag.ts). v1.1 CSS in [apps/web/src/styles/ui-refresh-v1.1.css](apps/web/src/styles/ui-refresh-v1.1.css).

## 5. Negative checks (out‑of‑scope surfaces unchanged)

| Surface | URL | Marker count | Screenshot |
|---|---|---|---|
| Homepage | `https://wathiqcare.online/` | **0** | [negative-home.png](docs/production/ui-refresh-reenable/negative-home.png) |
| Dashboards | `https://wathiqcare.online/dashboards` | **0** | [negative-dashboards.png](docs/production/ui-refresh-reenable/negative-dashboards.png) |

Homepage and dashboards remain unchanged — v1.1 is scoped to `public-signing` only.

## 6. OTP / session hotfix regression — PASS

Re‑ran [__hotfix_verify_otp_cookie.cjs](__hotfix_verify_otp_cookie.cjs) against build `i866h3wek` with the same prod token. The `verify-otp` route still emits:

```
Set-Cookie: wathiqcare_public_signing_session=<jwt>; Path=/; Expires=Wed, 27 May 2026 21:46:18 GMT; Max-Age=1797; Domain=.wathiqcare.online; Secure; HttpOnly; SameSite=lax
```

Cookie flag matrix: `HttpOnly=true`, `Secure=true`, `SameSite=lax`, `Domain=.wathiqcare.online`, `Path=/`, `Max-Age=1797`. iPhone Safari continuity is preserved. Evidence: [docs/production/ui-refresh-reenable/cookie-recheck.json](docs/production/ui-refresh-reenable/cookie-recheck.json).

## 7. Phase17 production smoke — PASS (10/10)

`__phase17_smoke.ps1` against `https://wathiqcare.online` with MRN `IMC-2026-02000`:

| Step | Result |
|---|---|
| 1 — Login (admin) | PASS |
| 2 — Create page | PASS |
| 3+4 — Templates | PASS (19 templates) |
| 5 — Generate draft | PASS (HTTP 200, docId `9bbf3931-7cbe-4fd8-ba06-5f88ba38b3ac`, status `DRAFT`) |
| 6 — Document detail | PASS |
| 7 — Draft PDF | PASS (`application/pdf`, 224 095 bytes) |
| 8a — Timeline | PASS |
| 8b — Signature endpoint reachable | PASS |
| 9 — Secure‑signing endpoint reachable | PASS |
| 10 — Evidence‑package endpoint reachable | PASS |

Evidence: [pilot-evidence/2026-05-27-ui-refresh-reenable-smoke.json](pilot-evidence/2026-05-27-ui-refresh-reenable-smoke.json).

## 8. Summary of acceptance criteria

| Criterion | Status |
|---|---|
| Prod env entry `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` removed | ✅ |
| Recreated with exact value `1` | ✅ |
| Source‑true rebuild (`vercel deploy --prod`, not `redeploy`) | ✅ |
| `/sign/<token>/workflow` shows `data-ui-refresh="v1.1"` | ✅ (6/6 captures) |
| `data-ui-surface="public-signing"` present | ✅ |
| EN + AR rendering with correct `dir`/`lang` | ✅ |
| Mobile widths (iPhone 14, Pixel 7) | ✅ |
| Homepage unchanged | ✅ (marker=0) |
| Dashboards unchanged | ✅ (marker=0) |
| OTP/session hotfix still operational | ✅ |
| Safari validation still passes | ✅ (Safari + Pixel + Desktop EN/AR all marker=1; cookie still HttpOnly+Secure+lax+`.wathiqcare.online`) |

## 9. Rollback procedure

To roll back the v1.1 re‑enable without reverting source:

```powershell
# 1. Disable the flag (build will inline empty next time)
vercel env rm NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --scope wathiqcare --yes

# 2. Repoint production aliases to the prior Safari‑hotfix build (still has hotfix, no v1.1):
vercel alias set wathiqcare-discharge-refusal-gvz0l5kif-wathiqcare.vercel.app wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-gvz0l5kif-wathiqcare.vercel.app www.wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-gvz0l5kif-wathiqcare.vercel.app api.wathiqcare.online --scope wathiqcare
```

To re‑apply: `vercel env add NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --scope wathiqcare --value 1 --yes` then `vercel deploy --prod --scope wathiqcare --yes` and re‑alias.

## 10. Cross‑references

- [PRODUCTION_PROMOTION_REPORT.md](docs/production/PRODUCTION_PROMOTION_REPORT.md) — promotion lineage updated with `i866h3wek` row
- [SAFARI_HOTFIX_VALIDATION.md](SAFARI_HOTFIX_VALIDATION.md) — prior Safari hotfix validation (still in force)
- [__ui_refresh_reenable_walkthrough.cjs](__ui_refresh_reenable_walkthrough.cjs) — Playwright driver
- [docs/production/ui-refresh-reenable/](docs/production/ui-refresh-reenable/) — screenshots, walkthrough JSON, cookie recheck, deploy log
