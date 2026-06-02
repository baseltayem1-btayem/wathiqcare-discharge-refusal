# Phase 43 — Approved Full Journey Baseline Restoration — Step 1 Discovery Report

**Date:** 2 June 2026
**HEAD:** `main` @ `ffe3b03d40258d87539a11898c8621745f095dae`
**Action taken:** Investigation only. No branch created. No build run. No commit. No push. No deploy. No migrations. No SMS / OTP / signing / public-signing edits. Four pre-existing uncommitted local edits from Phase 42 remain untouched and unstaged (`final-ui/ConsentBuilder.tsx`, `final-ui/fixtures/consent-builder.ts`, `final-ui/steps/StepPatient.tsx`, `final-ui/steps/StepProcedure.tsx`).
**Goal of this step:** before building `phase43-approved-full-journey-baseline`, confirm what counts as **the** previously approved baseline.

---

## 1. Headline conclusion

**No single git ref (branch, tag, stash, or reachable commit) contains a unified "approved full journey baseline" that includes all of: updated landing page, Phase-40 final-ui physician journey, wired AI-assisted readiness/validation, wired contact verification, wired PDF preparation, patient journey, evidence/audit chain.**

The pieces the user wants restored are scattered across:
- **`main` @ ffe3b03** — production deployed; contains `final-ui/` Figma-ported physician UI (mock-only); does **not** contain landing/request-demo/branding/projection folders; does **not** wire `clinical-ai/*`.
- **3 stashes on `phase24-evidence-package-final`** — contain significant changes to signing / public-signing / OTP / email / SMS surfaces. **Restricted by Phase 43 rules.**
- **`design/figma/wathiqcare-v1.1`** folder in working tree — historical Figma export reachable only via dangling commit `fc64713` (`feat(ui-refresh): map Figma v1.1 design into safe UI components`).
- **134 untracked working-tree files** — including the entire updated landing folder, request-demo, public-signing component, branding, and unified-disclosure projection/shadow-mode files. **None of these has ever been committed to any ref.**
- **4 locally modified tracked files** — from the halted Phase 42B work.

Because the user requirement is *"recover and publish the complete previously approved baseline"* — and no such single baseline commit exists — synthesising one by cherry-picking across stashes/branches/untracked files would not be a *restoration*; it would be a *new composition*. That is outside Phase 43's stated scope and contradicts the rule *"do not blindly merge old branches"*.

**Final classification:** `STOP – BASELINE SOURCE NOT CONFIRMED`.

---

## 2. Candidate baselines inventory

### 2.1 Tracked refs (sorted by commit date)

| Ref | Commit | Date | Description | Has `final-ui/`? | Has updated landing? | Has wired AI? | Has wired PDF? |
|---|---|---|---|---|---|---|---|
| `main` / `origin/main` | `ffe3b03` | 2026-06-01 | Production. Merge of phase40g-final-ui-clean. | **YES** | NO | NO | NO |
| `phase40g-final-ui-clean` / `origin/...` | `657490b` | 2026-06-01 | feat(informed-consents): activate final physician consent builder UI | **YES** | NO | NO | NO |
| `phase24-evidence-package-final` (local) | `321c1cc` | 2026-06-01 | feat(informed-consents): deploy final consent platform UI | **YES** | NO | NO | NO |
| `phase24-evidence-package-final` (origin) | `0f7eb36` | 2026-06-01 | fix(public-signing): arabic mojibake normalization | NO | NO | NO | NO |
| `phase36-controlled-merge-approved-pilot-to-main-v3` / `origin/...` | `83f3880` | 2026-06-01 | fix(informed-consents): wire latest approved platform UI | NO | NO | NO | NO |
| `phase41-unified-production-source-package` | `83f3880` | 2026-06-01 | Identical to v3 above | NO | NO | NO | NO |
| `phase36-controlled-merge-approved-pilot-to-main` | `0f7eb36` | 2026-06-01 | (same head as origin/phase24…) | NO | NO | NO | NO |
| `hotfix/secure-signing-uuid-casts` | `380249f` | 2026-05-26 | fix(signing): keep audit append non-fatal | NO | NO | NO | NO |
| `temp/phase24-blocker-deploy` | `fdcd140` | 2026-05-25 | fix: unblock informed consent approval | NO | NO | NO | NO |
| `safe/arabic-localization-full` | `e6e5228` | 2026-04-26 | backup before full functional activation + PDF + email integration | NO | NO | NO | NO |
| `staging/workflow-guidance-login-fix` | `f051aec` | 2026-04-19 | fix: add serverless Chromium fallback for PDF generation in Vercel | NO | NO | NO | **PDF infrastructure present (Chromium fallback)** |
| `fix/pdf-binary-storage-atomicity` | `f4f79a8` | 2026-04-17 | fix(pdf): harden legal case PDF binary persistence | NO | NO | NO | **PDF infrastructure** |
| `stabilization/production-hardening` | `19dc8d6` | 2026-04-10 | fix(stability): harden auth, routing, and core flow resilience | NO | NO | NO | NO |

