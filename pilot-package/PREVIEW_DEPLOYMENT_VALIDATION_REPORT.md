# Preview Deployment Validation Report — UI Refresh v1.1

**Phase:** Controlled Preview Promotion for UI Refresh v1.1
**Status:** ✅ Preview deployed and validated · ⛔ Production NOT promoted (awaiting explicit approval)
**Date:** 2026-05-27

---

## 1 · Deployment Summary

| Field | Value |
|---|---|
| Vercel project | `wathiqcare-discharge-refusal` |
| Project ID | `prj_oOa9MNAgdTmotVhMp5Ycm0eelTfH` |
| Org ID | `team_sy7GOXxxlDtaXVVXHbLxEK0F` |
| Git remote | `https://github.com/baseltayem1-btayem/wathiqcare-discharge-refusal.git` |
| Branch | `phase24-evidence-package-final` |
| Head commit | `27e15c4` — `feat(ui-refresh): wire v1.1 patient landing behind FEATURE_UI_REFRESH_V1_1` |
| Previous commit | `fc64713` — `feat(ui-refresh): map Figma v1.1 design into safe UI components` |
| Preview URL | https://wathiqcare-discharge-refusal-7pwgp96lg-wathiqcare.vercel.app |
| Build time | 3m (Build Completed in `/vercel/output [2m]`, Deploy 1m) |
| Deployment target | `preview` |
| Deployment status | `● Ready` |
| Created | 2026-05-27 20:33:53 GMT+0300 |

`vercel inspect` output excerpt:

```
name        wathiqcare-discharge-refusal
target      preview
status      ● Ready
created     Wed May 27 2026 20:33:53 GMT+0300 (Arabian Standard Time) [4m ago]
```

---

## 2 · Feature Flag Scope

The UI refresh is gated by `NEXT_PUBLIC_FF_UI_REFRESH_V1_1`, read in
[apps/web/src/lib/config/ui-refresh-flag.ts](apps/web/src/lib/config/ui-refresh-flag.ts).
The flag was added **only** to the Preview environment scoped to this exact branch.

`vercel env ls | Select-String UI_REFRESH` (captured post-deploy):

```
NEXT_PUBLIC_FF_UI_REFRESH_V1_1   Encrypted   Preview (phase24-evidence-package-final)   6m ago
```

- ✅ Preview row present, branch-scoped to `phase24-evidence-package-final`.
- ✅ **No Production row exists** — production builds will resolve `FEATURE_UI_REFRESH_V1_1 = false` and continue to render the legacy patient landing.
- ✅ No Development row exists.

---

## 3 · Production Safety Confirmation

| Check | Result |
|---|---|
| `vercel env ls` shows Production entry for `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` | ❌ None present → production OFF |
| Production root (`https://wathiqcare.online`) HTTP response | `307` (unchanged auth-gated redirect — identical to pre-deploy) |
| Production deployment touched by this phase | ❌ No — only `vercel` (default = preview target) was invoked; `vercel --prod` was **never** executed |
| Preview URL exposed as production alias | ❌ No — preview URL is a unique `*.vercel.app` host, not `wathiqcare.online` |

Production remains on the prior promoted deployment. No code, env-var, alias, or domain change touched production in this phase.

---

## 4 · Code Scope (what the flag wraps)

The flag gates UI only — no business, security, or signing logic was altered.

