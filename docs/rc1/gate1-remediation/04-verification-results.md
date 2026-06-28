# RC1 Gate 1.1 — 04 Verification Results

**Scope:** Evidence that the Gate 1.1 remediations were applied and verified.  
**Verification date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Verification Summary

| Check | Tool / Command | Result | Status |
|-------|----------------|--------|--------|
| Dependency audit | `npm audit --audit-level=moderate` | 0 Critical, 0 High, 2 Moderate (accepted residual) | ✅ Pass |
| Hardcoded-secret scan | Custom `grep` patterns for known values and high-entropy tokens | 0 known hardcoded secrets in tracked source | ✅ Pass |
| Unit tests | `npm run test -w apps/web` | 199/199 passed | ✅ Pass |
| Production build | `npm run build` | Build ID generated | ✅ Pass |
| Git credential-artifact scan | `git ls-files` + grep | No tracked credential artifacts | ✅ Pass |

---

## 1. Dependency Audit

Command executed:

```bash
npm audit --audit-level=moderate
```

Output (abridged):

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

Interpretation:
- No Critical or High severity advisories remain.
- The two Moderate findings are the same `postcss` advisory resolved through two workspace paths (Next.js dependency tree).
- A fix requires a breaking Next.js upgrade (`next@9.3.3`), which is out of scope for Gate 1.1 and documented as residual risk.

---

## 2. Hardcoded-Secret Scan

Command executed:

```bash
grep -RInE 'wathiqcare-step-up-dev-secret|wathiqcare-public-link-pepper|Admin@Wathiqcare2026|WathiqCare@2026|DemoPlatformAdmin@2026|Test@Secure123!|DevPass123' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' --include='*.py' . \
  | grep -v node_modules | grep -v '\.next' | grep -v 'env-validation.ts' | grep -v 'main.py'
```

Result: **No matches.**

Additional high-entropy pattern scan (`sk_live`, `pk_live`, `AKIA...`, GitHub tokens, `Bearer ...`, JWT segments) across source files returned no production secrets.

The only remaining matches for the known placeholder strings are inside the forbidden-value lists in the startup validators (`apps/web/src/lib/config/env-validation.ts`, `apps/api/backend/main.py`), which is intentional.

---

## 3. Unit Tests

Command executed:

```bash
npm run test -w apps/web
```

Output (abridged):

```text
ℹ tests 199
ℹ suites 0
ℹ pass 199
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2692.7594
```

All 199 unit tests pass.

---

## 4. Production Build

Command executed:

```bash
npm run build
```

Result: Build completed successfully.

Evidence:

```text
BUILD_ID:
-_axUjTi46DiuxMTvlpl8
```

`apps/web/.next/BUILD_ID` was generated.

---

## 5. Tracked Credential-Artifact Scan

Command executed:

```bash
git ls-files | grep -Ei '\.env\.production|FINAL_LIVE_SMS|tmp-login-test|cookies\.txt|-prod-release-gate\.json'
```

Result: **No tracked credential artifacts.**

Previously removed files are no longer tracked:
- `.env.production.template`
- `FINAL_LIVE_SMS_VALIDATION_REPORT.md`
- `tmp-login-test.cjs`
- `apps/web/artifacts/release-gate/final-prod-release-gate.json`

---

## 6. Untracked Temporary Script Cleanup

Credential-bearing temporary scripts at the repository root were removed:

- `__mint_prod_signing_token.cjs`
- `__phase40d_capture.cjs`
- `__phase40e_capture.cjs`
- `__phase40g_capture.cjs`
- `__phase40h_prod_capture.cjs`
- `__phase43b_capture.cjs`
- `__phase43c_capture.cjs`
- `__phase43d_prod_capture.cjs`
- `__preview_landing_walkthrough.cjs`
- `__smoke_stabilization.cjs`

`.gitignore` was updated with `__*.cjs` and `__tmp_*.ts` to prevent future accidental commits of temporary scripts.

---

## 7. Controlled Patch Upgrade Verification

After the approved **B) Upgrade patch version only** decision, the patch-level state was re-verified on 2026-06-26.

| Check | Tool / Command | Result | Status |
|---|---|---|---|
| Patch-only version check | `npm ls next nodemailer eslint-config-next prisma @prisma/client` | `next@16.2.9`, `nodemailer@9.0.1`, `eslint-config-next@16.2.9`, `prisma@6.19.2`, `@prisma/client@6.19.2` | ✅ Pass |
| Dependency audit | `npm audit --audit-level=high` | 0 Critical, 0 High, 2 Moderate (accepted residual) | ✅ Pass |
| Unit tests | `npm run test -w apps/web` | 199/199 passed | ✅ Pass |
| Production build | `cd apps/web && npm run build` | `BUILD_ID`: `Fbnyky24DfRt83ZSkkUzp` | ✅ Pass |
| Focused smoke checks | `curl` against local production server | Pages return 200; auth APIs return 401/expected errors | ✅ Pass with observations |

Detailed results, rollback instructions, and the final verdict are in [`07-controlled-patch-upgrade-results.md`](./07-controlled-patch-upgrade-results.md).

## Residual Risks Observed During Verification

1. **Git history purge not performed.** Deleted secrets remain reachable through git history. A BFG/filter-repo purge is recommended before broader distribution.
2. **No dedicated secret-scanning tool** (e.g., `gitleaks`, `trufflehog`) was available in the local environment. Verification relied on grep patterns. CI should install a dedicated scanner.
3. **Moderate `postcss` CVE remains** (see Dependency Audit).
4. **Root `backend/` directory** still exists and was only partially hardened; full consolidation or removal is a Gate 1 technical-debt item outside Gate 1.1 scope.
