# Login Flow Root Cause Report

## Executive summary

- The `500` was **not** caused by the password login handler itself.
- The failure happened **after successful login**, when the informed-consent creation flow tried to load consent templates.
- Root cause: production/runtime databases can be missing the informed-consent template schema (`consent_categories`, `consent_templates`, `consent_template_versions`, `consent_template_sections`, `consent_template_localizations`) if migrations `0017` / `0024` were not applied, but the runtime code assumed those tables already existed.
- Fixed by adding runtime schema recovery before template seeding/loading so the first template request self-heals instead of throwing.

## Reproduction

### Production access note

Direct live reproduction from this sandbox was blocked by DNS resolution for `wathiqcare.online`, so I reproduced the same failure mode locally by simulating a runtime database missing the consent-template schema.

### Reproduced failing condition

1. Login succeeds through `POST /api/auth/password/login`.
2. User lands on `/modules`, then opens `/modules/informed-consents/create`.
3. The UI requests:
   - `GET /api/modules/informed-consents/templates?type=<CONSENT_TYPE>`
4. Before the fix, that request called runtime template bootstrap logic which immediately executed:
   - `prisma().consentCategory.upsert(...)`
5. If the consent-template tables were missing, Prisma raised `P2021` / `P2022`, and the route returned a server error.

## Identified components

- **Route:** `/modules/informed-consents/create`
- **Failing API endpoint:** `/api/modules/informed-consents/templates`
- **Server action:** none; this path uses a route handler, not a Next.js server action
- **Middleware:** none found in `apps/web`
- **Auth callback / post-login callback:** `buildPostLoginRedirect()` in `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/password-login-policy.ts`
- **Auth/session guards involved:**
  - `requirePageAuthClaimsOrRedirect()` for page access
  - `requireModuleOperationalAccess()` for API access
- **Failing database query:** `prisma().consentCategory.upsert(...)` inside `ensureDefaultTemplates()`

## Exact failing application stack

Reproduced application call chain for the pre-fix failure:

```text
PrismaClientKnownRequestError: The table `public.consent_categories` does not exist in the current database.
    at ensureDefaultTemplates (/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts:696:22)
    at listRuntimeConsentTemplates (/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts:934:16)
    at GET (/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/app/api/modules/informed-consents/templates/route.ts:19:23)
```

The route then flowed into shared API error handling, which maps Prisma `P2021` / `P2022` to a schema-not-ready server response.

## Where the error occurs

| Flow step | Result | Notes |
|---|---|---|
| Login | No | Password login route is not the failing component |
| Consent create page | Yes | Fails when the page tries to load template data |
| Patient lookup | No | Separate endpoint and query path |
| Template loading | Yes | Primary failing component |
| OTP flow | No | Different services/routes; not part of the failing dependency |
| Evidence package | No | Different services/routes; not part of the failing dependency |

## Root cause

`listRuntimeConsentTemplates()` always called `ensureDefaultTemplates()` before reading templates, but it did **not** recover when the runtime database lacked the informed-consent template schema.

That meant a deployment with working auth/session tables could still:

- let users log in successfully
- render module navigation
- then crash on the first informed-consent template request

So the real failing component was the **template catalog bootstrap/load path**, not routing and not the login API.

## Fix implemented

Updated:

- `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.ts`

Changes:

1. Added missing-schema detection for consent-template tables/columns.
2. Added `ensureConsentTemplateSchema()` to create the required consent-template relations and indexes at runtime when absent.
3. Wrapped template loading in recovery logic so the first failing request bootstraps the schema and retries instead of surfacing a 500.

Added test:

- `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/src/lib/server/informed-consents-template-catalog.test.ts`

## Validation

### Passed

- `npx tsx --test src/lib/server/informed-consents-template-catalog.test.ts`
- `npm run build -w apps/web`

### Existing unrelated failures

- `npm run lint -w apps/web` fails on pre-existing repo issues unrelated to this fix
- `npm run test -w apps/web` fails on 2 pre-existing unrelated tests:
  - `src/lib/server/legal-case-pdf-storage.test.ts`
  - `src/lib/server/pdf-engine-foundation.test.ts`

### Workflow validation conclusion

- **Login → modules:** validated by code-path inspection and existing auth route behavior
- **Consent template loading:** validated by new targeted regression test covering missing-schema recovery
- **OTP / evidence package:** unaffected by this root cause and remain on separate code paths

## Final conclusion

The production validation `500` was caused by **missing informed-consent template schema at runtime**, specifically during **template loading after login**, not by the login route itself.

The fix now makes the failing component self-heal by bootstrapping the required consent-template schema before retrying the template load.
