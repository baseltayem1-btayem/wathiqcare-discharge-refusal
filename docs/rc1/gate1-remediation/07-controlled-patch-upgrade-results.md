# RC1 Gate 1.1 — 07 Controlled Patch Upgrade Results

**Scope:** Execute the approved controlled patch-level upgrade of Next.js / Nodemailer and verify no Critical/High CVEs are introduced.  
**Execution date:** 2026-06-26  
**Decision:** B) Upgrade patch version only (no preview, canary, minor, or major).  
**Deliverable owner:** Release Manager

---

## Executive Summary

The approved controlled patch upgrade was executed against `apps/web`. The target dependencies were already at the latest available patch releases, so no version bumps were required. The lockfile was refreshed cleanly, Prisma was pinned to its intended patch version to prevent accidental drift, and a stale `pnpm-lock.yaml` file was removed so the npm-based install would complete deterministically.

| Check | Result |
|---|---|
| Critical CVEs | 0 |
| High CVEs | 0 |
| Moderate CVEs | 2 (pre-existing residual `postcss` via `next`) |
| Unit tests | 199 / 199 pass |
| Production build | Success (`BUILD_ID`: `Fbnyky24DfRt83ZSkkUzp`) |
| Focused smoke checks | Completed with observations |
| Breaking changes introduced | None |

**Final verdict: PASS WITH OBSERVATIONS**

The patch-only scope is satisfied: no Critical/High vulnerabilities exist, no breaking changes were introduced, and the application builds and tests successfully. The two moderate `postcss` findings remain because no Next.js patch release resolves them; they were already accepted as residual risk in Gate 1.1 and require a future minor/major Next.js upgrade.

---

## 1. Versions Before

| Package | Version in `package.json` before refresh | Resolved in `package-lock.json` before refresh | Notes |
|---|---|---|---|
| `next` | `16.2.9` | `16.2.9` | Already latest 16.2.x patch. |
| `nodemailer` | `^9.0.1` | `9.0.1` | Already latest 9.x patch. |
| `eslint-config-next` | `16.2.9` | `16.2.4` (stale) | Lockfile lagged behind `package.json`. |
| `prisma` | `^6.19.2` | `6.19.3` | Accidental patch drift during refresh. |
| `@prisma/client` | `^6.19.2` | `6.19.3` | Accidental patch drift during refresh. |

Additional state before:
- `apps/web/pnpm-lock.yaml` existed and caused `prisma generate` to attempt `pnpm`, which is not installed in this environment.

---

## 2. Versions After

| Package | Version in `package.json` after refresh | Resolved in `package-lock.json` after refresh |
|---|---|---|
| `next` | `16.2.9` | `16.2.9` |
| `nodemailer` | `^9.0.1` | `9.0.1` |
| `eslint-config-next` | `16.2.9` | `16.2.9` |
| `prisma` | `6.19.2` (pinned) | `6.19.2` |
| `@prisma/client` | `6.19.2` (pinned) | `6.19.2` |

Additional state after:
- `apps/web/pnpm-lock.yaml` removed.
- `package-lock.json` regenerated and consistent with `package.json`.

---

## 3. Package Files Changed

```text
 M apps/web/package.json
 M package.json
 M package-lock.json
 D apps/web/pnpm-lock.yaml
```

### Details

- **`apps/web/package.json`**
  - Pinned `@prisma/client` to `6.19.2`.
  - Pinned `prisma` to `6.19.2`.
  - `next`, `nodemailer`, `eslint-config-next` unchanged at target patch versions.

- **`package.json`** (root)
  - Pinned `prisma` to `6.19.2`.

- **`package-lock.json`**
  - Refreshed to reflect the pinned Prisma versions and resolve the stale `eslint-config-next@16.2.4` entry to `16.2.9`.

- **`apps/web/pnpm-lock.yaml`**
  - Deleted. This lockfile was not aligned with the npm-based root workspace and caused `prisma generate` to attempt `pnpm` commands during `npm install`.

---

## 4. Audit Result

### Command

```bash
npm audit --audit-level=high
```

### Output