### 2.2 Tags

| Tag | Commit | Date | Note |
|---|---|---|---|
| `hotfix/ar-utf8-cleanup-v1` | `a0d956f` | 2026-05-28 | Arabic UTF-8 cleanup |
| **`wathiqcare-informed-consent-pilot-ready-v1.0.1`** | `5f4718b` | 2026-05-27 | "Patient Consent Presentation Flow Correction" — most recent "pilot-ready" tag. **No `final-ui/`, no landing, no wired AI.** |
| **`wathiqcare-informed-consent-pilot-ready-v1.0`** | `7ed3ecb` | 2026-05-27 | "WathiqCare Informed Consents v1.0 Pilot Ready" — earliest formally tagged "approved pilot ready" snapshot. **No `final-ui/`, no landing.** |
| `AUTH-CONSENT-RC1-FIX1` | `1674da2` | 2026-05-15 | RC1 fix |
| `AUTH-CONSENT-RC1` | `e33755e` | 2026-05-15 | RC1 |
| `production-saudi-consent-v1` | `2d46de4` | 2026-05-11 | "19-template enterprise consent engine with TrakCare integration" |
| `v2026.04.13-stable-legal-risk-templates-riskscore-esign` | `9a4e671` | 2026-04-13 | "legal risk dashboard + template library + risk scoring + e-sign readiness" |

### 2.3 Stashes (on `phase24-evidence-package-final`)

| Stash | Title | Surface (files / lines) | Phase-43 admissibility |
|---|---|---|---|
| `stash@{0}` | "WIP on phase24-evidence-package-final: 169daad fix(consents): deliver secure signing link to patient email" | 14 files / **+2613 / −87**. Includes `public-signing-service.ts` (+1580/-?), `app/sign/[token]/page.tsx` (+820/-?), `verify-otp/route.ts`, `signature-orchestration-service.ts`, `signature-core.ts`, `audit-chain-service.ts`, `secure-links.ts`, `services/sms/taqnyatClient.ts`, `prisma/schema.prisma` (+126), `proxy.ts`. | **EXCLUDED** — modifies public-signing / OTP / signing / SMS / schema. Phase 43 hard rule. |
| `stash@{1}` | "On phase24-evidence-package-final: pre-production-release-temp-stash" | 10 files / +470 / −312. Includes `InformedConsentsModulePageNew.tsx` (+245), `PatientCommunicationPanel.tsx` (+108), `secure-links.ts` (+92), `module-secure-signing-service.ts`, `signature-orchestration-service.ts`, `audit-chain-service.ts`, `package.json`, `app/secure/[token]/page.tsx`, `release-gate/final-prod-release-gate.json` (−275). | **EXCLUDED** — modifies signing/secure-links/audit-chain and release-gate. |
| `stash@{2}` | "autostash" | (not inspected) | **EXCLUDED pending user instruction.** |

### 2.4 Recent dangling / reflog-only commits (not on any branch)

