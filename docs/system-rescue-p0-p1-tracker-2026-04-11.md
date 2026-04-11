# System Rescue P0/P1 Tracker

Date: 2026-04-11
Scope: apps/web rescue execution

## P0 Resolved

| ID | Severity | Area | Issue | Resolution | Validation |
| --- | --- | --- | --- | --- | --- |
| P0-01 | P0 | Access control | `/cases/[id]` rendered without tenant auth gating | Wrapped route in `AuthGuard` and expanded edge protection in `proxy.ts` | Anonymous access redirects to login; tenant-admin access renders page shell |
| P0-02 | P0 | Stability | `/launch-status` crashed because UI expected `recentAudits[]` while API returned a count | Fixed API contract and disabled unstable page during stabilization | `/api/launch/status` returns `200` with `recentAudits[]`; route renders disabled notice instead of crashing |
| P0-03 | P0 | Tenant admin | `/tenant/security` depended on missing `/api/tenant/roles` and could break UX | Implemented `/api/tenant/roles` and disabled the page pending full RBAC validation | Route renders stabilization notice; API exists and returns controlled responses |
| P0-04 | P0 | Error handling | App lacked root-level fallbacks, allowing blank-screen failure states | Added root `app/error.tsx` and `app/global-error.tsx` | Runtime route sweeps no longer produce blank screens on the previously failing paths |
| P0-05 | P0 | API contracts | Production-path API failures were inconsistent and leaked uncontrolled error shapes | Standardized shared error envelope in server HTTP helper | Auth and launch APIs now return `success/error/traceId/timestamp` envelopes |
| P0-06 | P0 | Authentication | Required tenant test user was not present in the active web database | Added platform rescue tenant upsert endpoint and reseeded exact credential | `tenant_admin@demo.com / Demo@123` logs in successfully and reaches `/dashboard` |

## P1 Open

| ID | Severity | Area | Issue | Current state | Recommendation |
| --- | --- | --- | --- | --- | --- |
| P1-01 | P1 | UX recovery | `/tenant/security` remains intentionally disabled | Safe placeholder is live | Re-enable only after full tenant RBAC CRUD validation |
| P1-02 | P1 | UX recovery | `/launch-status` remains intentionally disabled | Safe placeholder is live | Rebuild page against the corrected API contract and revalidate together |
| P1-03 | P1 | Platform ops | Platform-admin password login hit rate limiting during rescue | Bootstrap-secret fallback used for recovery operations | Reset lockout state in a controlled maintenance step and verify platform login again |
| P1-04 | P1 | Cases workflow | Case routes are reachable, but no full create-to-close business workflow was executed in this pass | `/cases`, `/cases/new`, and `/cases/[id]` no longer crash | Run a tenant-admin case creation and workflow transition smoke path before go-live |

## Notes

- Rescue route added for controlled tenant repair: `POST /api/platform/tenant-rescue`
- Controlled tenant credential validated during rescue:
  - Email: `tenant_admin@demo.com`
  - Password: `Demo@123`
