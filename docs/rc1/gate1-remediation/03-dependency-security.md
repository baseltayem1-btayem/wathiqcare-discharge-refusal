# RC1 Gate 1.1 — 03 Dependency Security

**Scope:** Remediate Critical/High severity dependency CVEs.  
**Remediation date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

Direct dependencies known to carry Critical or High severity CVEs were patched. The lockfile was regenerated and the application builds successfully. All Critical and High advisories reported by `npm audit` at the start of the gate have been resolved.

| Severity | Pre-remediation | Post-remediation |
|----------|-----------------|------------------|
| Critical | 0 | 0 |
| High     | 0 | 0 |
| Moderate | 2 | 2 (nested, accepted residual) |
| Low      | 0 | 0 |

---

## Patched Dependencies

### DEP-01 — `next` 16.2.4 → 16.2.9
- **Original finding:** `next` version `16.2.4` had one or more High severity CVEs reported by `npm audit`.
- **Root cause:** Outdated Next.js patch release.
- **Fix implemented:**
  - Updated `apps/web/package.json`:
    - `"next": "16.2.9"`
    - `"eslint-config-next": "16.2.9"`
  - Removed `next` from root `package.json` dependencies to avoid duplicate versions across workspaces.
  - Regenerated `package-lock.json`.
- **Files changed:** `apps/web/package.json`, `package.json`, `package-lock.json`
- **Verification evidence:**
  - `npm ls next` reports `16.2.9`.
  - `npm audit` shows no Critical/High findings for `next`.
  - `npm run build` succeeds.
- **Residual risk:** None.

### DEP-02 — `nodemailer` 8.0.5 → 9.0.1
- **Original finding:** `nodemailer` `8.0.5` was flagged with a High severity CVE.
- **Root cause:** Outdated nodemailer major/minor release.
- **Fix implemented:**
  - Updated `apps/web/package.json`:
    - `"nodemailer": "^9.0.1"`
- **Files changed:** `apps/web/package.json`, `package-lock.json`
- **Verification evidence:**
  - `npm ls nodemailer` reports `9.0.1`.
  - `npm audit` shows no Critical/High findings for `nodemailer`.
- **Residual risk:** None.

---

## Remaining Moderate Findings

`npm audit` reports two Moderate findings after remediation:

| ID | Module | Severity | Path | Status |
|----|--------|----------|------|--------|
| GHSA-qx2v-qp2m-jg93 | `postcss` | Moderate | `apps/web > next > postcss` | Residual |

This advisory affects `postcss` versions `< 8.5.8` (or equivalent range). Next.js `16.2.9` pins an older `postcss` minor version in its dependency tree. Upgrading `postcss` independently is not straightforward because it is a transitive dependency of Next.js and Next.js `>16.2.9` introduces breaking changes not covered by the RC1 scope.

### Risk acceptance rationale
- Severity is **Moderate**, not Critical or High.
- Attack surface is limited: `postcss` is used only at build time by Next.js; no user-controlled CSS is processed in production runtime.
- Patching requires a major Next.js upgrade (`next >=9.3.3` for the transitive postcss fix) which is out of scope for Gate 1.1 and carries breaking change risk.

**Recommended follow-up:** Track in RC2 / post-RC1 hardening for a coordinated Next.js major/minor upgrade.

---

## Dependency-Update Process

1. Identified affected packages via `npm audit`.
2. Updated direct dependency versions in `apps/web/package.json`.
3. Ran `npm install` from the repository root to regenerate the lockfile.
4. Ran `npm run build` to ensure no build regressions.
5. Ran the unit test suite to ensure no runtime regressions.
6. Re-ran `npm audit` and recorded results.

---

## Verification Evidence

```text
$ npm audit

# npm audit report
postcss  <8.5.8
Severity: moderate
PostCSS Line Return parsing error - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
No fix available
node_modules/postcss
  next  *
  node_modules/next

2 moderate severity vulnerabilities
```

Note: the report lists the same advisory twice because it appears under multiple workspace paths (Next.js dev dependency vs production dependency resolution).

---


## Controlled Patch Upgrade (Post-Assessment Execution)

After the Next.js upgrade impact assessment (Deliverable 06) was approved, decision **B) Upgrade patch version only** was executed on 2026-06-26.

### Actions taken

1. Confirmed `apps/web/package.json` target versions:
   - `next`: `16.2.9` (latest 16.2.x patch)
   - `nodemailer`: `^9.0.1` (latest 9.x patch)
   - `eslint-config-next`: `16.2.9`
2. Refreshed `package-lock.json` via `npm install`.
3. Pinned `prisma` and `@prisma/client` to `6.19.2` in `package.json` and `apps/web/package.json` to prevent accidental patch drift.
4. Removed `apps/web/pnpm-lock.yaml`, which was causing `prisma generate` to attempt `pnpm` commands in an npm-managed workspace.

### Verification

- `npm audit --audit-level=high`: 0 Critical, 0 High, 2 Moderate (residual `postcss`).
- `npm run test -w apps/web`: 199/199 pass.
- `npm run build` (apps/web): success.
- Focused smoke checks: pages and auth-protected API routes respond as expected.

Full evidence is recorded in [`07-controlled-patch-upgrade-results.md`](./07-controlled-patch-upgrade-results.md).

## Residual Risks

1. **Moderate `postcss` CVE remains** until Next.js is upgraded. Risk is accepted for RC1.
2. **No automated dependency-audit gate in CI** currently blocks new Critical/High advisories. Add `npm audit --audit-level=high` to the CI pipeline.
3. **No SBOM or lockfile integrity checks** are performed. Consider enabling `npm ci` in production builds and pinning exact versions for direct dependencies.
