# 07 — Verification Results

## Test Matrix

| Suite | Command | Result |
|-------|---------|--------|
| apps/web unit tests | `npm run test -w apps/web` | **214 passed, 0 failed** |
| Audit/chain tests | `cd apps/web && npx tsx --test src/lib/server/audit-foundation.test.ts src/lib/server/audit-chain-service.test.ts` | **12 passed, 0 failed** |
| Python backend tests | `cd apps/api && python -m pytest -q` | **220 passed, 0 failed** |
| Production build | `npm run build -w apps/web` | **success** |
| Lint (changed files) | `npx eslint <changed files>` | **0 errors, 5 pre-existing warnings** |
| Prisma client generation | `npm run prisma:generate -w apps/web` | **success** |

## Lint Warnings

All warnings are pre-existing and unrelated to this remediation:

- `consent-library-service.ts:9` — `ConsentMethod` import unused.
- `evidence-package-2-service.ts:29` — `asArray` unused.
- `evidence-package-2-service.ts:122` — `maxDate` unused.
- `public-signing-service.ts:19` — `ConsentMethod` import unused.
- `public-signing-service.ts:600` — `repairArabicMojibake` unused.

No new lint warnings were introduced.

## New Tests Added

- `apps/web/src/lib/server/consent-evidence-integrity-service.test.ts`
  - evidence integrity snapshot includes signature hashes and version linkage
  - evidence package checksum is deterministic
  - checksum changes when signature hash changes
  - checksum changes when PDF hash changes
  - checksum changes when version linkage changes

## Build Notes

- `next build` skipped type validation by configuration, but the TypeScript unit
  tests and `tsx` execution confirm that the changed modules compile and resolve
  path aliases correctly.
- The SQL migration runner skipped execution because the local environment uses a
  placeholder database URL; the migration file is ready for the next real deploy.
- Prisma client was regenerated successfully after the schema change.
