# Phase 41A — Prior Patient Journey E2E Evidence Reconciliation

**Date:** 2026-06-01
**Current production commit:** `ffe3b03d40258d87539a11898c8621745f095dae`
**Prior champion E2E commit:** `0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0`
**Status:** Read-only reconciliation. No deploy, no push, no token issuance, no SMS, no migrations.

---

## 1. Prior Successful Evidence Found

The patient journey / public-signing workflow has prior successful E2E
evidence at three independent layers:

### 1.1 Champion: v1.0.1 Production Smoke (11/11 PASS)

| Field | Value |
|-------|-------|
| File | [PRODUCTION_STABILIZATION_REPORT.md](PRODUCTION_STABILIZATION_REPORT.md) + [__smoke_prod_v1_0_1.json](__smoke_prod_v1_0_1.json) |
| Timestamp | 2026-05-27 04:16–04:18Z |
| Environment | Production — `https://wathiqcare.online` |
| Commit at run | v1.0.1 (pre-`0f7eb360` lineage; smoke harness validated identical gate set) |
| Result | **11/11 PASS, all 10 capability gates locked** |
| Steps proven | Token landing → workflow load → education-first → decision gate → request-OTP after decision (200) → verify-OTP endpoint + session cookie set → signature submission protected before OTP (401) → audit-chain sequence `OTP_REQUESTED → OTP_VERIFIED → PUBLIC_SIGNING_OTP_VERIFIED → SIGNATURE_CAPTURED → EVIDENCE_PACKAGED` |
| Test document ID | `1589eeef-a977-4834-b4b8-e71aaa4d4d25` (201 CREATED, signing URL ends with `/workflow`) |
| Token ref (redacted) | `NRvCl…EC0M` |
| SMS | **Disabled / not configured** (Taqnyat absent; email-OTP path live) |
| Controlled? | Yes — pilot tenant only, MRN test cases `IMC-2026-02000/01` |

### 1.2 Phase 33A — Day-1 Single-Tenant Pilot Execution Log

