# Risk Assessment — Content Mapping Engine

## Routes Affected

| Route | Impact | Mitigation |
|-------|--------|------------|
| `GET /api/modules/informed-consents/content-mapping/resolve` | New route; only called when feature flag is on. | Behind feature flag; tenant-scoped; returns 404 fallback data. |
| `/modules/informed-consents` (workflow page) | UI calls new endpoint conditionally. | Flag-off path preserves current `resolveImcPackage` behavior. |
| `/api/modules/informed-consents/imc-library/resolve` | May be superseded by the new endpoint; keep for backward compatibility. | Do not remove until full rollout and validation. |

## Files Affected

See `FILE_IMPACT_LIST.md` for the complete list. Highest-risk files:

| File | Risk Level | Reason |
|------|------------|--------|
| `PhysicianConsentWorkflow.tsx` | High | Main production workflow; any bug affects consent issuance. |
| `content-mapping-service.ts` (new) | Medium | New Prisma queries; must be tenant-scoped and performant. |
| `content-mapping/resolve/route.ts` (new) | Medium | New API surface; auth/authz must be correct. |
| `feature-flags.ts` | Low | Standard flag addition. |

## Database Impact

### Reads
- `ConsentProcedureCatalog` — by name/code, tenant-scoped.
- `ConsentTemplate` / `ConsentTemplateVersion` — active versions only.
- `ProcedureEducation` / `ProcedureEducationAsset` — active assets only.

### Writes
- `ConsentAuditEvent`, `AuditLog`, `AuditChainEvent`, `ConsentTimelineEvent` — additional rows per mapping.

### Schema changes
- Likely requires a new relation table between `ConsentProcedureCatalog` and `ConsentTemplate` if one does not exist.
- Migration is additive only; no data transformation of existing consent documents.

## Performance Impact

| Concern | Assessment |
|---------|------------|
| Query cost | Small (2–3 indexed lookups). |
| Frequency | Called once per procedure entry in the workflow. |
| Caching | Optional: cache per tenant/procedure for 5–15 minutes. |

## Security & Compliance

| Concern | Assessment |
|---------|------------|
| Data exposure | Endpoint returns only template metadata and public file paths; no PHI. |
| Authorization | Reuse existing module-access check. |
| Audit trail | All mapping events audited via existing multi-layer audit system. |

## Rollback Plan

See `ROLLBACK_PLAN.md`. In short:

1. Disable `FF_FEATURE_CONTENT_MAPPING_ENGINE` env flag or tenant override.
2. Restart Next.js app.
3. Workflow reverts to existing behavior.
4. No data migration rollback needed.

## Risk Matrix

| Risk | Likelihood | Impact | Overall |
|------|------------|--------|---------|
| Workflow regression | Low | High | Medium |
| Missing catalog data | Medium | Medium | Medium |
| Audit volume increase | Low | Low | Low |
| Performance degradation | Low | Low | Low |
| Auth misconfiguration | Low | High | Medium |
