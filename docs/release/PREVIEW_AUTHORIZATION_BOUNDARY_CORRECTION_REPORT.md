# Preview Authorization Boundary Correction Report

## Scope

This report documents the audit and correction of authentication/authorization boundaries for the informed-consents preview surface, executed against the specification at `C:/Users/basel/AppData/Local/Temp/wathiqcare-auth-boundary-20260715-003352.md`.

- Workspace: `C:/work/wathiqcare-conditional-witness-auth`
- Branch: `feature/patient-send-physician-final-step`
- Starting HEAD: `8f44cfa0ba34d62c3deac918c8bc9de5756b97e1`
- Specification SHA-256: `0f9d10c614e267055df0240f0dd04b602a831de34a2219467d69b66cca287756`
- Tree state: clean at start; no generated artifacts, secrets, or payload dumps tracked in the correction.

## Observed Anonymous Preview Status Codes

The following status codes were observed from an anonymous (no cookies) caller during Preview reconnaissance. Response values are intentionally not recorded.

- `GET /api/auth/me` → `401 Unauthorized`
- `GET /api/modules/informed-consents/templates` → `200 application/json`
- `GET /api/modules/informed-consents/timeline` → `500 Internal Server Error`
- `GET /modules/informed-consents` → `307 Temporary Redirect` to `/login`
- `GET /modules/informed-consents/settings` → `200 HTML`
- `GET /modules/informed-consents/settings-support` → `200 HTML`

## Root Cause Per Affected Route/Page

### `/api/modules/informed-consents/templates`

- The route called `requireModuleOperationalAccess`, so authorization was technically present.
- However, the entire handler was wrapped in a `try/catch` that treated **every** error—including `ApiError(401)` and `ApiError(403)`—as a trigger to fall back to the public approved-forms library and return `200`.
- Result: anonymous and unauthorized callers received a `200` response containing a template catalog instead of `401`/`403`.

### `/api/modules/informed-consents/timeline`

- The route called `requireModuleOperationalAccess` at the top, so authorization ran before database work.
- The route did **not** use the canonical `handleApiError` helper; thrown `ApiError` instances propagated uncaught to the Next.js runtime.
- Result: anonymous callers received `500 Internal Server Error` instead of `401`.

### `/modules/informed-consents/settings` and `/modules/informed-consents/settings-support`

- Both pages were async server components that rendered internal settings/support content without calling any server-side auth helper.
- No `requirePageAuthClaimsOrRedirect`, no module RBAC check, and no `AccessDenied` boundary.
- Result: anonymous callers saw the settings/support UI instead of being redirected to `/login`.

## Canonical Helpers Reused

All corrections reuse existing WathiqCare auth/session/RBAC primitives; no parallel auth system was introduced.

- `requireModuleOperationalAccess(request, "informed-consents")` from `@/lib/server/auth` for API route auth + module RBAC.
- `handleApiError(error)` from `@/lib/server/http` for canonical JSON error responses (`success`, `data`, `error`, `traceId`, `timestamp`).
- `requirePageAuthClaimsOrRedirect(nextPath)` from `@/lib/server/pageAuth` for server-component page auth (redirects anonymous callers to `/login?next=...&reason=...`).
- `canAccessModule("informed-consents", { role, platformRole })` from `@/lib/modules/catalog` for module RBAC.
- `AccessDenied` from `@/components/AccessDenied` for authenticated-but-unauthorized users.

## Exact Files Changed

### Corrected route implementations

- `apps/web/src/app/api/modules/informed-consents/templates/route.ts` — now delegates to `route-handler.ts`.
- `apps/web/src/app/api/modules/informed-consents/templates/route-handler.ts` — new; auth is performed first, `handleApiError` returns `401`/`403`, and authorized/DB-fallback behavior is preserved.
- `apps/web/src/app/api/modules/informed-consents/timeline/route.ts` — now delegates to `route-handler.ts`.
- `apps/web/src/app/api/modules/informed-consents/timeline/route-handler.ts` — new; auth first, `handleApiError` wraps all errors so anonymous calls get `401` instead of `500`.

### Corrected page implementations

- `apps/web/src/app/modules/informed-consents/settings/page.tsx` — now enforces `requireInformedConsentsPageAccess` and renders `AccessDenied` for unauthorized roles.
- `apps/web/src/app/modules/informed-consents/settings-support/page.tsx` — same protection applied.

