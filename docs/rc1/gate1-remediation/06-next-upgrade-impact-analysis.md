# RC1 Gate 1.1 — 06 Next.js Upgrade Impact Analysis

**Scope:** Compatibility assessment for upgrading the Next.js framework dependency before RC1 final.  
**Assessment date:** 2026-06-26  
**Deliverable owner:** Release Manager / Engineering Lead

---

## Executive Summary

The project currently runs Next.js 16.x across two packages:

| Package | `next` | `react` / `react-dom` | `eslint-config-next` |
|---|---|---|---|
| `apps/web` (primary app) | `16.2.9` | `19.2.3` | `16.2.9` |
| `frontend` (legacy app) | `16.1.6` | `19.2.3` | `16.1.6` |

As of this assessment, `next@16.2.9` is the latest **stable** release. `next@16.3.0` exists only as `canary`/`preview` (e.g. `16.3.0-preview.5`). The residual moderate `postcss` CVEs documented in Gate 1.1 are **not** fixed in any 16.2.x or 16.1.x release; they are fixed in `next@16.3.0` because it bundles `postcss@8.5.10` (vulnerable range is `<8.5.10`).

**Approved decision: B) Upgrade patch version only.**  
The patch-level upgrade was executed on 2026-06-26. `next@16.2.9`, `nodemailer@9.0.1`, and `eslint-config-next@16.2.9` were confirmed at their latest patch releases; no higher patch was available. The lockfile was refreshed, tests/build/smoke passed, and no Critical/High CVEs were introduced. The two residual Moderate `postcss` CVEs remain because no Next.js patch release resolves them; they are tracked for a future minor/major upgrade.

*(Note: The original assessment recommendation was C) Upgrade minor version, because `next@16.3.0` is the first release that bundles the patched `postcss@8.5.10`. The release manager elected B) patch only, accepting the residual moderate risk.)*

---

## 1. Current vs. Target Versions

### Current versions (from `package.json` / `package-lock.json`)

- `apps/web`: `next@16.2.9`, `react@19.2.3`, `react-dom@19.2.3`, `eslint-config-next@16.2.9`
- `frontend`: `next@16.1.6`, `react@19.2.3`, `react-dom@19.2.3`, `eslint-config-next@16.1.6`
- Top-level `postcss` (devDependency): `^8.5.10` → resolves to `8.5.15` (patched)
- Nested `postcss` inside `next`: `8.4.31` (vulnerable)

### Available Next.js versions (registry snapshot, 2026-06-26)

- `latest`: `16.2.9`
- `backport`: `16.2.8`
- `canary`: `16.3.0-canary.68`
- `preview`: `16.3.0-preview.5`
- No Next.js 17 major line is available.

### Target version

- **Primary target:** `next@16.3.0` (stable)
- **Interim test target:** `next@16.3.0-preview.5`
- Matching `eslint-config-next@16.3.0` and `react@19.2.3` (no React change required).

### Why 16.3.0 matters for security

`npm audit --audit-level=moderate` currently reports:

```text
postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
  - GHSA-qx2v-qp2m-jg93
  next  9.3.4-canary.0 - 16.3.0-canary.5
  node_modules/next/node_modules/postcss
```

Two moderate findings are reported because both `apps/web` (`next@16.2.9`) and `frontend` (`next@16.1.6`) pull in the vulnerable nested `postcss@8.4.31`. `next@16.3.0-preview.5` bundles `postcss@8.5.10`, which falls outside the vulnerable range.

---

## 2. Breaking Changes Between 16.2.x and 16.3.0

Next.js 16.3 is a **minor** release within the Next.js 16 major line. The breaking architectural changes of the 16.x line (Turbopack by default, async request APIs, `proxy.ts` replacing `middleware.ts`, etc.) were already absorbed when the project moved to 16.x.

Between 16.2.x and 16.3.0 the documented changes are:

| Change | Impact on this project |
|---|---|
| **Instant Navigations / Partial Prefetching** | New opt-in/client-side behavior. Existing routes should continue to work; navigation timing/caching may change subtly. No code migration required unless explicitly adopting the new APIs. |
| **Nested `postcss` bumped to `8.5.10`** | Fixes GHSA-qx2v-qp2m-jg93. Direct dependency compatibility risk is low because the top-level `postcss` is already `8.5.x`. |
| **Route-handler streaming internals** | Internal refactor of RSC/route-handler I/O. No public API removal documented, but heavy use of custom `NextResponse` bodies (PDF routes, proxy streaming) should be regression-tested. |
| **Removal/deprecation of undocumented `experimental.cpus`** | `apps/web/next.config.ts` sets `experimental: { cpus: 1 }`. This option is undocumented and may be ignored or rejected in 16.3. Must be validated at build time. |

No documented removal of public APIs (`cookies`, `headers`, `params`, `searchParams`, `NextRequest`, `NextResponse`, `next/image`, etc.) occurs between 16.2.x and 16.3.0.

---

## 3. Compatibility Verification by Area

### 3.1 App Router

