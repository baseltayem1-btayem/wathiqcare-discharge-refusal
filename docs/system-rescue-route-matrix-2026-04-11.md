# System Rescue Route/Page Status Matrix

Date: 2026-04-11
Scope: validated high-risk routes in apps/web

| Route | Anonymous | Platform admin | Tenant admin | Current status | Evidence |
| --- | --- | --- | --- | --- | --- |
| `/cases/123` | Redirects to login | Redirects to `/platform` | Renders guarded page shell; nonexistent record shows `Case not found` | Stabilized | Runtime browser validation |
| `/cases` | Protected | Redirected away from tenant flow | Renders cases list with no crash | Stable | Runtime browser validation |
| `/cases/new` | Protected | Redirected away from tenant flow | Renders case registration form with no crash | Stable | Runtime browser validation |
| `/dashboard` | Protected | Not primary landing path | Renders tenant dashboard | Stable | Runtime browser validation |
| `/tenant/security` | Redirects to login | Redirects to `/platform` | Renders disabled stabilization notice | Contained | Runtime browser validation |
| `/launch-status` | Redirects to login | Redirects to `/platform` | Renders disabled stabilization notice | Contained | Runtime browser validation |
| `/platform` | Protected | Renders | Redirected away to tenant dashboard | Stable | Prior rescue validation |
| `/login` | Public | Public | Public | Stable | Used repeatedly for rescue validation |

## Summary

- No validated route above produced a blank screen in rescue validation.
- Sensitive tenant and case routes now enforce role-appropriate access.
- Two routes remain intentionally disabled rather than partially repaired: `/tenant/security` and `/launch-status`.
