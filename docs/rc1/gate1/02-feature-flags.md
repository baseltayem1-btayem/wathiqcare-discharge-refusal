# RC1 Gate 1 — 02 Feature Flags

**Scope:** Feature-flag registry, naming conventions, consumption patterns, tenant overrides, test coverage, and operational readiness.  
**Primary file reviewed:** `apps/web/src/lib/config/feature-flags.ts`  
**Review date:** 2026-06-26

---

## Executive Summary

The codebase has a well-designed tenant-aware flag override system, and new Clinical Knowledge Engine / Content Mapping routes are correctly gated. However, several legacy flags bypass the central registry, env-var naming is inconsistent, boolean parsing is fragmented across modules, and `.env.example` is incomplete. These issues create operational risk because feature toggles may behave differently than operators expect, and tenant isolation may be weaker than assumed.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 4 |
| Medium   | 5 |
| Low      | 2 |

---

## Findings

### FF-HIGH-01 — Inconsistent `FF_*` naming convention in central registry
- **Priority:** High
- **Description:** `apps/web/src/lib/config/feature-flags.ts` reads several flags without the documented `FF_` prefix:
  - `ENABLE_TABLET_SIGNATURE` (line 35)
  - `ENABLE_BIOMETRIC_SIGNATURE` (line 38)
  - `ENABLE_CLINICAL_AI_ASSISTANT` (line 48)
  - `ENABLE_DYNAMIC_CONSENT_ENGINE` (line 140)
  - `ENABLE_MODULE_SERVICE_ISOLATION` (line 260)
- **Risk:** Operators following the documented `FF_*` convention will set the wrong variables; defaults silently apply; docs drift from code.
- **Recommendation:** Rename all server-side flag env vars to `FF_*`; update `.env.example`, docs, and deployment scripts. Add an automated test asserting every flag key starts with `FF_ENABLE_` (except documented `NEXT_PUBLIC_FF_*`).
- **Estimated effort:** ½–1 day

### FF-HIGH-02 — Multiple independent boolean parsers with incompatible semantics
- **Priority:** High
- **Description:** At least four different boolean parsers exist:
  - `feature-flags.ts` lines 12–16: only `"1"` / `"true"` are truthy; `"yes"` → `false`
  - `ui-refresh-flag.ts` lines 29–30: `"1"` / `"true"` / `"on"` are truthy
  - `modules/consent-engine/engine/feature-gates.ts`, `lib/modules/informed-consents-release.ts`, `lib/server/trakcare/config.ts`, `lib/server/auth.ts`: `"1"` / `"true"` / `"yes"` / `"on"` are truthy
  - `lib/environment/environment.ts` lines 57–60: only `"1"` / `"true"` are truthy
- **Risk:** The same env value (e.g., `ENABLE_FOO=yes`) enables the feature in one subsystem and disables it in another, leading to unpredictable production behavior.
- **Recommendation:** Centralize one `parseEnvBool` utility in `lib/config` and reuse it everywhere; define the accepted truthy/falsy set explicitly.
- **Estimated effort:** ½ day

### FF-HIGH-03 — Core services read module-level env defaults and ignore tenant overrides
- **Priority:** High
- **Description:** Several core services import the module-level flag constant and never consult the tenant-resolved value:
  - `lib/core/signature-core.ts` line 16
  - `lib/core/pdf-core.ts` lines 12–15
  - `lib/core/audit-core.ts` line 12
  - `lib/core/ai-core.ts` line 13
  - `lib/server/informed-consent-clinical-ai-service.ts` lines 15, 20–22
- **Risk:** In a multi-tenant SaaS, these paths always use the env default, bypassing the `FeatureFlagOverride` (global/tenant/module) table.
- **Recommendation:** Where tenant context is available, pass the resolved tenant/module flag value into these services instead of importing the module-level constant. Keep module-level constants only for build-time or truly global concerns.
- **Estimated effort:** 1–2 days

