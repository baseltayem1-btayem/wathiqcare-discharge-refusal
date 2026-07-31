# Preview Build Output Correction Report

## Scope

- Workspace: `C:/work/wathiqcare-conditional-witness-auth`
- Branch: `feature/patient-send-physician-final-step`
- Starting HEAD: `6e6552b4ccf852e1d8a433c38076d4419ad742a8`
- Target: correct the deterministic routes-manifest post-build logic so it no longer writes recursive host paths or copies the application root.

---

## Root Cause

`apps/web/scripts/write-deterministic-routes-manifest.cjs` attempted to "help" the Vercel build container by mirroring the application output into hard-coded `/vercel/path0` and `/vercel/path1` directories. It did this by:

1. Writing the deterministic manifest to multiple absolute `/vercel/path*` locations.
2. Writing placeholder `os-release` files under `/vercel/path0/etc/os-release`, `/vercel/path0/usr/lib/os-release`, `/vercel/path1/etc/os-release`, and `/vercel/path1/usr/lib/os-release`.
3. Copying `package.json` into nested mirror directories (`/vercel/path0/vercel/path0/package.json`, `/vercel/path1/vercel/path1/package.json`).
4. Recursively copying the entire `<appRoot>/.next` directory into `/vercel/path0/vercel/path0/.next` and `/vercel/path1/vercel/path1/.next`.
5. Enumerating every entry in the application root (except `.next`, `node_modules`, and `tsconfig.tsbuildinfo`) and copying each one into the nested mirror directories.
6. Creating `node_modules` symlinks inside the mirror directories that pointed to `/vercel/path0/node_modules` or `/vercel/path1/node_modules`.

When the script copied `<appRoot>` into `/vercel/path0/vercel/path0`, the source path itself contained a `vercel` segment (the destination), so the recursive copy attempted to copy a directory into its own descendant and failed with `EINVAL`. The script caught the error and logged a warning, but the build was already contaminated with host filesystem traversal and recursive output.

The correct contract is much simpler: Next.js already emits `.next/routes-manifest.json`; the post-build step should only read that file and write a deterministic reordering of it to `.next/routes-manifest-deterministic.json` inside the actual application `.next` directory.

---

## Exact Unsafe Paths Observed in the Previous Script

The previous implementation attempted to create or copy to:

- `/vercel/path0/.next/routes-manifest-deterministic.json`
- `/vercel/path0/vercel/path0/.next/routes-manifest-deterministic.json`
- `/vercel/path1/.next/routes-manifest-deterministic.json`
- `/vercel/path1/vercel/path1/.next/routes-manifest-deterministic.json`
- `/vercel/path0/etc/os-release`
- `/vercel/path0/usr/lib/os-release`
- `/vercel/path1/etc/os-release`
- `/vercel/path1/usr/lib/os-release`
- `/vercel/path0/vercel/path0/package.json`
- `/vercel/path1/vercel/path1/package.json`
- `/vercel/path0/vercel/path0/.next` (recursive copy of the real `.next`)
- `/vercel/path1/vercel/path1/.next` (recursive copy of the real `.next`)
- `/vercel/path0/vercel/path0/<every app-root entry>` (app-root mirror)
- `/vercel/path1/vercel/path1/<every app-root entry>` (app-root mirror)
- `/vercel/path0/vercel/path0/node_modules` -> `/vercel/path0/node_modules` (symlink)
- `/vercel/path1/vercel/path1/node_modules` -> `/vercel/path1/node_modules` (symlink)

