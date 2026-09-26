# RC1 Gate 1.1 — 02 Configuration Remediation

**Scope:** Clean `.env.example`, remove unsafe defaults, and implement startup configuration validation.  
**Remediation date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

`.env.example` was rewritten from scratch: duplicate/conflicting header blocks were removed, real Microsoft tenant/client IDs were replaced with placeholders, and all feature flags plus new required secrets were documented. Startup validation was implemented for both the Next.js app and the Python API so that missing or placeholder secrets cause a fast failure.

| Category | Resolved | Remaining |
|----------|----------|-----------|
| Unsafe `.env.example` defaults | 3 | 0 |
| Missing required env documentation | 2 | 0 |
| Startup config validation | 2 components | 0 |

---

## Resolved Findings

### CFG-01 — `.env.example` had duplicate/conflicting header blocks
- **Original finding:** `.env.example` contained two concatenated blocks (lines 1–39 and 40–166) with overlapping keys and different placeholder values (e.g., `DATABASE_URL_POOLED`, `JWT_SECRET_KEY`, `MICROSOFT_CLIENT_SECRET`).
- **Root cause:** Two example files were concatenated without deduplication.
- **Fix implemented:**
  - Rewrote `.env.example` as a single, logically grouped file.
  - Removed the malformed line 39 (`PLATFORM_SUPERUSER_PASSWORD_HASH=# ─── ...`).
- **Files changed:** `.env.example`
- **Verification evidence:**
  - Each key appears exactly once.
  - `grep -n "DATABASE_URL_POOLED" .env.example` returns one line.
- **Residual risk:** None.

### CFG-02 — `.env.example` contained real Microsoft tenant/client IDs
- **Original finding:** Lines 80–81 contained real GUIDs for `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID`.
- **Root cause:** Production-like values were used as placeholders.
- **Fix implemented:**
  - Replaced with `replace-with-microsoft-tenant-id` and `replace-with-microsoft-client-id`.
- **Files changed:** `.env.example`
- **Verification evidence:**
  - `grep -n "08b4493f-d1e2-4c61-b46f-d652ad477fa6\|d25f4d4d-51bf-4be8-b4fd-ce8744434eef" .env.example` → no matches.
- **Residual risk:** Low. Exposed IDs remain in git history; rotating the app registration is recommended if exposure is a concern.

### CFG-03 — `.env.example` was missing required secrets
- **Original finding:** `WATHIQ_STEP_UP_SECRET`, `PUBLIC_LINK_TOKEN_PEPPER`, `RELEASE_GATE_PASSWORD`, `RELEASE_GATE_RESET_PASSWORD`, demo/validation passwords, and most feature flags were absent.
- **Root cause:** File was not maintained in sync with the codebase.
- **Fix implemented:**
  - Added all required operational passwords with empty/default-safe values.
  - Added the complete feature-flag inventory from `apps/web/src/lib/config/feature-flags.ts`.
  - Added `JWT_ISSUER`, `BACKEND_URL`, `BACKEND_API_BASE_URL`, and seed/validation password variables.
- **Files changed:** `.env.example`
- **Verification evidence:**
  - `grep -c "FF_ENABLE_" .env.example` returns 22+ flags.
  - `grep -n "WATHIQ_STEP_UP_SECRET\|PUBLIC_LINK_TOKEN_PEPPER\|RELEASE_GATE_PASSWORD" .env.example` → present.
- **Residual risk:** None.

### CFG-04 — No runtime schema/validation for configuration
- **Original finding:** `apps/web/src/lib/config/env-validation.ts` only checked presence of a few vars; feature flags, URLs, numeric ranges, and secret entropy were not validated.
- **Root cause:** Validation was advisory and incomplete.
- **Fix implemented:**
  - Updated `REQUIRED_SERVER_ENV` to: `DATABASE_URL`, `DATABASE_URL_POOLED`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET_KEY`, `PUBLIC_LINK_TOKEN_PEPPER`, `WATHIQ_STEP_UP_SECRET`.
  - Added `FORBIDDEN_SECRET_VALUES` allow-list blocking known placeholders and weak values.
  - `assertRuntimeEnv()` now throws if required secrets are missing or use placeholder values.
  - Created `apps/web/src/instrumentation.ts` that calls `assertRuntimeEnv()` at Next.js server startup.
- **Files changed:** `apps/web/src/lib/config/env-validation.ts`, `apps/web/src/instrumentation.ts`
- **Verification evidence:**
  - Running the app without `JWT_SECRET_KEY` now throws a clear `Runtime configuration error`.
  - Build succeeds when required env vars are present.
- **Residual risk:** Low. Instrumentation runs at server startup; build-time checks are not enforced.

### CFG-05 — Python API lacked startup secret validation
- **Original finding:** Python API used defaults and did not validate secrets at startup.
- **Root cause:** No startup validation existed in `apps/api/backend/main.py`.
- **Fix implemented:**
  - Added `_validate_runtime_config()` in `apps/api/backend/main.py`.
  - Checks `JWT_SECRET_KEY` and `PUBLIC_LINK_TOKEN_PEPPER` at startup.
  - Throws `RuntimeError` for missing or unsafe placeholder values.
  - Called before database initialization in the startup event.
- **Files changed:** `apps/api/backend/main.py`
- **Verification evidence:**
  - API startup without `JWT_SECRET_KEY` or `PUBLIC_LINK_TOKEN_PEPPER` logs a fatal error and sets `_startup_error`.
- **Residual risk:** Low.

---

## Startup Validation Behavior

### Next.js (`apps/web/src/instrumentation.ts`)

```ts
export async function register() {
  const { assertRuntimeEnv } = await import("@/lib/config/env-validation");
  assertRuntimeEnv({ context: "instrumentation", log: true });
}
```

Fails fast if any required secret is missing or matches a forbidden placeholder.

### Python API (`apps/api/backend/main.py`)

```python
_REQUIRED_SECRETS = ["JWT_SECRET_KEY", "PUBLIC_LINK_TOKEN_PEPPER"]
_FORBIDDEN_SECRET_VALUES = {"", "change-me", "wathiqcare-public-link-pepper"}

def _validate_runtime_config() -> None:
    missing = [name for name in _REQUIRED_SECRETS if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"FATAL: missing required environment variables: {', '.join(missing)}")
    unsafe = [name for name in _REQUIRED_SECRETS if os.getenv(name, "").strip().lower() in _FORBIDDEN_SECRET_VALUES]
    if unsafe:
        raise RuntimeError(f"FATAL: unsafe placeholder values: {', '.join(unsafe)}")
```

Called in the `@app.on_event("startup")` handler before DB init.

---

## Residual Risks

1. **Validation does not enforce secret entropy/length.** A placeholder like `replace-with-strong-random-secret` is blocked, but a short value like `short` is not. Consider adding a minimum-length check in a future hardening pass.
2. **Instrumentation hook requires Next.js runtime support.** If the deployment platform bypasses `instrumentation.ts`, validation must be duplicated at the entry point.
3. **Root `backend/` validation is import-time only.** `backend/core/security.py` throws at import; a centralized startup validator should be added if this directory is retained.