- **Status:** ✅ Compatible
- Both `apps/web` and `frontend` use the App Router (`src/app/` and `app/`).
- No `pages/` router usage was found.
- No parallel routes (`@folder`) or intercept routes (`(.)`, `(..)`) are used, so the 16.x requirement for explicit `default.js` files does not apply.

### 3.2 Next Middleware / `proxy.ts`

- **Status:** ✅ Compatible
- No `middleware.ts` files exist.
- `apps/web/proxy.ts` already follows the Next.js 16 `proxy.ts` convention: exports `proxy(request: NextRequest)` and a `config.matcher`.
- `apps/web/proxy.ts:138-149` returns a direct `NextResponse` body for blocked public paths. The official Next.js 16 `proxy.ts` documentation explicitly permits returning a `Response` / `NextResponse` directly from Proxy, so this pattern is supported and does not require a code change.

### 3.3 Route Handlers

- **Status:** ✅ Compatible
- `apps/web`: 32 `route.ts` files under `src/app/api/`.
- `frontend`: 56 `route.ts` files under `app/api/`.
- Dynamic route `params` are already typed as `Promise<{ ... }>` and awaited.
- `GET` route handlers are marked `export const dynamic = "force-dynamic"` where dynamic behavior is required, aligning with Next.js 15+/16 defaults (GET handlers are not cached by default).
- Custom binary responses (PDFs, backend proxy streams) use `new NextResponse(buffer/body, { headers })`; this API is unchanged in 16.3.

### 3.4 React Version

- **Status:** ✅ Compatible
- Current: `react@19.2.3` / `react-dom@19.2.3`.
- `next@16.3.0-preview.5` peer dependencies: `react@^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0`.
- `19.2.3` satisfies the React 19 peer range.
- No React upgrade is required.

### 3.5 Prisma

- **Status:** ✅ Compatible
- Current: `@prisma/client@6.19.2`, `prisma@6.19.2`.
- Prisma is used inside server libraries and route handlers (`getPrisma()` singleton).
- Next.js framework upgrades do not affect Prisma client/server interaction.
- No code changes expected.

### 3.6 Authentication

- **Status:** ✅ Compatible
- Custom JWT/session cookie implementation:
  - `apps/web/src/lib/server/sessionCookie.ts` — cookie options.
  - `apps/web/src/lib/server/pageAuth.ts` — server-page auth using `await cookies()` from `next/headers`.
  - `apps/web/src/app/api/auth/password/login/route.ts` — password login route handler.
  - `apps/web/src/app/api/auth/me/route.ts` — current-user endpoint.
- All `cookies()` usage is already asynchronous (`await cookies()`), satisfying the Next.js 16 async request API requirement.
- Cookie setting via `NextResponse.cookies.set(...)` is unchanged.

### 3.7 PDF Generation

- **Status:** ✅ Compatible
- PDF generation uses `puppeteer` + `@sparticuz/chromium` inside Node.js runtime route handlers (`runtime = "nodejs"`).
- Representative files:
  - `apps/web/src/lib/server/promissory-note-pdf-render-service.ts`
  - `apps/web/src/lib/server/legal-case-pdf-service.ts`
  - `apps/web/src/app/api/modules/promissory-notes/[id]/pdf/route.ts`
- These are independent of the Next.js rendering layer. The 16.3 upgrade should not affect them, but PDF routes should be included in the smoke test after upgrade because route-handler internals may change.

### 3.8 OTP

- **Status:** ✅ Compatible
- OTP UI is built on the `input-otp` package (`^1.4.2`), wrapped in:
  - `apps/web/src/components/wathiqcare-figma-uiux/components/ui/input-otp.tsx`
- It is a pure client React component. No Next.js framework coupling.

### 3.9 WathiqNote

- **Status:** ✅ Compatible
- Entry: `apps/web/src/app/modules/wathiqnote/page.tsx` → renders `WathiqNotePageWrapper`.
- Uses `export const dynamic = "force-dynamic"`.
- No deprecated Next.js APIs.

### 3.10 Clinical Knowledge Engine

- **Status:** ✅ Compatible
- Server libraries under `apps/web/src/lib/server/clinical-knowledge/` expose API route handlers under `app/api/modules/clinical-knowledge/`.
- Prototype UI at `apps/web/src/app/prototype/clinical-workspace-2/page.tsx` is a client component using React hooks.
- No middleware, no caching directives, no deprecated APIs.

---

