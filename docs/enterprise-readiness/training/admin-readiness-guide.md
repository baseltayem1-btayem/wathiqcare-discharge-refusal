# Admin Readiness Guide — Clinical Workspace 2.0

## What admins need to know

Clinical Workspace 2.0 is a prototype-ready consent workflow. Before any production use, admins must verify environment, feature flags, monitoring, and rollback paths.

---

## Pre-deployment checks

1. **Feature flags**
   - Confirm the workspace is behind a flag or isolated route.
   - Verify only authorized users can access `/prototype/clinical-workspace-2`.

2. **Environment variables**
   - No production secrets should be required for the prototype.
   - Verify `NODE_ENV`, feature flags, and mock data flags are set correctly.

3. **Database readiness**
   - Prototype uses client-side state; no database schema changes are required.
   - If integrating later, validate migrations in a separate environment.

4. **Build and lint**
   - Run `npm run lint -w apps/web`.
   - Run `npx tsc --noEmit` in `apps/web`.
   - Confirm no errors in `/prototype/clinical-workspace-2`.

5. **Smoke tests**
   - Run `node qa-screenshots/capture-workspace-2-flow.mjs`.
   - Confirm all scenarios pass and screenshots are generated.

## User access

| Role | Access Level |
|------|--------------|
| Physician | Full workspace + patient preview |
| Nurse / support | Patient preview only (for tablet assistance) |
| Legal / compliance | Read-only timeline and evidence export |
| Admin | Feature flag and environment management |

## Monitoring

- Track workspace usage in analytics (once instrumented).
- Monitor for failed package resolutions or unacknowledged alerts.
- Set alerts for critical defects reported during UAT.

## Communication

- Notify clinical leadership before UAT begins.
- Provide training guides to physicians and nurses.
- Share the rollback plan with the incident response team.

## Rollback readiness

- Keep the rollback checklist accessible.
- Confirm feature flags can disable the workspace without redeployment.
- Ensure audit logs are preserved in all rollback scenarios.

---

## Post-UAT actions

1. Collect sign-offs from clinical, legal, compliance, IT, and InfoSec.
2. Update the [Production Readiness Report](../08-production-readiness-report.md).
3. Only change status to **GO WITH OBSERVATIONS** or **GO** after all blockers are resolved.
