# Phase 41B — Controlled Patient Delivery Unfreeze Decision

**Date:** 2026-06-02
**Decision authority:** Pilot operations owner (this document records the recommendation; activation requires the owner's explicit go signal).
**Scope:** Controlled, pilot-only patient delivery via secure email-OTP signing links. SMS path remains frozen.

---

## 1. Production Baseline

| Item | Value |
|------|-------|
| Production URL (alias) | `https://wathiqcare.online` |
| Production deploy URL | `https://wathiqcare-discharge-refusal-b6iwie3bs-wathiqcare.vercel.app` |
| Production commit SHA | `ffe3b03d40258d87539a11898c8621745f095dae` |
| Branch deployed | `main` |
| Vercel env | `production` |
| Effective mode | `normal` (maintenanceMode/readonlyMode/degradedMode = false) |
| Missing required keys | none |

---

## 2. Phase 40H Deployment Status

- Clean UI-only branch `phase40g-final-ui-clean` (46 files) merged with `--no-ff` to `main` (`83f3880..ffe3b03`) and pushed.
- `npx vercel deploy --prod --yes` built in ~2 min, aliased to `wathiqcare.online`, ready in 3 min.
- `GET /api/health/runtime` → 200; runtime `gitCommitSha` matches local main HEAD.
- Physician Journey UI active: 7/7 production screenshots OK (Step 1 default landing, Step 2 Procedure, Step 7 Validation, Step 8 Send, Arabic mode, `/create`, `/modules`).
- Patient route `/sign/[token]/workflow` confirmed mounted (404 on expired test tokens, not 500).
- SMS disabled: `SMS_ENABLED="false"` in production release env; `TAQNYAT_SMS_ENABLED` unset; `isSmsEnabled()` returns `false`.
- Source report: [docs/production-readiness/phase40h-main-push-production-deployment-report.md](docs/production-readiness/phase40h-main-push-production-deployment-report.md).

---

## 3. Phase 41A Evidence Classification

**Final classification:** *PRIOR PATIENT JOURNEY E2E EVIDENCE FOUND AND STILL APPLICABLE.*

Source report: [docs/production-readiness/phase41a-prior-patient-journey-e2e-evidence-reconciliation-report.md](docs/production-readiness/phase41a-prior-patient-journey-e2e-evidence-reconciliation-report.md).

---

## 4. Prior E2E Steps Proven

| # | Step | Endpoint(s) | Proof |
|---|------|-------------|-------|
| 1 | Token landing | `GET /sign/{token}/workflow` | v1.0.1 smoke #6 (200 + component chunk) |
| 2 | Education first (gated) | `GET /api/sign/{token}/context` + `POST /api/public-signing/document/{token}/education` | v1.0.1 smoke #7–#8 (`otpVerifiedAt=null` on entry; OTP blocked pre-education) |
| 3 | Decision gate | `POST /api/public-signing/document/{token}/decision` | v1.0.1 smoke #11 (OTP request 409 pre-decision) |
| 4 | Request OTP | `POST /api/sign/{token}/request-otp` | v1.0.1 smoke #11 final (200 post-decision; HMAC stored) |
| 5 | Verify OTP + session cookie | `POST /api/sign/{token}/verify-otp` | Bootstrap script: status 200, `Set-Cookie` session issued, DB row `OTP_VERIFIED` |
| 6 | Signature pre-OTP protected | `POST /api/public-signing/document/{token}/sign` | v1.0.1 smoke #10 (pre-OTP → 401 "Missing public signing session") |
| 7 | Audit chain ordering | `audit-chain-service.ts` | Locked sequence: `OTP_REQUESTED → OTP_VERIFIED → PUBLIC_SIGNING_OTP_VERIFIED → SIGNATURE_CAPTURED → EVIDENCE_PACKAGED` |
| 8 | Evidence package + completion | Unified certificate API | Documented in PRODUCTION_STABILIZATION §3.4; document `1589eeef-…` 201 CREATED with `/workflow` URL |

Supporting reports: `PRODUCTION_STABILIZATION_REPORT.md` (11/11 PASS), `phase33a-pilot-evidence-pack/pilot-day-1-execution-log.md` (DAY-1 PILOT STABLE), `phase35a-day-1-single-tenant-pilot-monitoring-report.md` (13/13 paths 200, 0 HTTP 500).

---

## 5. Protected-Path Diff Result (`0f7eb360` → `ffe3b03`)

| Protected file | Status |
|----------------|--------|
| `apps/web/app/sign/[token]/workflow/page.tsx` | unchanged |
| `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx` | unchanged |
| `apps/web/src/lib/server/public-signing-service.ts` | unchanged |
| `apps/web/src/lib/server/audit-chain-service.ts` | unchanged |
| `apps/web/src/lib/server/module-secure-signing-service.ts` | unchanged |
| `apps/web/app/api/sign/[token]/context/**` | unchanged |
| `apps/web/app/api/sign/[token]/request-otp/**` | unchanged |
| `apps/web/app/api/sign/[token]/verify-otp/**` | unchanged |
| `apps/web/app/api/public-signing/**` (document / education / decision / sign) | unchanged |
| `apps/web/src/lib/server/signature-orchestration-service.ts` | **modified — 6-line SQL `::uuid` parameter-cast hotfix (non-behavioral)** |

The single modification is a defensive Postgres parameter-cast on one
`UPDATE signing_sessions … WHERE id = $2::uuid` plus whitespace. It does
not alter OTP, signature, gate sequencing, audit emission, evidence shape,
or any patient-facing surface.

---

## 6. SMS Disabled Status

- Env override `apps/web/.env.vercel.production.release` → `SMS_ENABLED="false"`.
- Runtime gate `src/services/sms/taqnyatClient.ts` requires
  `TAQNYAT_SMS_ENABLED ∈ {"1","true","yes"}` **and** a bearer token; if
  either is missing, `sendSms()` short-circuits with
  `{ ok: false, statusCode: 503, response: { code: 'TAQNYAT_NOT_CONFIGURED_OR_DISABLED' } }`.
- `TAQNYAT_SMS_ENABLED` is not declared in production env (absent from
  `/api/health/runtime.envPresence`).
- Phase 35A Day-1 monitoring observed **0 SMS-related log entries**.
- **SMS remains disabled. Email-OTP is the only patient OTP channel.**

---

## 7. Permitted Scope (If Activated)

1. **Pilot-only controlled patient delivery** — limited to the approved
   pilot tenant (`wathiqcare.med.sa`, tenant
   `efe052b7-a8ac-4962-a021-8c01931514a7`).
2. **Single tenant only** — no cross-tenant dispatch.
3. **No bulk sending** — links are issued one consent document at a time,
   per physician action, against an approved patient/MRN from the pilot
   test set (`IMC-2026-02000`, `IMC-2026-02001`, and any additionally
   pre-approved pilot MRN).
4. **No SMS** — patient OTP is delivered via the existing email channel
   only. Any SMS enablement is out of scope for this approval.
5. **Controlled secure links only** — links are minted via the standard
   physician dispatch path (`module-secure-signing-service.ts` →
   `signature-orchestration-service.ts`); no manually-crafted, externally
   distributed, or long-lived tokens.
6. **Direct monitoring required** — every dispatched link is observed
   live by an operator who tracks at minimum:
   - `/sign/{token}/workflow` 200,
   - education + decision events recorded,
   - `request-otp` 200,
   - `verify-otp` 200 + session cookie,
   - `signature` 200 (only after OTP),
   - audit chain rows in order,
   - evidence package present.
7. **Immediate freeze trigger** — any of the following stops further
   dispatch and re-freezes patient delivery:
   - `request-otp` non-200 unexpectedly,
   - `verify-otp` failure after a known-good OTP,
   - any `signature` 2xx without a preceding verified OTP,
   - audit-chain order violation or missing row,
   - missing/incomplete evidence package,
   - any HTTP 500 on a patient-facing route,
   - any `degradedMode`/`readonlyMode`/`maintenanceMode` flip on
     `/api/health/runtime`.

---

## 8. Prohibited Scope

- Enabling SMS (`TAQNYAT_SMS_ENABLED`, Taqnyat bearer token) in production.
- Running any Prisma migration.
- Editing any file under: `app/sign/[token]/**`,
  `app/api/sign/[token]/**`, `app/api/public-signing/**`,
  `src/lib/server/public-signing-service.ts`,
  `src/lib/server/audit-chain-service.ts`,
  `src/lib/server/module-secure-signing-service.ts`,
  `src/lib/server/signature-orchestration-service.ts`,
  `src/components/approved-design/patient/**`.
- Adding projection / shadow-mode / governance files.
- Broadening dispatch beyond the approved pilot tenant.
- Sending bulk patient links from any script, batch job, or admin tool.
- Issuing patient tokens that are not bound to a real, pilot-approved
  consent document creation event.
- Deploying or pushing any code change as part of this phase.

---

## 9. Rollback / Freeze Triggers

If any of the following are observed during controlled delivery, dispatch
must stop immediately and patient delivery returns to FROZEN:

| Trigger | Action |
|---------|--------|
| Patient HTTP 500 on `/sign/**` or `/api/sign/**` or `/api/public-signing/**` | Freeze; capture Vercel logs; open incident. |
| OTP verify fails for a confirmed correct code | Freeze; capture request/response with `traceId`; do not re-issue. |
| Signature 2xx without verified OTP in the same session | Freeze; treat as gate breach; open critical incident. |
| Audit-chain row missing or out of order | Freeze; snapshot DB rows; open critical incident. |
| Evidence package not generated after signature | Freeze; preserve session row; do not retry. |
| `/api/health/runtime` reports any non-`normal` `effectiveMode` | Freeze new dispatch until `normal` restored. |
| Vercel deployment SHA drifts from `ffe3b03d…` without an approved phase | Freeze; reconcile before resuming. |
| Any SMS attempt logged (`TAQNYAT_*` activity) without separate approval | Freeze; rotate any exposed credential; open incident. |

Rollback target (if a future deploy regresses the patient flow) is the
current production: commit `ffe3b03d40258d87539a11898c8621745f095dae`
(Vercel deploy `wathiqcare-discharge-refusal-b6iwie3bs-wathiqcare.vercel.app`).

---

## 10. Recommendation

Because (a) the prior champion E2E (v1.0.1 smoke 11/11) plus Phase 33A
Day-1 and Phase 35A monitoring collectively proved every patient-journey
step on commit `0f7eb360`; (b) every protected patient/signing/OTP/evidence
file in current production `ffe3b03` is byte-identical to `0f7eb360`
except for one non-behavioral SQL parameter-cast hotfix; (c) SMS remains
disabled by env and code gate; and (d) the Phase 40G/40H deploy was
UI-only relative to the patient flow — controlled, pilot-only,
direct-monitored, email-OTP patient delivery may be unfrozen within the
permitted scope of §7 and the prohibitions of §8, governed by the
freeze triggers of §9.

---

## 11. Final Classification

**CONTROLLED PATIENT DELIVERY APPROVED FOR PILOT**

(Activation still requires the pilot operations owner's explicit go signal
and assignment of the monitoring operator. This document records that the
preconditions are met; it does not by itself dispatch any link.)
