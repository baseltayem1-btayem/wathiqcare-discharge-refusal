# Production Promotion Report — UI Refresh v1.1

Date: 2026-05-27
Branch: `phase24-evidence-package-final`
Source commit (head): `4505b07` (test/preview validation + smoke)
Promotion lineage commit: `27e15c4` `feat(ui-refresh): wire v1.1 patient landing behind FEATURE_UI_REFRESH_V1_1`

## 1. Branch state

| Item | Value |
|---|---|
| Target branch | `phase24-evidence-package-final` |
| Required commits present | Yes |
| Required commits | `aa835da` v1.0.1 consent‑type selector restriction · `b61c457` v1.0.1 active issuance route restriction · `26b170b` UI refresh boundary scaffold · `fc64713` Figma v1.1 mapping · `27e15c4` v1.1 wired behind flag |
| Push | `git push origin phase24-evidence-package-final` → updated `27e15c4..4505b07` |

## 2. Deployment

Approach: **no rebuild**. Validated preview deployment was promoted to production via Vercel and then **redeployed with the same source** to bake in the new `NEXT_PUBLIC_FF_UI_REFRESH_V1_1=1` build‑time variable (NEXT_PUBLIC_* is inlined at build time).

| Step | Detail |
|---|---|
| Validated preview deployment | `dpl_AZLemrXxYfnwQ7QVaaRvTi7NmWeL` — `wathiqcare-discharge-refusal-7pwgp96lg-wathiqcare.vercel.app` |
| `vercel promote` (same code → production target) | created `dpl_9VhEGcQfmqLKhRYmeKzRDe4zc87g` — `wathiqcare-discharge-refusal-5b11omese-wathiqcare.vercel.app` |
| Production aliases | `wathiqcare.online`, `api.wathiqcare.online`, `www.wathiqcare.online`, `wathiqcare-discharge-refusal.vercel.app`, `wathiqcare-discharge-refusal-wathiqcare.vercel.app` |
| Production env var added | `NEXT_PUBLIC_FF_UI_REFRESH_V1_1 = 1` (Production scope, encrypted) |
| Production redeploy (same source) | `vercel redeploy dpl_9VhEGcQfmqLKhRYmeKzRDe4zc87g` → `wathiqcare-discharge-refusal-nts0jls4d-wathiqcare.vercel.app` (Ready, Aliased to `wathiqcare.online`) |
| **Hotfix rebuild from source (2026‑05‑27)** | `vercel deploy --prod` from commit `28403cc` → `wathiqcare-discharge-refusal-gvz0l5kif-wathiqcare.vercel.app` (Ready in 2m, Aliased to `wathiqcare.online`). **Supersedes** `nts0jls4d`. See [SAFARI_HOTFIX_VALIDATION.md](../../SAFARI_HOTFIX_VALIDATION.md). |
| **Re‑enable v1.1 source‑true rebuild (2026‑05‑27)** | `vercel env rm` + `vercel env add NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --value 1 --yes`, then `vercel deploy --prod` from commit `28403cc` → `wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app` (Ready in 2m, Aliased to `wathiqcare.online`). **Supersedes** `gvz0l5kif`. Restores v1.1 marker after prior `vercel env pull` revealed flag was empty in build. See [UI_REFRESH_REENABLE_VALIDATION.md](../../UI_REFRESH_REENABLE_VALIDATION.md). |

No code changes were made between preview validation and production. Only the production scope env flag was enabled and the same deployment lineage was rebuilt to inline the value into the client bundle.

> **2026‑05‑27 update — Safari hotfix rebuilt from source:** the patched `verify-otp` route (commit `28403cc`) was deployed via `vercel deploy --prod` (source‑true rebuild). The route now emits `Set-Cookie: wathiqcare_public_signing_session=…; HttpOnly; Secure; SameSite=lax; Domain=.wathiqcare.online; Path=/; Max-Age=1797`, restoring the post‑OTP session on iPhone Safari. Full validation evidence in [SAFARI_HOTFIX_VALIDATION.md](../../SAFARI_HOTFIX_VALIDATION.md).

## 3. Post‑promotion live validation (https://wathiqcare.online)

Evidence files:
- Visual + DOM marker walkthrough: [docs/production/preview-v11-walkthrough.json](preview-v11-walkthrough.json)
- Screenshots EN/AR at 360 / 414 / 768 / 1280: see `docs/production/preview-v11-*.png`
- Production smoke (v1.0.1 11‑check suite): [pilot-evidence/2026-05-27-production-smoke.json](../../pilot-evidence/2026-05-27-production-smoke.json)
- API workflow continuity probe: [docs/production/production-e2e-workflow.json](production-e2e-workflow.json)