| Path | Change |
|---|---|
| [apps/web/src/styles/ui-refresh-v1.1.css](apps/web/src/styles/ui-refresh-v1.1.css) | Scoped Figma palette under `[data-ui-refresh="v1.1"]` |
| `apps/web/src/components/ui-refresh/` | 11 new presentational components + `_utils.ts` + barrel `index.ts` |
| [apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx](apps/web/src/components/ui-refresh/UIRefreshBoundary.tsx) | Wraps surfaces with `data-ui-refresh="v1.1"` only when flag is ON |
| [apps/web/src/components/modules/public-signing/PatientLandingV11.tsx](apps/web/src/components/modules/public-signing/PatientLandingV11.tsx) | NEW — composes `StepIndicatorV11` + `PatientHeroSection` + `TrustBanner` + `ProcedureSummaryCard` + `WhatToExpectCard` |
| [apps/web/src/components/modules/PublicSigningWorkflow.tsx](apps/web/src/components/modules/PublicSigningWorkflow.tsx) | Stage-0 branch: `FEATURE_UI_REFRESH_V1_1 ? <PatientLandingV11/> : <legacy step indicator + header>`. All downstream stages (education, decision, OTP, signature, refusal, confirmation) unchanged |

---

## 5 · Untouched Surfaces (explicit confirmation)

The flag wraps the **landing visual** of `/sign/[token]/workflow` only. The following critical paths are verified untouched by source diff inspection of commit `27e15c4` and `fc64713`:

| Surface | Touched? | Evidence |
|---|---|---|
| OTP request / verify flow | ❌ No | `OtpStage` JSX in `PublicSigningWorkflow.tsx` unchanged; no diff under `app/api/.../otp/**` or OTP services |
| Audit chain (`secure_workflow_event`, `signing_audit_entry`) | ❌ No | No diff under `app/api/secure-signing/**`, `lib/audit-chain/**`, or `prisma/schema.prisma` |
| Evidence package generation | ❌ No | No diff under `app/api/.../evidence/**`, `lib/evidence-package/**`, or PDF generators |
| Secure-link validation (`/sign/[token]` resolver) | ❌ No | No diff in token resolution path; landing change is purely visual inside the stage IIFE |
| Server-side rendering / API routes | ❌ No | Flag is `NEXT_PUBLIC_*` — read on the client; server routes do not branch on it |
| Database schema / migrations | ❌ No | No `prisma/migrations` changes in either commit |

---

## 6 · Validation Matrix

The preview is the same Next.js build that production will receive if/when promoted; visual diffs are isolated to the flagged region. The matrix below mixes automated and operator checks.

| # | Check | Method | Result |
|---|---|---|---|
| 1 | Vercel build succeeds for branch HEAD `27e15c4` | `vercel --yes` → "Build Completed in /vercel/output [2m]" | ✅ PASS |
| 2 | Deployment reaches `● Ready` | `vercel inspect <url>` → `status ● Ready` | ✅ PASS |
| 3 | Deployment target = `preview` (not production) | `vercel inspect` → `target preview` | ✅ PASS |
| 4 | Env var bound only to Preview / branch `phase24-evidence-package-final` | `vercel env ls` row | ✅ PASS |
| 5 | Production has no `NEXT_PUBLIC_FF_UI_REFRESH_V1_1` row | `vercel env ls` filtered grep | ✅ PASS |
| 6 | Preview URL reachable | `Invoke-WebRequest` → HTTP 307 (expected auth/redirect, same shape as prod) | ✅ PASS |
| 7 | Production URL response unchanged | `Invoke-WebRequest https://wathiqcare.online` → HTTP 307 | ✅ PASS |
| 8 | Landing renders v1.1 hero/step/trust/procedure/what-to-expect on preview | Operator visual capture at `/sign/<TOKEN>/workflow?lang=en` | ⏳ operator-pending |
| 9 | RTL layout flips correctly (`textAlign("ar")`, `rowDir("ar")`) | Operator visual capture at `/sign/<TOKEN>/workflow?lang=ar` | ⏳ operator-pending |
| 10 | Mobile 360 / 414 / 768 widths | Chrome DevTools device emulation on preview URL | ⏳ operator-pending |
| 11 | A11y — single `<h1>`, focus ring uses `var(--wc-focus-ring)`, `role="status"` on TrustBanner, `role="group" aria-label` on StepIndicatorV11, keyboard tab order | axe-DevTools + keyboard pass | ⏳ operator-pending |
| 12 | Legacy step-indicator + legacy `<header>` absent when flag ON | DOM inspect on preview workflow page | ⏳ operator-pending |
| 13 | Legacy step-indicator + legacy `<header>` present on production | DOM inspect on production workflow page | ⏳ operator-pending |
| 14 | v1.0.1 11-check smoke (workflow regression) | `__phase17_smoke.ps1` adjusted at preview URL | ⏳ operator-pending |

