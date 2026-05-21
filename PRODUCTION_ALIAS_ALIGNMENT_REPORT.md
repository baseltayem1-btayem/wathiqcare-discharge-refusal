# PRODUCTION ALIAS ALIGNMENT REPORT

## Status

**STOPPED — NO GO**

Critical validation did not pass, so no promotion was attempted.

## 1. Current production alias confirmation

- **Production domain:** `https://wathiqcare.online`
- **Current serving deployment URL:** **UNCONFIRMED**
- **Current serving commit SHA:** **UNCONFIRMED**
- **Age:** **UNCONFIRMED**
- **Sandbox limitation:** direct DNS/HTTP access to `wathiqcare.online` failed, and Vercel CLI access was unavailable from this environment.
- **Closest repository production candidate:** `origin/main` at `12674d0e178ec09cebc22ce4600b4dc11f2aa0be`
  - Commit date: `2026-05-20T11:07:19Z`
  - Approximate age at assessment: `1 day, 11:59`

## 2. Latest internal pilot build candidate

- **Branch HEAD:** `7acba7da3445a0d6e9b0b6c886e935f96494e6c8`
  - Commit: `docs: avoid stale RCA SHA`
  - Commit date: `2026-05-21T23:03:14Z`
  - Approximate age at assessment: `0:03`
- **Latest web code change on this branch:** `8c10677a1a0030f11cf091c63bd53e60939c348c`
  - Commit: `fix: normalize informed consent template lookup`
  - Commit date: `2026-05-21T22:58:35Z`
  - Approximate age at assessment: `0:08`

### Informed consent fix status

- **Fix present in branch:** yes
- **Evidence:** `8c10677` updates template lookup normalization and matching in:
  - `apps/web/src/lib/server/informed-consents-template-catalog.ts`
  - `apps/web/src/lib/server/informed-consents-template-catalog.test.ts`
  - `apps/web/src/components/modules/InformedConsentsModulePageNew.tsx`
- **Intent of fix:** prevent the flow from stalling after consent-type selection when template aliases / specialty / department labels do not match exactly.
- **Runtime verification:** **NOT CONFIRMED** (promotion blocked before preview/production verification)

### Requested pilot content checks

- **Phase 13 guided consent journey:** partially evidenced by the informed consent flow UI, but not explicitly labeled as “Phase 13”
- **Phase 14 medical visuals:** not explicitly confirmed from repository markers
- **Phase 15 clinical content / governance:** governance-related routes/pages exist
- **Phase 16 clinical knowledge integration:** **not confirmed**; no explicit “Clinical Knowledge Center” route/string was found
- **Phase 17 clinical review / pilot validation:** **not confirmed**; requested Playwright spec `apps/web/tests/phase-17-pilot-review.spec.ts` is missing
- **Internal pilot dataset `IMC-2026-02000` to `IMC-2026-02024`:** **not fully present in code**
  - Present in repository: `02000, 02001, 02002, 02003, 02004, 02005, 02010, 02015, 02020, 02024`
  - Missing from repository search: `02006-02009, 02011-02014, 02016-02019, 02021-02023`
- **Banner `INTERNAL PILOT – TEST DATA ONLY`:** **not found**
  - Closest match found: `PREVIEW TEST MODE — NO REAL SMS OR EMAIL SENT`

## 3. Pre-promotion validation results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint -w apps/web -- --quiet` | **FAIL** | 6 existing lint errors, including `react-hooks/set-state-in-effect` and `no-explicit-any` |
| `npm run build -w apps/web` | **PASS** | Build completed successfully |
| `npm run validate:pilot-uat -w apps/web` | **BLOCKED / FAIL** | Missing DB connection env: `DATABASE_URL`, `DATABASE_URL_POOLED`, `DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` |
| `npx playwright test apps/web/tests/phase-17-pilot-review.spec.ts` | **FAIL** | `Error: No tests found.` Target spec file does not exist |

### Validation artifact

- `apps/web/artifacts/pilot-validation/pilot-validation-2026-05-21T23-13-04-191Z.json`

## 4. Preview deployment verification

**NOT RUN**

Blocked by:

1. Critical validation failures above
2. No confirmed preview deployment URL in sandbox
3. No working external DNS/HTTP access to `wathiqcare.online`
4. No Vercel credentials / reachable Vercel control plane from sandbox

## 5. Promotion action

- **Promotion attempted:** no
- **Promoted deployment URL:** none
- **Reason:** stop condition reached before promotion

## 6. Production-domain post-promotion verification

**NOT RUN**

The following could not be verified from this sandbox:

- `/api/health = 200`
- `/login` loads
- pilot users login successfully
- informed consent flow proceeds after selecting consent type
- internal pilot banner visible
- test MRNs searchable
- no real patient data present

## 7. Final assessment

- **Old deployment SHA:** **UNCONFIRMED live alias**; repository production-branch candidate is `12674d0e178ec09cebc22ce4600b4dc11f2aa0be`
- **New deployment SHA:** no deployment promoted
- **Promoted deployment URL:** none
- **Validation results:** build passed; lint failed; pilot UAT validation blocked on DB env; requested Playwright pilot-review test missing
- **Informed consent fix status:** code fix is present on branch in `8c10677`, but runtime verification is still pending
- **Pilot dataset status:** only a partial MRN subset is present in repository evidence, not the full `02000`–`02024` range
- **Final production URL status:** unverified; no promotion performed

## Recommendation

Do **not** promote anything to `https://wathiqcare.online` from this session.

Required before any promotion:

1. Confirm the actual live Vercel alias and deployment metadata
2. Provide working preview / production network access
3. Supply validated DB environment for `validate:pilot-uat`
4. Resolve the current lint failures
5. Restore or provide the required Phase 17 Playwright pilot-review spec
6. Confirm the exact internal pilot banner text and the full allowed MRN dataset