### FF-HIGH-04 — Shadow feature flags read directly from `process.env` outside the registry
- **Priority:** High
- **Description:** Capability toggles are read directly from `process.env` outside the central registry:
  - `app/api/auth/password/signup/route.ts` line 5: `ENABLE_PUBLIC_PASSWORD_SIGNUP`
  - `lib/modules/informed-consents-release.ts` line 26: `ENABLE_INFORMED_CONSENTS`
  - `modules/consent-engine/engine/feature-gates.ts` line 13: `ENABLE_DYNAMIC_CONSENT_ENGINE`
  - `lib/server/uat-mock-encounters.ts` lines 79–81: `ENABLE_UAT_DEMO_DATA`, `ENABLE_UAT_MOCK_ENCOUNTERS`, `NEXT_PUBLIC_ENABLE_UAT_DEMO_DATA`
  - `lib/server/patient-search.ts` line 36: `ENABLE_UAT_MRN_ALIAS`
  - `lib/environment/environment.ts` lines 68–71: `ENABLE_TEST_ACCOUNTS`, `ENABLE_DEMO_MODE`, `ENABLE_LIVE_SMS`, `ENABLE_LIVE_TRAKCARE`
- **Risk:** These flags bypass the central registry, tenant overrides, consistent parsing, and documentation. They are easy to miss during operational reviews.
- **Recommendation:** Migrate all capability toggles into `feature-flags.ts` (or a validated `environment.ts` for environment-mode toggles) and consume only through named exports.
- **Estimated effort:** 1–2 days

### FF-MED-01 — `.env.example` contains duplicate / conflicting entries
- **Priority:** Medium
- **Description:** `.env.example` contains two concatenated header blocks with overlapping keys and different placeholder values, e.g.:
  - `DATABASE_URL_POOLED` (line 2 vs line 56)
  - `DATABASE_URL` (line 4 vs line 57)
  - `JWT_SECRET_KEY` (line 13 vs line 94)
  - `MICROSOFT_CLIENT_SECRET` (line 21 vs line 82)
- **Risk:** Depending on parser load order, the wrong placeholder or credential may take precedence; onboarding/dev-prod parity breaks.
- **Recommendation:** Remove the concatenated header block and keep a single, deduplicated, grouped `.env.example`.
- **Estimated effort:** ½ day

### FF-MED-02 — `.env.example` is missing most documented feature flags
- **Priority:** Medium
- **Description:** Only Clinical Content Platform V2 and Clinical Knowledge Engine flags are listed. Flags such as `FF_ENABLE_EXTERNAL_SIGNATURES`, `FF_ENABLE_SECURE_SIGNING_LINKS`, `FF_ENABLE_AI_ASSIST`, `FF_ENABLE_EVIDENCE_PACKAGES`, etc. are absent.
- **Risk:** Operators will not know flags exist and will rely on defaults.
- **Recommendation:** Generate/sync `.env.example` from `FEATURE_FLAGS` in `feature-flags.ts` so every flag has a documented env var, default, and one-line description.
- **Estimated effort:** ½ day

### FF-MED-03 — `clinical-content` feature-flag route ORs env default over tenant resolution
- **Priority:** Medium
- **Description:** `app/api/modules/clinical-content/feature-flag/route.ts` line 58–60 uses `globalMaster = ENABLE_CLINICAL_CONTENT_PLATFORM_V2 || resolvedValue`. If the env default is `true`, a tenant/module override set to `false` is ignored.
- **Risk:** Tenant-scoped overrides are ineffective for this module.
- **Recommendation:** Use only `resolved.resolvedValue` for tenant-scoped decisions; keep env defaults as fallback inputs to the resolver, not as overrides.
- **Estimated effort:** ½ day