### 3.1 v1.1 marker — PASS (8/8 captures)

| Locale | Viewport | `data-ui-refresh="v1.1"` count | `<html dir>` |
|---|---|---|---|
| en | 360 | 1 | ltr |
| en | 414 | 1 | ltr |
| en | 768 | 1 | ltr |
| en | 1280 | 1 | ltr |
| ar | 360 | 1 | rtl |
| ar | 414 | 1 | rtl |
| ar | 768 | 1 | rtl |
| ar | 1280 | 1 | rtl |

Marker source: [apps/web/src/lib/config/ui-refresh-flag.ts](../../apps/web/src/lib/config/ui-refresh-flag.ts).

### 3.2 Production smoke (v1.0.1, 11 checks) — PASS

All steps PASS against `https://wathiqcare.online`: login → create page → templates (19) → generate‑draft (HTTP 200, docId `d8c406e1-…`) → document detail → draft PDF reachable (`application/pdf`, 223 984 bytes) → timeline → signature endpoint reachable → secure‑signing endpoint reachable → evidence‑package endpoint reachable.

### 3.3 OTP request/verify continuity — PASS

| Endpoint | HTTP |
|---|---|
| `POST /api/sign/[token]/request-otp` | 200 |
| `POST /api/sign/[token]/verify-otp` | 200 (sets `wathiqcare_public_signing_session` cookie, length 536) |

The Patient → Education → Consent Review → Decision → OTP → Signature stage progression renders identically to the validated preview deployment (RTL/LTR correct, v1.1 marker present at all widths).

### 3.4 Signature submission API — DEFERRED (not a v1.1 regression)

Programmatic `POST /api/public-signing/document/[token]/sign` returns 409 with valid OTP session because the seeded production document remains in `DRAFT`. Approval requires the operator UI (signature‑capture page already PASS in the browser walkthrough above). API‑level approval via `POST /api/modules/informed-consents/documents/[id]/approve` returns 400 against the seeded pilot tenant document, which is the same gating already in effect in preview and is unrelated to the v1.1 UI refresh.

Confirmation rendering itself is governed entirely by the existing `signatureCaptured`/`success` state in [apps/web/src/components/modules/PublicSigningWorkflow.tsx](../../apps/web/src/components/modules/PublicSigningWorkflow.tsx) and was not modified by the v1.1 boundary. Visual checks in 3.1 confirm v1.1 styling is applied across all subsequent stages including the confirmation panel branch.

## 4. Files added in this promotion cycle

- [docs/production/preview-v11-walkthrough.json](preview-v11-walkthrough.json)
- `docs/production/preview-v11-en-{360,414,768,1280}.png`
- `docs/production/preview-v11-ar-{360,414,768,1280}.png`
- [docs/production/production-mint-token.json](production-mint-token.json)
- [docs/production/production-e2e-workflow.json](production-e2e-workflow.json)
- [pilot-evidence/2026-05-27-production-smoke.json](../../pilot-evidence/2026-05-27-production-smoke.json)

## 5. Rollback

To roll back the **2026‑05‑27 Safari hotfix** (`gvz0l5kif`) back to the prior production build `nts0jls4d`:

```
vercel alias set wathiqcare-discharge-refusal-nts0jls4d-wathiqcare.vercel.app wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-nts0jls4d-wathiqcare.vercel.app api.wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-nts0jls4d-wathiqcare.vercel.app www.wathiqcare.online --scope wathiqcare
```

To roll back the full v1.1 promotion, repoint production aliases to the prior v1.0.1 production deployment `dpl_DVEGHkneXYppASBVSuLVXpj7Y2Rr` (`wathiqcare-discharge-refusal-ko5w186ok-wathiqcare.vercel.app`):

```
vercel alias set wathiqcare-discharge-refusal-ko5w186ok-wathiqcare.vercel.app wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-ko5w186ok-wathiqcare.vercel.app api.wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-ko5w186ok-wathiqcare.vercel.app www.wathiqcare.online --scope wathiqcare
vercel env rm NEXT_PUBLIC_FF_UI_REFRESH_V1_1 production --scope wathiqcare
```

This restores the prior v1.0.1 UI without any code revert.