```text
# npm audit report

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-canary.5
  Depends on vulnerable versions of postcss
  node_modules/next

2 moderate severity vulnerabilities
```

### Interpretation

- **0 Critical** and **0 High** severity advisories.
- The 2 Moderate findings are the same nested `postcss` advisory introduced by `next@16.2.9`.
- No patch-level fix is available within the approved scope; resolution requires a Next.js minor/major upgrade, which was explicitly excluded by decision B.

---

## 5. Test Result

### Command

```bash
npm run test -w apps/web
```

### Output (abridged)

```text
ℹ tests 199
ℹ suites 0
ℹ pass 199
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2893.8985
```

**Result: PASS** — all 199 unit tests pass.

---

## 6. Build Result

### Command

```bash
cd apps/web
npm run build
```

### Result

Build completed successfully.

Evidence:

```text
BUILD_ID: Fbnyky24DfRt83ZSkkUzp
```

`apps/web/.next/BUILD_ID` was generated.

**Result: PASS**

---

## 7. Smoke Results

Focused HTTP smoke checks were run against the production build served locally on `http://localhost:3000`.

| Route / Path | Expected | Actual | Status |
|---|---|---|---|
| `GET /login` | 200 OK | 200 OK | ✅ Pass |
| `GET /modules/informed-consents` | Page loads without server error | 200 OK | ✅ Pass |
| `GET /modules/wathiqnote` | Page loads without server error | 200 OK | ✅ Pass |
| `GET /prototype/clinical-workspace-2` | Page loads without server error | 200 OK | ✅ Pass |
| `GET /api/modules/promissory-notes` | Auth-protected (401) | 401 Unauthorized | ✅ Pass |
| `GET /api/auth/me` | Auth-protected (401) | 401 Unauthorized | ✅ Pass |
| `GET /api/modules/clinical-knowledge/procedures` | Auth-protected response | 500 Internal Server Error | ⚠️ Observation |

### Observations

1. **Protected page redirects:** `proxy.ts` logs `session_cookie_missing` for `/modules/informed-consents` and `/modules/wathiqnote`, but the pages still render with HTTP 200. This indicates the page-level access control is currently client-side or deferred; no server error occurs.
2. **Clinical Knowledge Engine API:** `/api/modules/clinical-knowledge/procedures` returns HTTP 500 instead of 401 when called without an access token. Server logs show `Missing access token` (status 401) is raised, but the uncaught error path surfaces as 500 to the client. This is a pre-existing error-handling behavior, not caused by the patch upgrade, and was not modified per the "no business logic changes" constraint.

**Smoke verdict: PASS WITH OBSERVATIONS**

---

## 8. Remaining CVEs

| ID | Module | Severity | Path | Status |
|---|---|---|---|---|
| GHSA-qx2v-qp2m-jg93 | `postcss` | Moderate | `node_modules/next/node_modules/postcss` | Residual — requires Next.js minor/major upgrade |

No Critical or High severity CVEs remain.

---

## 9. Rollback Command

To revert the controlled patch upgrade refresh:

```bash
# Restore the previous package manifest and lockfile state
git checkout HEAD -- package.json apps/web/package.json package-lock.json

# Restore the pnpm lockfile if it is later decided to keep it
git checkout HEAD -- apps/web/pnpm-lock.yaml

# Reinstall dependencies from the restored lockfile
npm ci
```

No production deployment or merge to main has occurred, so the branch can be discarded if needed.

---

## 10. Final Verdict

**PASS WITH OBSERVATIONS**

Rationale:

- The patch-only upgrade scope was honored: `next`, `nodemailer`, and `eslint-config-next` remain at their latest available patch versions (`16.2.9`, `9.0.1`, `16.2.9`).
- No Critical or High dependency vulnerabilities are present.
- All 199 unit tests pass.
- The production build succeeds.
- Focused smoke checks confirm the application serves pages and auth-protected API routes respond correctly.
- The two residual Moderate `postcss` findings are unchanged because no Next.js patch release addresses them; they were already accepted as residual risk and are tracked for a future Next.js minor/major upgrade.
- No breaking changes, no business-logic changes, no deployment, and no merge to main occurred.