### FF-MED-04 — `NEXT_PUBLIC_*` variables used for server-only or sensitive configuration
- **Priority:** Medium
- **Description:**
  - `lib/server/uat-mock-encounters.ts` line 81 reads `NEXT_PUBLIC_ENABLE_UAT_DEMO_DATA` server-side.
  - Legacy rejected code references `NEXT_PUBLIC_WHATSAPP_*` for WhatsApp configuration.
- **Risk:** `NEXT_PUBLIC_` values are inlined into client bundles. Server-only toggles and WhatsApp numbers should not be exposed to browsers.
- **Recommendation:** Rename server-only flags to non-`NEXT_PUBLIC_` names; remove or isolate `_legacy-rejected` code from the build.
- **Estimated effort:** ½–1 day

### FF-MED-05 — `vercel.json` hardcodes a build-time public flag
- **Priority:** Medium
- **Description:** Root `vercel.json` line 7 sets `"NEXT_PUBLIC_ENABLE_WORKFLOW_GUIDANCE": "true"`. Build-time `NEXT_PUBLIC_*` flags cannot be changed without a rebuild, and this flag is set at the root while `apps/web/vercel.json` does not define it.
- **Risk:** Bypasses the tenant-aware flag system and couples configuration to build time.
- **Recommendation:** Move to environment-specific Vercel env vars if runtime toggle is needed, or remove if unused. Document why it must be build-time.
- **Estimated effort:** ½ day

### FF-LOW-01 — Feature flag test coverage is minimal
- **Priority:** Low
- **Description:** `apps/web/src/lib/config/feature-flags.test.ts` only covers the `envBool` helper and asserts the existence of CKE flag keys. It does not validate defaults, naming consistency, or tenant resolution.
- **Risk:** Regressions in flag defaults or naming are not caught.
- **Recommendation:** Add tests that (a) verify every `FEATURE_FLAGS` key maps to an env var with the expected prefix, (b) verify default values match `.env.example`, (c) exercise tenant override resolution.
- **Estimated effort:** ½–1 day

### FF-LOW-02 — Temporary operational scripts directly mutate flags/tenant state
- **Priority:** Low
- **Description:** `scripts/set-cme-flag.mjs`, `scripts/temp-list-flags.mjs`, `scripts/temp-update-role.mjs`, and `apps/web/src/lib/server/__tmp_*.ts` directly mutate the database / feature flags and read local `.env` files.
- **Risk:** If accidentally committed or run in production, they can alter tenant state without audit controls.
- **Recommendation:** Delete temp scripts, move them to a protected `ops/` directory, or convert them into audited admin API endpoints.
- **Estimated effort:** ½ day

---

## Positive Observations

1. **Tenant flag override architecture is sound.** `tenant-flag-service.ts` resolves global → tenant → module overrides and returns a clear `TenantFlagResolution` shape.
2. **New CKE / Content Mapping routes are gated.** `app/api/modules/clinical-knowledge/procedures/route.ts`, `assembly/route.ts`, and `app/api/modules/informed-consents/content-mapping/resolve/route-handler.ts` all call `resolveFeatureFlag` and return soft-disabled responses when flags are off.
3. **Client flag hook fails safely.** `useClinicalKnowledgeFlags.ts` defaults all flags to `false` and surfaces errors instead of crashing.
4. **Security env audit exists.** `scripts/security-env-audit.mjs` scans for `NEXT_PUBLIC_*` secrets and artifact leaks.

---

## Gate 1 Exit Criteria for Feature Flags

1. Standardize all server-side flag env vars to the `FF_*` prefix.
2. Centralize boolean parsing and replace all ad-hoc parsers.
3. Migrate all shadow `process.env.ENABLE_*` reads into the central registry.
4. Deduplicate and complete `.env.example` from the `FEATURE_FLAGS` export.
5. Ensure tenant-resolved flags are used in core services where tenant context is available.
6. Fix `clinical-content/feature-flag` route override logic.

Feature-flag framework is production-ready; flag inventory and consumption patterns are not.