None of these paths are part of the Next.js or Vercel output contract for this application.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/scripts/write-deterministic-routes-manifest.cjs` | Rewritten to enforce a single, validated output path. Removed all recursive copying, host traversal, `os-release` writing, `package.json` duplication, and `node_modules` symlinking. Exported testable helpers. |
| `apps/web/src/lib/server/write-deterministic-routes-manifest.test.ts` | New focused test suite covering deterministic output, fail-closed behavior, path traversal rejection, and proof that `/etc`, `/usr`, `/vercel`, `path0/path1`, `node_modules`, self-copy, and descendant-copy are impossible. |

No application source code, approved PDFs, contracts, secrets, generated build artifacts, or patient data were modified.

---

## Corrected Output Contract

The script now guarantees the following:

1. It resolves the application root by requiring a `package.json` whose `name` is exactly `@wathiqcare/web`.
2. It resolves the Next.js output directory as `<appRoot>/.next`.
3. It reads only `.next/routes-manifest.json`.
4. It validates that the source is a JSON object (not an array, primitive, or invalid text).
5. It writes exactly one file: `.next/routes-manifest-deterministic.json`.
6. The output JSON has all object keys sorted recursively, producing deterministic bytes for the same logical source.
7. It fails closed (exit code `1`) if the source is missing or invalid.
8. It never enumerates filesystem roots, `/etc`, `/usr`, `/vercel`, `path0/path1`, parent directories, or `node_modules`.
9. It never copies the application root, `.next`, or any other directory.
10. It never creates symlinks.
11. It uses only `path.resolve`/`path.join`, so it works with both POSIX and Windows path separators.

---

## Validation Results

### Focused routes-manifest tests

```bash
cd apps/web
npx tsx --test src/lib/server/write-deterministic-routes-manifest.test.ts
```

Result:

```
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 455.2518
```

Covered:

- `sortKeysDeep` recursively sorts object keys and preserves arrays/scalars.
- `isValidJsonObject` accepts objects and rejects arrays/primitives/invalid JSON.
- `toDeterministicContent` produces stable formatting.
- `isInsideBase` accepts safe paths and rejects traversal for both POSIX and Windows separators.
- `resolveAppRoot` validates the `@wathiqcare/web` package name.
- `resolveNextDir` returns `<appRoot>/.next`.
- Valid source manifest produces exactly one new file (`.next/routes-manifest-deterministic.json`).
- Missing source fails closed (`SOURCE_MANIFEST_MISSING`).
- Invalid source fails closed (`SOURCE_MANIFEST_INVALID`).
- Array-only source fails closed.
- No `/etc`, `/usr`, `/vercel`, `path0/path1`, or `node_modules` files/symlinks are created.
- Source/output paths cannot traverse out of `.next`.
- The script never copies the app root or creates descendant mirrors.

### Local build

```bash
cd apps/web
DATABASE_URL=postgresql://change-me npm run build
```

Result: **build completed successfully**.

Observed post-build log:

```
[routes-manifest] wrote C:\work\wathiqcare-conditional-witness-auth\apps\web\.next\routes-manifest-deterministic.json from C:\work\wathiqcare-conditional-witness-auth\apps\web\.next\routes-manifest.json
```

The SQL migration step correctly skipped because the placeholder `DATABASE_URL` was detected as local/placeholder. No remote database or real migration was applied.

Verification that no unsafe paths were created inside `.next`:

```bash
find .next -maxdepth 4 -type d | grep -iE "vercel|etc|usr|path0|path1|node_modules"
# => NO_UNSAFE_PATHS
```

The generated deterministic manifest is valid JSON with recursively sorted top-level keys (`appType`, `basePath`, `caseSensitive`, ...).

### Full test suite

```bash
cd apps/web
npm test -- --reporter=spec
```

Result:

```
ℹ tests 409
ℹ suites 0
ℹ pass 406
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 28782.4708
```

The 14 new focused tests increased the baseline totals from `395/392/3` to `409/406/3`. The three failures are the unchanged baseline failures documented in `docs/release/PATIENT_SEND_PHYSICIAN_FINAL_STEP_IMPLEMENTATION_REPORT.md`:

1. `src/lib/server/demo-account-access.test.ts` — demo account access matrix mismatch (`promissory-notes` vs `wathiqnote`).
2. `src/lib/server/modules-catalog-routing.test.ts` — mounted module subroute resolves to `wathiqnote` instead of `promissory-notes`.
3. `src/lib/server/package1-idempotency.test.ts` — unique idempotency index partial-on-non-null-keys assertion.

### Prisma validate

```bash
cd apps/web
DATABASE_URL=postgresql://change-me npx prisma validate --schema=./prisma/schema.prisma
```

Result:

```
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

### Differential TypeScript

```bash
cd apps/web
npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "write-deterministic-routes-manifest"
```

Result: no TypeScript errors in the touched/new files.

Note: the project contains pre-existing TypeScript errors in unrelated files (mostly in `src/components/informed-consents/production-workspace`), which are already ignored during builds via `typescript.ignoreBuildErrors: true`.

### ESLint

```bash
cd apps/web
npx eslint scripts/write-deterministic-routes-manifest.cjs src/lib/server/write-deterministic-routes-manifest.test.ts
```

Result: **zero errors, zero warnings**.

### Git diff check

```bash
git diff --check
```

Result: no whitespace errors. The only Git notice is the standard Windows LF-to-CRLF warning for the modified `.cjs` file; no diff-check failures.

---

## Node 20 and pdfjs-dist Engine Warning Assessment

- Local Node version during validation: `v24.14.1`.
- `pdfjs-dist@6.1.200` declares `engines.node: ">=22.13.0 || >=24.0.0"`.
- The root `package.json` currently declares `engines.node: ">=20.11.0"`.

On Vercel, the default Node runtime may still be 20.x, which will produce a deprecation/engine-mismatch warning. This warning is separate from the build-output failure addressed here; it did not cause the recursive `/vercel/path*` copying. However, because `pdfjs-dist` now requires Node >= 22.13, the project should move the Vercel production runtime to Node 24 before the Production release and verify the full Preview test suite there.

This package intentionally does **not** update dependencies or change Vercel project settings remotely. No `package.json` engine field was changed because doing so could alter install/build behavior for other contributors and is not required to fix the immediate output-path bug.

---

## Remaining Preview Step

The only remaining external action is a Vercel project configuration change: update the Vercel project Node.js runtime to version 24 and trigger a Preview deployment to confirm that:

1. The recursive `/vercel/path*` output is gone.
2. Only `.next/routes-manifest-deterministic.json` is produced by the post-build script.
3. The Preview build completes without the previous deployment error.

This change is documented here but not performed by this package, per the safety constraints.

---

## Safety Confirmation

This package performed only the following:

- Read the authoritative specification and verified its SHA-256, branch, HEAD, and clean tree.
- Rewrote one post-build script and added one focused test file.
- Ran local validation (focused tests, full suite, build, Prisma validate, TypeScript, ESLint, git diff-check).
- Created this report.
- Committed the change with the required subject.

This package did **not**:

- Push to a remote.
- Deploy to Vercel or call any Vercel API.
- Connect to a remote database or apply migrations to a real database.
- Send real messages, perform real signing, or process real patient data.
- Modify `.env`/secrets files.
- Download or update dependencies.
- Rewrite, amend, rebase, reset, or force any commit history.
- Remove approved PDFs.
- Disable security checks or hide a failing build.
- Track generated build output, binaries, or patient data.

Commits `4196edb9` and `6e6552b4` remain intact and reachable.