## 4. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | `next@16.3.0` is currently preview/canary, not stable. | Certain (today) | High if deployed to production | Do **not** deploy preview to production. Target the stable 16.3.0 release; use preview only in a branch for early validation. |
| 2 | Undocumented `experimental: { cpus: 1 }` may be ignored or rejected. | Medium | Low | Validate `next build` with the new version; remove the option if it causes warnings/errors. |
| 3 | Instant Navigations / Partial Prefetching may alter client-side navigation timing or cache behavior. | Medium | Low-Medium | Run the full E2E/smoke suite; explicitly test module navigation and public signing flows. |
| 4 | Custom PDF route handlers and backend proxy streaming depend on `NextResponse` internals. | Low | Medium | Include PDF download and discharge/proxy routes in post-upgrade smoke tests. |
| 5 | `frontend` is on `16.1.6` and would jump two minor lines to `16.3.0`. | N/A | Medium | Test `frontend` build and its 56 route handlers independently. |
| 6 | Duplicate Next.js config files (`next.config.ts`, `next.config.js`, `next.config.ts.bak`) in `apps/web` may cause confusion or wrong config loading. | Medium | Low | Delete `next.config.js` and `next.config.ts.bak`; keep only `next.config.ts`. |
| 7 | `eslint-config-next` must be kept in lock-step with `next`; current lockfile resolves `eslint-config-next@16.2.4` while `package.json` asks for `16.2.9`. | Medium | Low | Refresh `package-lock.json` during the upgrade and pin `eslint-config-next` to the target Next.js version. |
| 8 | `apps/web` build script uses `next build --webpack`; Next.js 16 defaults to Turbopack. The flag is still supported but may change. | Low | Low | Decide whether to keep Webpack or migrate to Turbopack; test both if time allows. |

---

## 5. Required Code Changes

1. **Bump `next` version**
   - `apps/web/package.json`: `next` `16.2.9` → `16.3.0` (or target preview for branch testing).
   - `frontend/package.json`: `next` `16.1.6` → `16.3.0`.

2. **Bump `eslint-config-next` in lock-step**
   - `apps/web/package.json`: `eslint-config-next` `16.2.9` → `16.3.0`.
   - `frontend/package.json`: `eslint-config-next` `16.1.6` → `16.3.0`.

3. **Refresh lockfiles**
   - Delete `package-lock.json` (or use `npm install --package-lock-only`) and regenerate. Verify the nested `postcss` under `next` resolves to `>=8.5.10`.

4. **Clean up duplicate config files**
   - Remove `apps/web/next.config.js` and `apps/web/next.config.ts.bak`.

5. **Review `experimental.cpus`**
   - Run a test build; remove the key if Next.js 16.3 logs a warning or error.

6. **(Optional) Remove legacy `frontend/src/app/cases/[id]/...` subtree**
   - If this subtree is not intentional routing, delete it to avoid routing ambiguity.

7. **Run the official upgrade codemod**
   - `npx @next/codemod@canary upgrade latest`
   - Review diff; do not blindly commit.

8. **Verification**
   - `npm audit --audit-level=moderate` → expect 0 moderate/high/critical.
   - `npm run test -w apps/web` → all 199 tests should pass.
   - `npm run build -w apps/web` → success.
   - `npm run build -w frontend` → success.
   - Run Playwright smoke tests for auth, WathiqNote, Clinical Knowledge Engine, and PDF download flows.

---

## 6. Migration Effort

| Task | Effort | Owner |
|---|---|---|
| Dependency bumps + lockfile refresh | 15 min | Engineer |
| Config cleanup (`next.config.js`/`.bak`, `experimental.cpus` review) | 30 min | Engineer |
| Build & unit-test validation | 1 h | Engineer |
| E2E smoke tests (auth, modules, PDF, public signing) | 2-4 h | QA / Engineer |
| Staging soak (performance, navigation behavior) | 4-8 h | QA |
| **Total estimated effort** | **1-2 engineering days** | — |

The upgrade surface is small because the codebase is already aligned with the major Next.js 16 patterns (async request APIs, `proxy.ts`, App Router).

---

## 7. Rollback Plan

1. **Branch isolation:** Perform the upgrade in a dedicated branch (e.g. `chore/next-16-3-0-upgrade`). Do not merge until staging is green.
2. **Lockfile preservation:** Commit the pre-upgrade `package.json` and `package-lock.json` so they can be reverted in one commit.
3. **Node modules:** If `npm install` has been run, restore the previous `node_modules` from the CI cache or run:

   ```bash
   git checkout HEAD -- package.json package-lock.json
   npm ci
   ```

4. **Staging gate:** If any smoke test fails after the upgrade, revert the branch and re-schedule after the failing issue is root-caused.
5. **Production:** Do not promote the upgrade to production until `next@16.3.0` stable is released and the full RC1 verification suite passes.

---

## 8. Recommendation

**Approved decision: B) Upgrade patch version only**

- **A) Stay on current version** was rejected because the controlled patch upgrade was the approved scope.
- **B) Upgrade patch version only** was executed: `next`, `nodemailer`, and `eslint-config-next` were held at their latest patch releases and the lockfile was refreshed cleanly.
- **C) Upgrade minor version** remains the technical recommendation if the residual `postcss` CVEs must be closed before RC1 final, because `next@16.3.0` is the first release that bundles the patched `postcss@8.5.10`.
- **D) Upgrade major version** is impossible — no Next.js 17 line is available.

**Execution guidance (post-patch):**

- The patch-only scope is satisfied. No Critical/High CVEs exist; build, tests, and smoke checks pass.
- The two Moderate `postcss` findings are unchanged and accepted as residual risk.
- If the residual `postcss` risk is later deemed unacceptable for RC1 final, re-open the assessment and execute option C) to `next@16.3.0` stable.
