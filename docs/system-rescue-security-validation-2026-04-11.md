# Security Validation Report

Date: 2026-04-11
Scope: access control and auth containment during rescue

## Validated Controls

| Control | Result | Evidence |
| --- | --- | --- |
| Anonymous protection on `/cases/*` | Pass | `/cases/123` redirects to login |
| Anonymous protection on `/tenant/*` | Pass | `/tenant/security` redirects to login |
| Anonymous protection on `/launch-status` | Pass | Route redirects to login |
| Platform/tenant route separation | Pass | Platform-admin is redirected away from tenant routes to `/platform` |
| Tenant/admin platform separation | Pass | Tenant-admin reaches `/dashboard`, not `/platform` |
| Password login session creation | Pass | `/api/auth/password/login` sets working tenant session for `tenant_admin@demo.com` |
| Session persistence | Pass | `/api/auth/me` returns authenticated tenant context after login |
| Error-envelope hardening | Pass | Rescue-critical APIs return structured error bodies with trace ids |

## Controlled Recovery Actions

- Added root and global error boundaries to eliminate blank-screen failures.
- Added a platform-admin/bootstrap-secret tenant recovery endpoint to restore a tenant admin without bypassing general tenant route protections.
- Repaired the controlled test account required for tenant validation.

## Remaining Security Risks

- `/api/platform/tenant-rescue` is powerful by design and should be treated as a temporary rescue/admin operation surface.
- Platform-admin login lockout state should be reset and revalidated once rescue work is complete.
- `/tenant/security` remains offline, so full RBAC management validation is still pending.