| Commit | Date | Subject |
|---|---|---|
| `4505b07` | 2026-05-27 | test(preview): validate v1.1 landing and run phase17 smoke |
| `27e15c4` | 2026-05-27 | feat(ui-refresh): wire v1.1 patient landing behind `FEATURE_UI_REFRESH_V1_1` |
| `242ce20` | 2026-05-29 | feat(ui-promotion): promote validated v1.1 Healthcare Consent Platform Design to default (**now reachable from main**) |
| `2a527c2` | 2026-05-29 | feat(ui-correction): port approved Healthcare Consent Platform Design from `design/figma/wathiqcare-v1.1` as default (**now reachable from main**) |
| `37df8f6` / `098881f` | 2026-05-29 | feat(patient-flow): mount approved 7-screen ApprovedPatientWorkflow at `/sign/[token]/workflow` wired to real public-signing APIs (**now reachable from main**) |
| `6663d7c` | 2026-05-29 | style(email): white-header secure-signing template |
| `6871f65` | 2026-06-01 | fix(phase36a): restore repaired merge candidate sources and route wiring (**reachable from main**) |
| `fc64713` | (dangling) | feat(ui-refresh): map Figma v1.1 design into safe UI components (only access to `design/figma/wathiqcare-v1.1/`) |

### 2.5 Untracked working-tree assets (never in any commit, ever)

Confirmed via `git log --all --reflog -- <path>` returning empty.

| Path | Files | Notes |
|---|---|---|
| [apps/web/src/components/landing/WathiqcareWhiteLanding.tsx](apps/web/src/components/landing/WathiqcareWhiteLanding.tsx) | 1 (14.9 kB, 2026-06-01) | The "updated landing page" component. **Never committed.** |
| [apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx](apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx) | 1 (14.0 kB, 2026-06-01) | Request-demo page. **Never committed.** |
| [apps/web/src/components/public-signing/OtpVerificationBranding.tsx](apps/web/src/components/public-signing/OtpVerificationBranding.tsx) | 1 (1.3 kB) | OTP page branding component. **Never committed.** |
| [apps/web/src/lib/branding/otp-page-branding.ts](apps/web/src/lib/branding/otp-page-branding.ts) | 1 (0.2 kB) | Branding helper. **Never committed.** |
| [apps/web/src/lib/projection/](apps/web/src/lib/projection/) | 3 (`unified-disclosure-projection.ts` 11.7 kB, `unified-disclosure-shadow-mode.ts` 11.4 kB, `unified-disclosure-types.ts` 3.6 kB) | Projection / shadow-mode subsystem. **Never committed.** Phase 43 explicitly lists "projection / shadow-mode files" as excluded unless separately approved. |
| Total untracked | **134** files / dirs | Includes Phase 32–42 reports and capture scripts. |

### 2.6 Working-tree modified (Phase 42B leftover)

| File | Status |
|---|---|
| [final-ui/ConsentBuilder.tsx](apps/web/src/components/informed-consents/final-ui/ConsentBuilder.tsx) | preset removal |
| [final-ui/fixtures/consent-builder.ts](apps/web/src/components/informed-consents/final-ui/fixtures/consent-builder.ts) | v16 section: send → patient |
| [final-ui/steps/StepPatient.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepPatient.tsx) | contact verification block |
| [final-ui/steps/StepProcedure.tsx](apps/web/src/components/informed-consents/final-ui/steps/StepProcedure.tsx) | onComplete v3/v4/v5 |

These do not constitute a baseline; they are the halted Phase 42B patch.

---

## 3. Capability matrix vs candidate baselines

Legend: ✅ committed and wired · 🟡 committed but not wired/mock-only · ⬜ absent · 🚫 explicitly excluded by Phase 43 rules