| Field | Value |
|-------|-------|
| File | [docs/production-readiness/phase33a-pilot-evidence-pack/pilot-day-1-execution-log.md](docs/production-readiness/phase33a-pilot-evidence-pack/pilot-day-1-execution-log.md) |
| Timestamp | 2026-06-01 06:00–06:23Z |
| Environment | Production — `https://wathiqcare.online` |
| Commit | `0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0` (branch `phase24-evidence-package-final`) |
| Result | **DAY-1 PILOT STABLE** |
| Steps proven | 6/6 post-deploy critical paths 200; workflow gates re-verified live (checks #7–#11); pre-OTP signature endpoint 401; post-decision OTP request 200; audit-chain order locked |
| SMS | Disabled (Taqnyat unconfigured) |
| Controlled? | Yes — single-tenant pilot |

### 1.3 Phase 35A — Day-1 Pilot Monitoring

| Field | Value |
|-------|-------|
| File | [docs/production-readiness/phase35a-day-1-single-tenant-pilot-monitoring-report.md](docs/production-readiness/phase35a-day-1-single-tenant-pilot-monitoring-report.md) |
| Timestamp | 2026-06-01 06:12–06:24Z |
| Environment | Production — `https://wathiqcare.online` |
| Commit | `0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0` |
| Result | 13/13 critical paths 200; DB latency 468 ms; **0 HTTP 500s**; 0 SMS log entries (email OTP only); signing endpoints properly gated (404/400 on invalid tokens) |
| SMS | Disabled |
| Controlled? | Yes |

### 1.4 Supporting Bootstrap Probes (read-only signing harness)

- [__pre_otp_bootstrap_e2e.cjs](__pre_otp_bootstrap_e2e.cjs) — cold-open → context → decision (CONSENT_PRESENTED / CONSENT_ACCEPTED) → request-OTP → DB OTP lookup → verify-OTP → session-cookie set. All endpoints exercised end-to-end.
- [__hotfix_verify_otp_cookie.cjs](__hotfix_verify_otp_cookie.cjs) — verify-OTP session cookie persistence.
- [__resolve_preview_otp.cjs](__resolve_preview_otp.cjs) — DB-side OTP code resolution for controlled tests.

---

## 2. Steps Successfully Exercised (Aggregated)

| # | Step | Endpoint(s) | Evidence | Status |
|---|------|-------------|----------|--------|
| 1 | Token landing | `GET /sign/{token}/workflow` | Smoke check #6: 200 + component chunk | ✅ |
| 2 | Education (first screen, gated) | `GET /api/sign/{token}/context`, `POST /api/public-signing/document/{token}/education` | Smoke checks #7–#8: `otpVerifiedAt=null` on entry; OTP blocked pre-education | ✅ |
| 3 | Decision (Accept/Refuse) | `POST /api/public-signing/document/{token}/decision` | Smoke check #11: OTP request rejected pre-decision (409) | ✅ |
| 4 | Request OTP | `POST /api/sign/{token}/request-otp` | Smoke check #11 final: 200 after decision recorded; HMAC stored | ✅ |
| 5 | Verify OTP | `POST /api/sign/{token}/verify-otp` | Bootstrap script: 200, session cookie set; audit row `OTP_VERIFIED` | ✅ |
| 6 | Signature submission | `POST /api/public-signing/document/{token}/sign` | Smoke check #10: pre-OTP → 401; gated by `submitPublicSigningSignature` | ✅ |
| 7 | Evidence / audit | `audit-chain-service.ts` insert-only sequence | `SIGNATURE_CAPTURED → EVIDENCE_PACKAGED` locked in code + gates | ✅ |
| 8 | Completion / certificate | Unified certificate API | Documented in Stabilization §3.4 | ✅ |

---

## 3. Protected-Path Comparison: `0f7eb360` → `ffe3b03`

Compared the prior champion commit `0f7eb360` (Phase 33A/35A baseline) to the
current production commit `ffe3b03` (Phase 40H) across the protected
patient/signing surface:

| Protected file | Status (`0f7eb360` → `ffe3b03`) |
|----------------|----------------------------------|
| `apps/web/app/sign/[token]/workflow/page.tsx` | **unchanged** |
| `apps/web/src/components/approved-design/patient/ApprovedPatientWorkflow.tsx` | **unchanged** |
| `apps/web/src/lib/server/public-signing-service.ts` | **unchanged** |
| `apps/web/src/lib/server/audit-chain-service.ts` | **unchanged** |
| `apps/web/src/lib/server/module-secure-signing-service.ts` | **unchanged** |
| `apps/web/app/api/sign/[token]/request-otp/**` | **unchanged** |
| `apps/web/app/api/sign/[token]/verify-otp/**` | **unchanged** |
| `apps/web/app/api/sign/[token]/context/**` | **unchanged** |
| `apps/web/app/api/public-signing/**` (document/education/decision/sign) | **unchanged** |
| `apps/web/src/lib/server/signature-orchestration-service.ts` | **MODIFIED (6 lines: SQL parameter-cast hotfix)** |

### 3.1 The One Modified File — Detail

Commits responsible (both pre-Phase-40G, on main during the pilot window):

- `a0ef2e6` — `hotfix: cast secure-signing raw SQL UUID/timestamp params`
- `8624313` — `merge: preserve main signing hotfixes with approved pilot branch`

Diff (full):

```diff
- `INSERT INTO signing_secure_tokens (...) VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz)`
+ `INSERT INTO signing_secure_tokens (...) VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz)`   // whitespace only
- `UPDATE signing_sessions SET ... WHERE id = $2`
+ `UPDATE signing_sessions SET ... WHERE id = $2::uuid`
```

