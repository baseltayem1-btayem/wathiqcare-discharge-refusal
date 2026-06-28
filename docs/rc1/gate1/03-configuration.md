# RC1 Gate 1 — 03 Configuration

**Scope:** Environment variables, secrets management, runtime configuration validation, deployment configuration, and configuration drift.  
**Files reviewed:** `.env.example`, `.env.production.template` (status), `vercel.json`, `docker-compose.yml`, `apps/web/src/lib/config/env-validation.ts`, `apps/web/src/lib/environment/environment.ts`  
**Review date:** 2026-06-26

---

## Executive Summary

Configuration management is fragmented. `.env.example` is duplicated and incomplete, no runtime schema validates the full configuration surface, and several secrets or sensitive values are hardcoded or fall back to defaults. Production configuration is stored in a tracked template that cannot be audited safely. The lack of a single source of truth for configuration creates operational risk and makes RC1 sign-off difficult.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 3 |
| Medium   | 4 |
| Low      | 2 |

---

## Findings

### CFG-CRIT-01 — Default/hardcoded secrets in production paths
- **Priority:** Critical
- **Description:** Multiple secrets fall back to hardcoded values if environment variables are unset:
  - `apps/web/src/lib/server/security-policy-service.ts` lines 29–32: `STEP_UP_SECRET` defaults to `"wathiqcare-step-up-dev-secret"` if `WATHIQ_STEP_UP_SECRET` and `JWT_SECRET` are missing.
  - `apps/web/scripts/prod-release-gate.cjs` lines 15–16: `DEFAULT_PASSWORD` and `RESET_PASSWORD` default to `Admin@Wathiqcare2026!` / `Reset@Wathiqcare2026!` if env vars are missing.
  - `apps/api/backend/services/secure_link_service.py` lines 40, 60: `PUBLIC_LINK_TOKEN_PEPPER` defaults to `"wathiqcare-public-link-pepper"`.
  - `backend/core/security.py` line 12: `JWT_SECRET_KEY` defaults to `"change-me"`.
- **Risk:** An attacker can forge privileged tokens or authenticate with well-known backdoor credentials if any env var is omitted.
- **Recommendation:** Remove all default secrets; require these variables in production and fail startup if they are missing or below minimum entropy.
- **Estimated effort:** ½ day

### CFG-HIGH-01 — `.env.production.template` is treated as sensitive and not auditable
- **Priority:** High
- **Description:** The file is gitignored but currently tracked. It contains real production infrastructure values and is blocked from read access by sensitive-file policy, preventing reviewers from verifying that production env vars match `.env.example` or the flag registry.
- **Risk:** Production configuration cannot be reviewed; drift between template, docs, and deployed values is likely.
- **Recommendation:** Restructure the template to contain only placeholders (no real secrets) and commit a sanitized version; keep real values in a secret manager. Provide a redacted copy for reviewers.
- **Estimated effort:** ½ day

### CFG-HIGH-02 — No runtime schema/validation for configuration
- **Priority:** High
- **Description:** `apps/web/src/lib/config/env-validation.ts` only checks presence of core DB/auth vars. Feature flags, URLs, numeric ranges, enum values (e.g., `PAYMENT_PROVIDER`), and secret entropy are not validated. Typos in env vars silently fall back to defaults.
- **Risk:** Misconfigurations (e.g., malformed `DATABASE_URL`, invalid JWT algorithm, missing SMS token) are discovered at runtime rather than startup.
- **Recommendation:** Introduce a Zod schema for the full config surface, validate at startup, and fail fast on unknown/invalid values. This also enables auto-generated `.env.example`.
- **Estimated effort:** 1–2 days

### CFG-HIGH-03 — `NEXTAUTH_SECRET` required but unused
- **Priority:** High
- **Description:** `apps/web/src/lib/config/env-validation.ts` line 13 and `apps/web/src/lib/server/runtime-health.ts` line 11 list `NEXTAUTH_SECRET` as a required server env variable, but the application uses `JWT_SECRET_KEY` for authentication.
- **Risk:** Operational confusion and false-positive “missing secret” alerts; unnecessary dependency on a secret that provides no value.
- **Recommendation:** Remove `NEXTAUTH_SECRET` from the required list or migrate auth to NextAuth.
- **Estimated effort:** 15 minutes

