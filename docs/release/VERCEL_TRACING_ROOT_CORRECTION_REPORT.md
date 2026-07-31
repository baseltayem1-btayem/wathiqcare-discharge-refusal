# WathiqCare Vercel Tracing-Root Correction Report

## Root cause

The Vercel Project Root Directory for this project is `apps/web`. During a Preview build Vercel runs the build command with `process.cwd()` equal to `/vercel/path1` (the app root).

Both `apps/web/next.config.js` and `apps/web/next.config.ts` previously computed the tracing root as:

```js
const monorepoRoot = path.resolve(process.cwd(), "../..");
```

Under `/vercel/path1`, `path.resolve("/vercel/path1", "../..")` resolves to the filesystem root `/`. Next.js then used `/` as `outputFileTracingRoot`, causing the trace to cover the entire container and producing the duplicated path `/vercel/path1/vercel/path1/.next/routes-manifest-deterministic.json` when Vercel packaged the output.

Additionally, `apps/web/vercel.json` overrode `outputDirectory` to `".next"`. With the Next.js framework preset already selected, this override was unnecessary and could interfere with the framework's own output packaging.

## Vercel Root Directory interaction

- The active project-level Vercel configuration is `apps/web/vercel.json` because the Vercel Project Root Directory is `apps/web`.
- `vercel.json` at the repository root is **legacy/secondary configuration** for this project. It is not active because the project does not build from the repository root.
- The root `vercel.json` was left unchanged. The active `apps/web/vercel.json` had its `outputDirectory` override removed so the Next.js framework preset owns output packaging.

## Files changed

- `apps/web/next.config.js`
  - Replaced `path.resolve(process.cwd(), "../..")` with the `resolveTracingRoot()` helper.
  - Uses the helper's `contractsInclude` value so the include glob is correct for the chosen root.
- `apps/web/next.config.ts` **deleted**
  - Next.js resolves `next.config.js` before `next.config.ts`, so `.js` was the active config. The `.ts` file was a contradictory duplicate with different CSP, rewrite, and tracing settings. Removing it eliminates duplicate/conflicting behavior.
- `apps/web/vercel.json`
  - Removed `"outputDirectory": ".next"`.
  - Kept the build command and deterministic-routes-manifest post-step.
- `apps/web/scripts/resolve-tracing-root.cjs` **new**
  - Small, tested helper that resolves the tracing root safely.
- `apps/web/src/lib/server/resolve-tracing-root.test.ts` **new**
  - Focused tests for Vercel, local monorepo, filesystem-root rejection, Windows path safety, and active Vercel config contract.
- `docs/release/VERCEL_TRACING_ROOT_CORRECTION_REPORT.md` **new** (this report).

## Corrected tracing-root contract

`apps/web/scripts/resolve-tracing-root.cjs` resolves the tracing root as follows:

1. Validate the supplied/current directory as the app root by requiring `package.json` with `name: "@wathiqcare/web"`.
2. Reject the filesystem root (`/` or `C:\`) as an app root.
3. On Vercel (`VERCEL=1` or `VERCEL_ENV` present) return the validated app root (`/vercel/path1`, i.e. `process.cwd()`). The contracts include glob stays `./contracts/**`.
4. Locally, walk upward from the app root and return the repository root only when a `package.json` names the monorepo (`wathiqcare`) or declares `workspaces`. The contracts include glob becomes `./apps/web/contracts/**` relative to the repo root.
5. If no valid repo marker exists, fall back to the validated app root. The helper never traverses to `/`.

No hard-coded `/vercel/path0`, `/vercel/path1`, `/etc`, `/usr`, `node_modules`, or `.next` mirroring is used.

## Validation results

### Focused tracing-root tests

```text
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

Covered:

1. `/vercel/path1` with `VERCEL=1` resolves to `/vercel/path1`, never `/`.
2. `/vercel/path1` never becomes `/vercel/path1/vercel/path1`.
3. Local `apps/web` resolves to the real repo root when validated.
4. Missing/invalid repo markers do not permit traversal to filesystem root.
5. Windows drive roots are recognized as filesystem roots.
6. Active `apps/web/vercel.json` has `framework: "nextjs"` and no `outputDirectory` override.
7. No hard-coded `/vercel/path0` or `/vercel/path1` workarounds in touched runtime/config files.

### Deterministic manifest script tests

```text
ℹ tests 14
ℹ pass 14
ℹ fail 0
```

### Full test suite

```text
ℹ tests 419
ℹ pass 416
ℹ fail 3
```

Failures (same baseline failures, unrelated to this change):

- `demo account access matrix matches expected visible modules`
- `module path resolver supports mounted module subroutes`
- `migration creates real unique signing idempotency index`

### Prisma validate

```text
The schema at prisma/schema.prisma is valid 🚀
```

Run with `DATABASE_URL=postgresql://placeholder:change-me@localhost:5432/change_me`.

### Local build

Completed successfully with:

```bash
DATABASE_URL="postgresql://placeholder:change-me@localhost:5432/change_me" npm run build
```

Observed output:

```text
[routes-manifest] wrote ...apps/web\.next\routes-manifest-deterministic.json
```

The deterministic manifest generation is preserved. No migrations were applied.

### TypeScript

`npx tsc --noEmit` reports many pre-existing errors in the broader codebase (the project uses `typescript.ignoreBuildErrors: true` for builds). Zero errors originate from the touched/new TypeScript file `src/lib/server/resolve-tracing-root.test.ts` or from the new CommonJS helper.

### ESLint

```bash
npx eslint next.config.js scripts/resolve-tracing-root.cjs src/lib/server/resolve-tracing-root.test.ts
```

Result: `0 errors, 0 warnings`.

### Git

```bash
git diff --check
```

Result: clean.

```bash
git status --short
```

```text
 M apps/web/next.config.js
 D apps/web/next.config.ts
 M apps/web/vercel.json
?? apps/web/scripts/resolve-tracing-root.cjs
?? apps/web/src/lib/server/resolve-tracing-root.test.ts
?? docs/release/VERCEL_TRACING_ROOT_CORRECTION_REPORT.md
```

No generated artifacts, secrets, binaries, or patient data are tracked.

## Remaining step

The next step is to push this branch and create a fresh Git-integrated Preview deployment. The failed deployment should **not** be redeployed; a new Preview will pick up the corrected config.

## Safety confirmation

- No `main`, merge, reset, amend, rebase, force, or history-rewrite operations performed.
- No dependency upgrades, `.env`/secrets changes, or Production actions performed.
- No push, deploy, redeploy, Vercel API calls, remote DB access, messaging, signing, or real patient data used.
- Commits `4196edb9`, `6e6552b4`, and `a56ea44f` are preserved.
- Approved consent PDFs were not removed.