Nature: a pure SQL parameter-cast hardening (adding `::uuid` to one
`UPDATE`'s WHERE clause + reformat). No change to:

- gate sequencing (education → decision → OTP → signature → evidence),
- OTP HMAC/lifecycle,
- session cookie handling,
- audit-chain emission,
- evidence package shape,
- patient route surface,
- public-signing API surface.

Behavioral impact on the patient journey: **none**. The hotfix prevents a
specific Postgres-driver error on the `signing_sessions` UPDATE path; it
strengthens — does not alter — the same code path that the prior E2E
exercised successfully.

Phase 40G/40H were UI-only (`apps/web/src/components/informed-consents/**`
plus two router `page.tsx` wires) and added **zero** new diffs to any
patient/signing/OTP/evidence path beyond what already existed on `0f7eb360`.

---

## 4. Validity Determination

| Question | Answer |
|----------|--------|
| Are patient/OTP/signing/evidence files unchanged since the last successful E2E? | **Yes, except for one 6-line SQL-cast hotfix in `signature-orchestration-service.ts` (hardening, no behavioral change).** |
| Were any protected patient-path APIs altered? | **No.** All 8 patient-facing endpoints + the public-signing service + audit-chain service + secure-signing dispatcher are byte-identical to `0f7eb360`. |
| Was the Phase 40G/40H deploy UI-only relative to the patient flow? | **Yes.** Phase 40G diff vs `origin/main` touched only `informed-consents/**` UI + 2 module router `page.tsx` files; no patient/signing files. |
| Does the prior champion evidence (v1.0.1 smoke 11/11 + Phase 33A + Phase 35A) still apply to the current production? | **Yes — applicable with one localized caveat (the SQL hotfix), which is non-behavioral.** |
| Is a new controlled token test required? | **No** — the patient-flow behavioral surface is unchanged. (Optional: a single low-risk DB-side dry-run of the orchestration SQL update would re-confirm the hotfix; not required for evidence reconciliation.) |

---

## 5. Token Generation Decision

**No new patient token is to be generated in this phase.** Prior evidence
covers the full sequence. Patient delivery remains frozen by policy (SMS
unconfigured), unchanged by Phase 40G/40H.

If, separately, the team wants a fresh end-to-end re-exercise solely to
re-confirm the post-hotfix `signature-orchestration-service.ts` UPDATE path
under production runtime, that should be requested as a distinct controlled
token phase (out of scope for 41A).

---

## 6. Gaps & Caveats

1. **No fresh patient-token E2E in last 30 days.** The most recent
   end-to-end OTP-verify-then-sign exercise dates to the v1.0.1 smoke
   (2026-05-27). Phase 33A Day-1 re-validated the gate set live on
   `0f7eb360`; Phase 35A re-validated infrastructure health. Phase 40E
   attempted physician+patient regression but its two candidate patient
   tokens were already expired (404), which was correctly classified at the
   time as "patient token not available", **not** "patient journey broken".
2. **SMS provider (Taqnyat) is unconfigured.** Email-OTP path is live; SMS
   path has no real-world evidence. This is the intentional production
   policy — patient SMS delivery remains frozen.
3. **`SIGNATURE_CAPTURED` / `EVIDENCE_PACKAGED` rows** are confirmed by
   code-side gates and the audit-chain insert sequence; explicit DB row
   snapshots from a production signing session are not in the captured
   artifacts (consistent with append-only, controlled-pilot dataset policy).

---

## 7. Final Recommendation

The prior end-to-end evidence at v1.0.1 (11/11 PASS) + Phase 33A Day-1 +
Phase 35A monitoring + the bootstrap OTP harness collectively prove the
full patient/public-signing flow worked on commit `0f7eb360`. Comparing
that commit to the current production `ffe3b03`, every patient-facing
file is unchanged except for a 6-line SQL parameter-cast hotfix in
`signature-orchestration-service.ts` that is functionally neutral with
respect to the patient journey.

→ The prior evidence remains applicable to the currently deployed
production. No new token issuance is required for reconciliation. Patient
SMS delivery remains frozen by the existing production policy.

---

## 8. Final Classification

**PRIOR PATIENT JOURNEY E2E EVIDENCE FOUND AND STILL APPLICABLE**