### CFG-MED-01 — `.env.example` is duplicated and conflicting
- **Priority:** Medium
- **Description:** `.env.example` contains two concatenated blocks (lines 1–39 and 40–166) with overlapping keys and inconsistent placeholder values. Examples: `DATABASE_URL_POOLED` (line 2 vs 56), `JWT_SECRET_KEY` (line 13 vs 94), `MICROSOFT_CLIENT_SECRET` (line 21 vs 82).
- **Risk:** Wrong values may be used during onboarding; dev-prod parity breaks.
- **Recommendation:** Produce a single, deduplicated, alphabetically/grouped `.env.example` generated from the central config schema.
- **Estimated effort:** ½ day

### CFG-MED-02 — `.env.example` missing feature flags and integration config
- **Priority:** Medium
- **Description:** Most feature flags from `feature-flags.ts` are absent, and several integration variables (e.g., `FF_ENABLE_EXTERNAL_SIGNATURES`, `FF_ENABLE_EVIDENCE_PACKAGES`, `INTEGRATION_*` blocks) are not documented in the example.
- **Risk:** Operators rely on defaults and may be unaware of toggles that affect compliance or behavior.
- **Recommendation:** Sync `.env.example` with the central feature-flag registry and integration config schema.
- **Estimated effort:** ½ day

### CFG-MED-03 — `docker-compose.yml` has no application-level configuration mapping
- **Priority:** Medium
- **Description:** `docker-compose.yml` only defines Postgres. It references `POSTGRES_PASSWORD` but does not document where application env vars (feature flags, JWT secrets, SMS, S3) should be provided.
- **Risk:** Local Docker deployments rely on undocumented `.env` files and may silently run with insecure defaults.
- **Recommendation:** Add an `env_file` reference or comment block documenting required application configuration for local Docker usage.
- **Estimated effort:** 15 minutes

### CFG-MED-04 — `vercel.json` hardcodes a build-time public flag
- **Priority:** Medium
- **Description:** Root `vercel.json` line 7 sets `"NEXT_PUBLIC_ENABLE_WORKFLOW_GUIDANCE": "true"`. This flag is build-time only and is not present in `apps/web/vercel.json`.
- **Risk:** Configuration is coupled to the build; runtime toggling is impossible; tenant-aware flag system is bypassed.
- **Recommendation:** Move to environment-specific Vercel env vars if runtime toggle is needed, or remove if unused.
- **Estimated effort:** ½ day

### CFG-LOW-01 — `.env.example` exposes real Microsoft tenant/client IDs
- **Priority:** Low
- **Description:** `.env.example` lines 80–81 contain real GUIDs for `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID`.
- **Risk:** Exposes Entra tenant and application registration metadata.
- **Recommendation:** Replace with placeholder values; rotate the app registration if exposure is a concern.
- **Estimated effort:** 15 minutes

### CFG-LOW-02 — Local env files exist in working tree
- **Priority:** Low
- **Description:** `.env`, `.env.local`, `apps/web/.env`, and `apps/web/.env.local` are present in the working tree. They are gitignored but may contain real secrets.
- **Risk:** Accidental commit or leak during artifact upload.
- **Recommendation:** Verify they are never staged, use a secrets manager, and rotate any values that may have been exposed.
- **Estimated effort:** 1 hour

---

## Positive Observations

1. A central `env-validation.ts` module exists and checks required server env vars at runtime.
2. Feature flags are grouped and documented in `feature-flags.ts` with clear default semantics.
3. `docker-compose.yml` correctly uses variable substitution and a required-password guard for Postgres.

---

## Gate 1 Exit Criteria for Configuration

1. Eliminate all hardcoded/default secrets in production code.
2. Implement a runtime Zod schema that validates the full configuration surface and fails fast on unknown/invalid values.
3. Provide a single, deduplicated, complete `.env.example` synced from the config schema.
4. Restructure `.env.production.template` to be a sanitized, auditable placeholder file.
5. Remove or clarify `NEXTAUTH_SECRET` and `vercel.json` hardcoded flags.

Configuration management does not currently satisfy RC1 Gate 1.
