# Production Integration Plan — Phase 45

This directory contains the safe production integration plan for connecting the Approved Forms Library / Content Mapping Service to the existing informed-consent workflow.

## Documents

| File | Purpose |
|------|---------|
| `INTEGRATION_PLAN.md` | Overall plan, workflow integration point, service contract, fallback behavior, feature flag, audit events, implementation sequence, and risk summary. |
| `API_CONTRACT.md` | Detailed API request/response contract for `/api/modules/informed-consents/content-mapping/resolve`. |
| `FILE_IMPACT_LIST.md` | New files, modified files, unchanged files, and database objects impacted. |
| `AUDIT_EVENTS.md` | Required and supporting audit events with payloads. |
| `RISK_ASSESSMENT.md` | Routes/files/database/performance/security risk matrix. |
| `ROLLBACK_PLAN.md` | Step-by-step rollback runbook. |

## Key Decisions

- **Feature flag:** `FEATURE_CONTENT_MAPPING_ENGINE` / `FF_FEATURE_CONTENT_MAPPING_ENGINE`.
- **Integration point:** `PhysicianConsentWorkflow.tsx` procedure-step `useEffect` (~line 853).
- **Backend service:** new `apps/web/src/lib/server/content-mapping-service.ts` using Prisma.
- **API endpoint:** `GET /api/modules/informed-consents/content-mapping/resolve`.
- **Fallback:** manual workflow preserved when flag is off or mapping is not found.
- **No production code changes in Phase 45.** Implementation is planned only.
