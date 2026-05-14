# Pilot Production Account Register

Prepared: 2026-05-09T00:10:20Z
Scope: Production pilot account provisioning and validation only

## Production Verification Result

- Runtime database connectivity from this workspace: **Blocked** (`npm run db:probe:runtime -w apps/web` returned `No runtime DB URL found`)
- Live runtime reachability from this workspace: **Blocked** (`wathiqcare.online` DNS resolution failed in this environment)
- Result: **Direct production provisioning/reset could not be executed from this workspace session**

## Pilot Account Register (Usernames Only)

| Role | Username | Validation Status | Auth/Hash Compatibility | Tenant Scope | Login + `/modules` Redirect | RBAC / Module Visibility |
|---|---|---|---|---|---|---|
| admin | tenant.admin@wathiqcare.online | Previously validated in release-gate artifact; current-session live recheck blocked | local password flow (`/api/auth/password/login`) with bcrypt hash path | tenant-scoped (`wathiqcare`) | Previously passed; current-session live recheck blocked | tenant admin module access expected |
| legal | legal.release@wathiqcare.online | Previously validated in release-gate artifact; current-session live recheck blocked | local password flow (`/api/auth/password/login`) with bcrypt hash path | tenant-scoped (`wathiqcare`) | Previously passed; current-session live recheck blocked | informed-consents, promissory-notes, discharge-refusal |
| doctor | doctor.release@wathiqcare.online | Previously validated in release-gate artifact; current-session live recheck blocked | local password flow (`/api/auth/password/login`) with bcrypt hash path | tenant-scoped (`wathiqcare`) | Previously passed; current-session live recheck blocked | informed-consents, discharge-refusal |
| nurse | nurse.release@wathiqcare.online | Previously validated in release-gate artifact; current-session live recheck blocked | local password flow (`/api/auth/password/login`) with bcrypt hash path | tenant-scoped (`wathiqcare`) | Previously passed; current-session live recheck blocked | informed-consents, discharge-refusal |
| medical director | medical.director.release@wathiqcare.online | Previously validated in release-gate artifact; current-session live recheck blocked | local password flow (`/api/auth/password/login`) with bcrypt hash path | tenant-scoped (`wathiqcare`) | Previously passed; current-session live recheck blocked | informed-consents, discharge-refusal |
| quality/compliance | compliance.pilot@wathiqcare.online | Not verified in available production artifacts; provisioning/reset pending production DB/runtime access | expected local password + bcrypt compatibility | tenant-scoped target (`wathiqcare`) | pending | informed-consents, promissory-notes, discharge-refusal |
| finance/admin | finance.pilot@wathiqcare.online | Not verified in available production artifacts; provisioning/reset pending production DB/runtime access | expected local password + bcrypt compatibility | tenant-scoped target (`wathiqcare`) | pending | promissory-notes |

## Public Demo Placeholder Credentials

- Public demo login ID exposure on `/login` is now gated behind `NEXT_PUBLIC_ENABLE_DEMO_LOGIN_IDS=true`.
- Default behavior is to hide demo login IDs from the public UI.

## Governance Notes

- Passwords are intentionally excluded from this document.
- For production execution, use controlled operator access with `npm run admin:reset-password -w apps/web` (dry-run first, then apply) against verified production runtime DB credentials.
- After runtime access is restored, complete live validation for all listed usernames and update this register with final pass/fail evidence.