Items 8–14 require an authenticated signing token (issued via the pilot tenant) and an interactive browser — they cannot be executed from the agent's terminal without exposing live credentials. They are intentionally left for the pilot operator to capture before any production promotion.

**Screenshot capture targets (operator):**

- `docs/preview/preview-v11-landing-en.png`
- `docs/preview/preview-v11-landing-ar.png`
- `docs/preview/preview-v11-landing-mobile-360.png`
- `docs/preview/preview-v11-landing-mobile-414.png`
- `docs/preview/preview-v11-landing-tablet-768.png`
- `docs/preview/preview-v11-axe-report.html`

---

## 7 · Rollback Plan

Three independent rollback levels, any one of which restores prior behaviour. None of these require a production deploy.

### Level 1 — Disable flag in Preview (≈ 30s, no rebuild needed for legacy fallback path, rebuild needed for value change to propagate)

```powershell
vercel env rm NEXT_PUBLIC_FF_UI_REFRESH_V1_1 preview --yes
# then trigger a new preview build:
vercel --yes
```

Effect: Preview reverts to legacy patient landing. Production was already OFF, so it is unaffected.

### Level 2 — Revert code commits (preserves any other work on the branch)

```powershell
git revert --no-edit 27e15c4 fc64713
git push origin phase24-evidence-package-final
```

Effect: All v1.1 wiring and Figma-derived components removed from history of this branch. Vercel auto-builds a new preview on push.

### Level 3 — Branch-level rollback (nuclear, only if branch is corrupted)

```powershell
git checkout main
git branch -D phase24-evidence-package-final
# remote:
git push origin --delete phase24-evidence-package-final
```

Effect: Branch and its preview deployments are removed. Production unaffected (production tracks `main`).

---

## 8 · Promotion Gate

⛔ **Do NOT promote to production without explicit written approval.**

When approval is granted, the promotion sequence will be:

1. Operator captures and archives screenshots and the v1.0.1 smoke result on the preview URL.
2. PR from `phase24-evidence-package-final` → `main` reviewed and merged.
3. Production env-var added: `vercel env add NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production` (value `1`).
4. `vercel --prod` triggered, or Vercel auto-builds on `main` merge.
5. Post-promotion smoke against `https://wathiqcare.online` + production v1.0.1 11-check.

Until then, this report is the authoritative record that:

- ✅ Preview deployment is Ready at the URL above.
- ✅ Preview-only env-var scope is verified.
- ✅ Production environment is untouched.
- ⛔ Production promotion has **not** occurred and is gated on explicit approval.

---

## 9 · Operational Notes

- Vercel CLI from Windows PowerShell wraps stderr lines as `RemoteException`; commands such as `vercel env add` and `git push` may show "exit code 1" while the underlying operation succeeded. Always read the last lines of output for the real result.
- Working pattern for adding a Preview env-var to a specific branch (avoids the interactive "which Git branch?" prompt that loses the terminal handle when piped):

  ```powershell
  Set-Content -Path .tmp_envval -Value "1" -NoNewline
  Get-Content .tmp_envval -Raw | vercel env add NEXT_PUBLIC_FF_UI_REFRESH_V1_1 preview phase24-evidence-package-final
  Remove-Item .tmp_envval
  ```

- `pnpm` is not on PATH in this Windows session; deploys must use `vercel` CLI, not `pnpm` scripts.

---

**End of report.**