| Capability | `main` (ffe3b03) | tag v1.0.1 (5f4718b) | phase24-evidence-package-final (321c1cc) | phase40g-final-ui-clean (657490b) | phase36-…-v3 (83f3880) | Working tree |
|---|---|---|---|---|---|---|
| Updated landing page (`WathiqcareWhiteLanding`) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 (untracked) |
| Request-demo page component | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 (untracked) |
| Physician journey `final-ui/` (Figma-port, mock) | 🟡 | ⬜ | 🟡 | 🟡 | ⬜ | 🟡 |
| AI-assisted code present (`clinical-ai/`) | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| AI wired into physician journey | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Contact-verification backend | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Contact-verification UI | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 (uncommitted Phase 42 patch) |
| PDF preparation/preview wired to new physician UI | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Validation readiness wired to backend | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Send secure link wired to backend (new UI) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Patient journey (`ApprovedPatientWorkflow` at `/sign/[token]/workflow`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Public-signing service / OTP / signature | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence package v2 service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit chain service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dynamic consent engine (feature-flag off) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arabic/English/RTL across landing + journey | partial | partial | partial | partial | partial | partial |
| `unified-disclosure-projection` / shadow-mode | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🚫 (untracked, excluded by rules) |
| Branding subsystem (`lib/branding/`) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 (untracked) |

**No single ref or even any plausible cherry-pick combination short of merging stashes (which Phase 43 disallows) produces a unified baseline that satisfies the user's requirement set.**

---

## 4. Prior E2E evidence reconciliation (status only)

Per Phase 41A: prior patient-journey E2E evidence covering token landing → education → decision → OTP request → OTP verify → signature → evidence → audit-chain was found and confirmed still applicable to the current `ApprovedPatientWorkflow` mounted at [apps/web/app/sign/[token]/workflow/page.tsx](apps/web/app/sign/[token]/workflow/page.tsx). That reconciliation is unchanged.

No prior **physician-journey** E2E evidence covering the Phase 40 Figma-ported `final-ui` exists, because that UI was ported on 2026-06-01 and is mock-only.

---

## 5. What can and cannot be safely included in `phase43-approved-full-journey-baseline`

If — and only if — the user designates one of the candidates in §2 as the baseline source, then the additive overlay layer can include:

### Admissible (additive, frontend-only, reversible)
- Untracked `apps/web/src/components/landing/WathiqcareWhiteLanding.tsx` + route wiring in `apps/web/app/page.tsx` and `apps/web/app/[lang]/page.tsx` (LANDING REQUIRED).
- Untracked `apps/web/src/components/request-demo/WathiqcareRequestDemoPage.tsx` only if a route (`apps/web/app/request-demo/page.tsx`) is going to import it (LANDING REQUIRED).
- The four halted Phase 42B physician-journey patches (PHYSICIAN JOURNEY REQUIRED — gate + contact-verification + procedure-v5 + preset-removal). Pilot-mode disclaimers on StepPreview and StepSend would be added in the same PHYSICIAN JOURNEY REQUIRED bundle.

### Conditionally admissible (requires explicit user approval, not assumed)
- `OtpVerificationBranding.tsx` + `otp-page-branding.ts` — touch the OTP page surface. Classification: **HIGH RISK – SEPARATE REVIEW**.
- Wiring of `clinical-ai/*` into `StepDisclosures` / `StepEducation` / `StepPreview` — would constitute *new* integration, not restoration. Classification: **AI/READINESS REQUIRED** but only as a separately approved phase under `FUTURE_AI_INTEGRATION.md` governance.

### Not admissible per Phase 43 rules
- All three stashes (`stash@{0..2}`) — every one touches `public-signing-service.ts` / `signature-*` / `secure-links.ts` / `taqnyatClient.ts` / `schema.prisma`. **EXCLUDED**.
- `apps/web/src/lib/projection/unified-disclosure-projection.ts`, `unified-disclosure-shadow-mode.ts`, `unified-disclosure-types.ts` — **EXCLUDED** (projection / shadow-mode rule).
- Any prisma migration. **EXCLUDED**.
- Any change to SMS enablement, signing token/session, OTP routes, public-signing API behaviour. **EXCLUDED**.

---

## 6. Build, typecheck, smoke status

**Not performed.** Phase 43 step 5 (build + tsc + visual smoke) requires the baseline branch to exist first. Without a confirmed baseline source the branch cannot be created.

---

## 7. Final classification

**`STOP – BASELINE SOURCE NOT CONFIRMED`**

Rationale:
1. The user's requested "previously approved full journey baseline" does not exist as a single git ref. The closest tagged "approved pilot ready" snapshots (`wathiqcare-informed-consent-pilot-ready-v1.0` and `…v1.0.1`) **predate** the Phase 40 Figma-port physician UI and **do not contain** the updated landing page.
2. The updated landing page, the request-demo page, the OTP-branding component, the branding helpers, and the projection / shadow-mode files are **untracked** working-tree files that have never been committed to any ref. Restoring them is not "restoration" but a first-time commit, which materially changes Phase 43's framing.
3. The three stashes that touch the missing capabilities (PDF, secure-links, secure signing, OTP, SMS, signing-orchestration, audit-chain, prisma schema) are all categorically excluded by Phase 43's hard rules.
4. AI-assisted physician-journey wiring has never been implemented in any ref (per Phase 42A recovery). Wiring it now is a forward integration, not a recovery.
5. Synthesising a baseline by cherry-picking across stashes / branches / untracked files contradicts the rule *"do not blindly merge old branches"* and would not be reproducible without an authoritative baseline designation from the user.

---

## 8. Decisions required from user before Phase 43 can proceed

Please answer the following so Phase 43 can be re-scoped concretely:

1. **Designate the baseline source.** Pick exactly one:
   - (a) `wathiqcare-informed-consent-pilot-ready-v1.0.1` tag (pre-Figma-port; no `final-ui/`).
   - (b) `main` @ `ffe3b03` (current production; has `final-ui/` mock; no landing).
   - (c) some other ref I should examine (please name it).
   - (d) accept that no single ref qualifies and re-scope Phase 43 as a **forward composition** that overlays specific named files on top of `main`.

2. **Updated landing page.** Confirm: (i) the working-tree `WathiqcareWhiteLanding.tsx` and `WathiqcareRequestDemoPage.tsx` are the canonical source we should commit, AND (ii) we wire them into `apps/web/app/page.tsx` and `apps/web/app/[lang]/page.tsx` (English-only copy initially), with no replacement of `/modules/*` or `/sign/*`.

3. **Halted Phase 42B patches.** Decide: (i) keep them, (ii) revert them, or (iii) replace them with a different patch shape.

4. **OTP branding files** ([components/public-signing/OtpVerificationBranding.tsx](apps/web/src/components/public-signing/OtpVerificationBranding.tsx), [lib/branding/otp-page-branding.ts](apps/web/src/lib/branding/otp-page-branding.ts)) — they touch the OTP page surface. Confirm whether to (a) include them now, or (b) defer to a separate HIGH-RISK review.

5. **Projection / shadow-mode files** in [apps/web/src/lib/projection/](apps/web/src/lib/projection/) — confirm: keep excluded per Phase 43 rules.

6. **Stashes** `stash@{0..2}` — confirm: keep excluded; do not apply.

7. **AI integration** — confirm: Phase 43 does **not** wire `clinical-ai/*` into the physician UI; that belongs to a separately governed phase per `FUTURE_AI_INTEGRATION.md`.

8. **Patient journey** — confirm: no changes; `ApprovedPatientWorkflow` and `/sign/[token]/workflow` stay untouched per Phase 41A lock.

Once these are answered I will create `phase43-approved-full-journey-baseline` from the designated base, apply only the approved additive overlays, run `npx next build --webpack` + `npx tsc --noEmit`, capture the requested screenshots under `docs/production-readiness/phase43-approved-full-journey-baseline-screenshots/`, and author `docs/production-readiness/phase43-approved-full-journey-baseline-restoration-report.md` with the appropriate classification (`APPROVED FULL JOURNEY BASELINE READY FOR USER VISUAL APPROVAL` if everything passes).
