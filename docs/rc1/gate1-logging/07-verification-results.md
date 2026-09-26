# 07 — Verification Results

## Test Matrix

| Suite | Command | Result |
|-------|---------|--------|
| apps/web unit tests | `npm run test -w apps/web` | **221 passed, 0 failed** |
| Audit/chain tests | `cd apps/web && npx tsx --test src/lib/server/audit-foundation.test.ts src/lib/server/audit-chain-service.test.ts` | **12 passed, 0 failed** |
| Python backend tests | `cd apps/api && python -m pytest -q` | **220 passed, 0 failed** |
| Production build | `npm run build -w apps/web` | **success** |
| Lint (changed files) | `npx eslint <changed files>` | **0 errors, 3 pre-existing warnings** |
| Prisma generate | `npm run prisma:generate -w apps/web` | **success** |

## New Tests

- `apps/web/src/lib/server/runtime-observability.test.ts`
  - PHI string values are redacted.
  - Emails and phones are masked.
  - Secrets (`apiKey`, `password`, `otp`, `signatureDataUrl`, `authorization`) are redacted.
  - User and tenant identifiers are hashed.
  - Nested PHI in details objects is redacted.
  - Correlation ID falls back from `x-correlation-id`.
  - `x-runtime-correlation-id` is preferred over `x-correlation-id`.

## PHI Leakage Verification

- Ran full `apps/web` test suite and inspected output.
- No plain patient names, MRNs, national IDs, emails, phones, OTPs, signatures,
  or clinical notes appeared in test logs.
- The only remaining plain identifiers in test output are test fixture IDs
  (e.g., `tenant-1`, `case-1`) from a non-structured component log in
  `legal-case-pdf-service.ts`; these are not PHI and were not in scope for this
  gate.

## Lint

Changed-files lint produced only pre-existing warnings:

- `consent-library-service.ts:9` — `ConsentMethod` import unused.
- `public-signing-service.ts:19` — `ConsentMethod` import unused.
- `public-signing-service.ts:601` — `repairArabicMojibake` unused.

No new lint errors or warnings introduced.

## Health Endpoint Smoke Test

- `GET /api/health` route created and compiled successfully during build.
- Python `/health` and `/ready` endpoints remain available and pass their test
  coverage indirectly through the 220 Python tests.