### Shared helper

- `apps/web/src/lib/server/informed-consents-page-auth.ts` — new helper that composes `requirePageAuthClaimsOrRedirect` and `canAccessModule` for consistent settings/sub-page boundaries.

### Tests

- `apps/web/src/lib/server/informed-consents-templates-auth.test.ts`
- `apps/web/src/lib/server/informed-consents-timeline-auth.test.ts`
- `apps/web/src/lib/server/informed-consents-settings-page-auth.test.ts`

## Proof That Authorization Executes Before Database/Catalog/Service Work

- The new route handlers call `deps.requireModuleOperationalAccess` as the **first** statement inside the `try` block.
- Focused tests assert the call order:
  - For templates: `["auth", "db", "fallback"]`.
  - For timeline: `["auth", "db"]`.
- Additional focused tests assert that anonymous/unauthorized requests return `401`/`403` **without** the mock database or fallback function being invoked.

## Public Signing Routes Preserved

No public signing, token, or login routes were modified. The following remain untouched and intentionally public:

- `/api/public-signing/document/[token]/...`
- `/api/public/informed-consents/signing/[token]/final-pdf`
- `/api/sign/[token]/request-otp`
- `/api/sign/[token]/verify-otp`
- `/api/auth/password/login`
- `/api/auth/password/signup`
- `/api/modules/informed-consents/forms` (public approved-forms library, used as authorized fallback)

## Validation Results

### Focused authorization tests

```text
npx tsx --test src/lib/server/informed-consents-templates-auth.test.ts \
         src/lib/server/informed-consents-timeline-auth.test.ts \
         src/lib/server/informed-consents-settings-page-auth.test.ts

ℹ tests 18
ℹ pass 18
ℹ fail 0
```

Covered:

1. Anonymous templates request returns `401` and exposes no payload.
2. Templates authorization occurs before catalog/service loading.
3. Unauthorized authenticated role returns `403`.
4. Authorized role still receives the expected array response shape.
5. Anonymous timeline request returns `401`, not `500`.
6. Timeline authorization occurs before database access.
7. Settings and settings-support redirect anonymous users to `/login`.
8. Authenticated settings behavior is preserved for authorized roles.
9. Tenant isolation is enforced (`tenantId` is propagated to Prisma queries).
10. Public signing routes were unaffected (no changes to those files).

### Local build

```text
cd apps/web
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build
```

Result: success. SQL migrations were skipped automatically because the placeholder URL contains `localhost`; no migrations were applied.

### Full test suite

```text
npm run test -w apps/web

ℹ tests 437
ℹ pass 434
ℹ fail 3
```

The three failures are the known baseline failures:

- `demo-account-access.test.ts` — “demo account access matrix matches expected visible modules”
- `modules-catalog-routing.test.ts` — “module path resolver supports mounted module subroutes”
- `package1-idempotency.test.ts` — “migration creates real unique signing idempotency index”

No new failures were introduced.

### Prisma validation

```text
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
  npx prisma validate --schema=./prisma/schema.prisma

The schema at prisma\schema.prisma is valid 🚀
```

### TypeScript (differential)

```text
npx tsc --noEmit
```

The project contains pre-existing TypeScript errors in unrelated files. After filtering to touched/new files, **zero errors** were introduced in the changed or added files.

### ESLint (touched/new files)

```text
npx eslint <all changed/new files>
```

Result: zero errors and zero warnings.

### git diff --check

Result: clean (only line-ending advisory warnings; no whitespace errors).

## No External Action Confirmation

- No push, deploy, redeploy, or Vercel call was made.
- No remote database was accessed.
- No real SMS, email, signing, or patient data was used.
- No payload dumps, secrets, binaries, or generated artifacts were tracked.
- No main-branch, merge, reset, amend, rebase, force, or history-rewrite operation was performed.

## Remaining Step

Push the branch and create a fresh Git-integrated Preview deployment, then repeat the anonymous status-only checks to confirm:

- `GET /api/modules/informed-consents/templates` → `401 Unauthorized`
- `GET /api/modules/informed-consents/timeline` → `401 Unauthorized`
- `GET /modules/informed-consents/settings` → `307` redirect to `/login`
- `GET /modules/informed-consents/settings-support` → `307` redirect to `/login`
- Public signing routes and login route remain accessible as designed.
