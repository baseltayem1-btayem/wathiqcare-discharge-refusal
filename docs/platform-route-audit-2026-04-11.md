# Platform Route Audit

Date: 2026-04-11

Scope:
- Static route discovery from `apps/web/app/**/page.tsx`
- Runtime sweep as anonymous user
- Runtime sweep as authenticated platform admin using `admin@wathiqcare.med.sa`
- Mobile spot-check on representative public and platform routes

Limitations:
- No working tenant-user credential was available in the running environment, so tenant-only happy paths are marked unverified unless the route behavior itself was proven broken.
- Dynamic secure-link happy path was not exercised because no valid token was available.

## Executive Summary

Usable today:
- Public marketing and auth entry routes are broadly usable.
- Core platform-admin SaaS routes under `/platform/*` are the most stable area.

Not ready for sign-off:
- Tenant workflow routes are inconsistent. Many redirect correctly when anonymous, but several dynamic and settings routes fail open or break when accessed without the right session.
- `/launch-status` is crashing at runtime.
- `/tenant/security` is broken and backed by a missing API route.
- Legacy `src/app` pages are not actually routable.

## Priority Findings

### P0

1. `/launch-status` crashes with `TypeError: data.recentAudits.map is not a function`.
   - Page expects `recentAudits` to be an array in [apps/web/app/launch-status/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/launch-status/page.tsx#L186) and [apps/web/app/launch-status/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/launch-status/page.tsx#L204).
   - API returns `recentAudits` from `prisma.auditLog.count(...)`, which is a number, not a list, in [apps/web/app/api/launch/status/route.ts](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/api/launch/status/route.ts#L58) and [apps/web/app/api/launch/status/route.ts](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/api/launch/status/route.ts#L67).
   - Runtime result: page renders the Next error screen for platform-admin session.

2. `/tenant/security` is broken and partially fail-open.
   - The page directly fetches `/api/tenant/users` and `/api/tenant/roles` in [apps/web/app/tenant/security/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/tenant/security/page.tsx#L79) and [apps/web/app/tenant/security/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/tenant/security/page.tsx#L94).
   - `/api/tenant/roles` does not exist in the app router. The available tenant API routes under `app/api/tenant` only cover users and branding.
   - Runtime result: anonymous and platform-admin access both show a rendered page with failed data loads instead of a clean auth/permission gate.

3. Legacy `src/app` page files are not live routes.
   - Files exist under `apps/web/src/app`, but `/src/app/dashboard`, `/src/app/cases`, and `/src/app/legal` return 404 in the running app.
   - These should be treated as dead code or migration leftovers, not usable modules.

### P1

1. `/cases/[id]` and its redirect shims fail open for unauthenticated access.
   - The page renders directly into `AppShell` without an `AuthGuard` wrapper in [apps/web/app/cases/[id]/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/cases/[id]/page.tsx#L551).
   - Runtime result: anonymous access shows `Case Execution Workspace` plus `Missing access token` instead of a login redirect.

2. `/emr-integration` uses inline auth handling and leaks page shell/state to anonymous users.
   - It intentionally keeps the page mounted with `AuthGuard authFailureMode="inline"` in [apps/web/app/emr-integration/page.tsx](c:/work/wathiqcare-discharge-refusal-main/apps/web/app/emr-integration/page.tsx#L209).
   - Runtime result: anonymous access loads the shell, then emits repeated 401s and partial telemetry UI.

3. `/admin/*` subpages are inconsistent for platform-admin operators.
   - `/admin` itself resolves, but most `/admin/*` pages immediately fall back to `/platform` and their backing APIs return 403.
   - This looks like a role-model mismatch between route intent and API authorization rather than a healthy module.

### P2

1. `/platform` has horizontal overflow on mobile in the current platform-admin layout.
2. Platform and tenant areas remain table-heavy; most data views are usable on mobile but not optimized.
3. Several route families duplicate older shims (`/cases/[id]/refusal-form`, `/informed-consent`, `/financial-notice`, `/home-healthcare-agreement`) that all collapse back to the main case workspace.

## Module Stability

| Module | Score | Assessment |
|---|---:|---|
| Public marketing and legal | 9/10 | Stable on desktop and mobile; no runtime API failures observed |
| Public auth | 8/10 | Login and password reset render cleanly; credential inventory is environment-dependent |
| Secure token flows | 7/10 | Invalid-token handling works; valid-token workflow not exercised |
| Platform SaaS core (`/platform/*`) | 8/10 | Best-performing module; overview, tenants, users, subscriptions, billing, health, audit, support, settings all loaded |
| Platform admin console (`/admin/*`) | 4/10 | Entry route exists, but most subpages back onto 403 APIs for the tested platform-admin role |
| Tenant case and workflow shell | 5/10 | Most list routes auth-gate correctly when anonymous, but tenant happy path is unverified |
| Dynamic case workspace | 3/10 | Missing auth gate on `/cases/[id]`; errors surface inline |
| Tenant admin/settings | 2/10 | `/tenant/security` is broken; `/tenant/users` is gated but unverified as tenant |
| EMR and utility pages | 3/10 | `/launch-status` crashes; `/emr-integration` leaks partial UI on invalid session |
| Legacy `src/app` artifacts | 0/10 | Not routable |

## Full Page Matrix

### Public and Auth

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/`, `/[lang]` | Public landing | Working | Working | Public; `/` redirects to locale | None required at load | Working |
| `/demo` | Static demo/contact page | Working | Working | Public | None | Working |
| `/request-demo`, `/[lang]/request-demo` | Demo request form | Working | Working | Public | Form submit flow not exercised | Working |
| `/[lang]/privacy` | Privacy policy | Working | Working | Public | None | Working |
| `/[lang]/terms` | Terms of use | Working | Working | Public | None | Working |
| `/[lang]/contact` | Contact page | Working | Working | Public | None | Working |
| `/login`, `/[lang]/login` | Password login UI | Working | Working | Public; redirects authenticated users away | `/api/auth/config`, `/api/auth/password/login` | Working |
| `/auth/password-reset` | Password reset start flow | Working | Working | Public | Password reset API not exercised | Working |
| `/auth/magic` | Magic-link callback | Unverified happy path | Unverified | Public token callback | `/api/auth/verify-magic-link` | Partial |

### Secure Public Forms

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/secure/[token]` | Public discharge decision form | Invalid-token state works | Likely mobile-targeted | Token-based public access | `/api/discharge/secure/[token]`, decision POST | Partial |
| `/discharge/secure/[token]` | Legacy secure-link alias | Redirect works | Likely mobile-targeted | Public redirect to `/secure/[token]` | Same as above | Working |

### Tenant Workflow and Reporting

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/dashboard` | Tenant KPI dashboard | Anonymous redirect works | Unverified | Requires session; platform-admin redirected to `/platform` | `/api/operations/dashboard` | Partial |
| `/operations` | Alias to dashboard | Anonymous redirect works | Unverified | Same as `/dashboard` | `/api/operations/dashboard` | Partial |
| `/cases` | Case list | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases` | Partial |
| `/cases/new` | Create case | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases` POST | Partial |
| `/cases/[id]` | Main case execution workspace | Broken unauth behavior | Unverified | Should require tenant session but renders inline error when anonymous | `/api/cases/[id]`, discharge workflow APIs | Broken |
| `/cases/[id]/refusal-form` | Legacy redirect shim | Lands on `/cases/[id]` | Unverified | Same as case detail | Same as `/cases/[id]` | Partial |
| `/cases/[id]/informed-consent` | Legacy redirect shim | Lands on `/cases/[id]` | Unverified | Same as case detail | Same as `/cases/[id]` | Partial |
| `/cases/[id]/financial-notice` | Legacy redirect shim | Lands on `/cases/[id]` | Unverified | Same as case detail | Same as `/cases/[id]` | Partial |
| `/cases/[id]/home-healthcare-agreement` | Legacy redirect shim to main case workspace | Lands on `/cases/[id]` | Unverified | Same as case detail | Same as `/cases/[id]` | Partial |
| `/reports` | Reports workspace | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | Reports APIs and admin report-access side calls | Partial |
| `/compliance` | Compliance dashboard | Anonymous redirect works | Unverified | Requires tenant/admin session; platform-admin redirected away | `/api/compliance/dashboard`, export-approval APIs | Partial |
| `/archive` | Archived cases | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | Archive/case APIs | Partial |
| `/escalation-timeline` | Escalation timeline | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases?limit=200` | Partial |
| `/consents` | Consent list | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases?limit=200` | Partial |
| `/consents/new` | Start consent flow | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases?limit=100` | Partial |
| `/bundles` | Document bundle export | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/discharge/bundles` | Partial |
| `/refusal-forms` | Refusal forms list | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/cases?limit=200`, refusal form services | Partial |
| `/audit-log` | Tenant audit log | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | Case/audit APIs | Partial |
| `/legal-case-file` | Legal package workspace | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/discharge/reports/legal-control-dashboard`, case APIs | Partial |
| `/legal-alerts` | Legal alerts center | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/legal/notifications/settings` | Partial |
| `/legal-escalation` | Legal escalation management | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | Legal escalation APIs | Partial |

### Tenant Utilities and Admin

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/icd11-validator` | ICD-11 validation utility | Anonymous redirect works | Unverified | Requires session; platform-admin redirected away | Local validation / optional API | Partial |
| `/launch-status` | Launch readiness dashboard | Crash for platform-admin | Unverified | Requires session | `/api/launch/status` | Broken |
| `/emr-integration` | Integration telemetry and sync | Anonymous sees partial shell and 401s | Unverified | Inline auth mode keeps page mounted on auth failure | `/api/integrations/status`, `/runs`, `/alerts` | Broken |
| `/tenant/users` | Tenant user management | Anonymous redirect works | Unverified | Requires tenant session; platform-admin redirected away | `/api/tenant/users`, create/reset/invite APIs | Partial |
| `/tenant/security` | Tenant security and roles | Page renders but data load is broken | Unverified | Missing proper gate; platform-admin can reach broken shell | `/api/tenant/users`, missing `/api/tenant/roles` | Broken |

### Platform SaaS Core

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/platform` | Platform overview dashboard | Working | Partial | Platform-admin only | setup, tenants, billing, subscription summary APIs | Working |
| `/platform/tenants` | Tenant management | Working | Working | Platform-admin only | tenant list and tenant create/update APIs | Working |
| `/platform/users` | Platform user management | Working | Working | Platform-admin only | `/api/platform/users`, create API | Working |
| `/platform/subscriptions` | Subscription management | Working | Working | Platform-admin only | subscription list APIs | Working |
| `/platform/billing` | Billing dashboard | Working | Working | Platform-admin only | billing invoice APIs | Working |
| `/platform/health` | System health | Working | Working | Platform-admin only | health APIs | Working |
| `/platform/audit` | Platform audit log | Working | Working | Platform-admin only | `/api/audit-log` | Working |
| `/platform/support` | Read-only tenant inspection | Working | Working | Platform-admin only | `/api/tenants/[id]` | Working |
| `/platform/settings` | Platform settings placeholder | Working | Working | Platform-admin only | None critical yet | Working |

### Admin Console

| Route | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `/admin` | Admin hub | Entry route resolves for platform-admin | Unverified | Uses inline auth mode; behavior depends on role checks | auth/me plus many admin APIs | Partial |
| `/admin/security` | Security admin | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/security` | Broken |
| `/admin/backups` | Backups admin | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/backups` | Broken |
| `/admin/incidents` | Incident admin | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/incidents` | Broken |
| `/admin/privacy` | Privacy admin | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/privacy` | Broken |
| `/admin/training-compliance` | Training compliance | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/training-compliance` | Broken |
| `/admin/third-party-risk` | Third-party risk | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/third-party-risk` | Broken |
| `/admin/retention` | Retention admin | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/retention` | Broken |
| `/admin/policy-attestations` | Policy attestations | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/policy-attestations` | Broken |
| `/admin/remediation-tracker` | Remediation tracker | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/remediation-tracker` | Broken |
| `/admin/reports-access` | Reports access console | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/reports-access` | Broken |
| `/admin/data-residency` | Data residency console | Redirects/falls back; API 403 | Unverified | Intended admin-only | `/api/admin/data-residency` | Broken |
| `/admin/make-import` | Internal Figma/import preview | Loads route shell but falls back in tested platform session | Unverified | Internal tool | local component dependencies | Partial |
| `/admin/ui-showcase` | UI showcase | Loads route shell but falls back in tested platform session | Unverified | Internal tool | local component dependencies | Partial |

### Legacy / Dead Surface

| Route / Artifact | Purpose | Desktop | Mobile | Auth / Session | Primary API Dependencies | Result |
|---|---|---|---|---|---|---|
| `apps/web/src/app/**` | Legacy alternate app tree | Not routable | Not routable | N/A | N/A | Unreachable |

## What Is Actually Usable Today

Usable with confidence:
- Public landing, localized marketing, legal pages, request-demo, login, password-reset.
- Platform-admin core under `/platform/*`: overview, tenants, users, subscriptions, billing, health, audit, support, settings.

Usable only with caveats:
- Secure-link flows appear structurally sound for invalid-token handling, but valid-token execution is still unverified.
- Tenant workflow routes exist and most anonymous gating is present, but tenant happy-path operation was not proven in this environment.

Not usable without fixes:
- `/launch-status`
- `/tenant/security`
- Most `/admin/*` subpages for the tested platform-admin role
- Legacy `src/app` page artifacts as live product routes
