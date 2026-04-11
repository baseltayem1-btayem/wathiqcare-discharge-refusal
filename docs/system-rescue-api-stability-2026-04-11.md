# API Stability Report

Date: 2026-04-11
Scope: rescue-critical apps/web APIs

## Standardized Response Envelope

Success envelope:

```json
{ "success": true, "data": {}, "error": null, "traceId": "...", "timestamp": "..." }
```

Error envelope:

```json
{ "success": false, "data": null, "error": "...", "traceId": "...", "timestamp": "..." }
```

## Validated APIs

| Endpoint | Result | Notes |
| --- | --- | --- |
| `/api/auth/password/login` | `200` for valid credentials; controlled `401`/`429` for invalid or rate-limited paths | Success envelope now returned consistently |
| `/api/auth/me` | `200` after valid login | Verified tenant-admin session claims, membership, tenant, and subscription |
| `/api/auth/config?email=tenant_admin@demo.com` | `200` | Returns tenant id and `password_enabled: true` for the repaired tenant |
| `/api/launch/status` | `200` | `recentAudits` now returns an array, not a count |
| `/api/tenant/roles` | Endpoint implemented | Returns controlled authorization outcomes instead of missing-route failure |
| `/api/platform/tenant-rescue` | `200` | Upserts tenant, allowed domain, password-backed tenant admin, membership, and subscription |

## Key Stability Fixes

- Shared server HTTP helper now emits structured error envelopes.
- Frontend API client unwraps `success: true` envelopes while keeping compatibility with legacy payload fields.
- `/api/launch/status` no longer causes UI contract mismatch.
- Tenant recovery no longer depends on unreliable shell seeding.

## Residual Risks

- Platform-admin password login is currently rate-limit sensitive and should be rechecked after lockout reset.
- Disabled pages are stable placeholders, not final product-ready restorations.
