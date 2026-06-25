# Rollback Plan — Content Mapping Engine

## Trigger Conditions

Roll back the Content Mapping Engine integration if any of the following occur:

- Consent workflow errors or fails to load after deployment.
- Incorrect consent forms or education materials are resolved for procedures.
- Audit events are missing or duplicated.
- Performance degradation in the informed-consent module.
- User reports of broken procedure/template selection.

## Rollback Steps

### 1. Disable the Feature Flag

**Environment variable (fastest):**

```bash
FF_FEATURE_CONTENT_MAPPING_ENGINE=false
```

Restart the Next.js application:

```bash
npm run build -w apps/web && npm run start -w apps/web
```

**Tenant/module override (if using tenant flag service):**

Set the override value to `false` for the affected tenant(s) or module in the `FeatureFlagOverride` table:

```sql
UPDATE "FeatureFlagOverride"
SET "value" = 'false', "updatedAt" = NOW()
WHERE "key" = 'FEATURE_CONTENT_MAPPING_ENGINE'
  AND "scope" IN ('GLOBAL', 'TENANT', 'MODULE');
```

### 2. Verify Fallback Behavior

- Open `/modules/informed-consents`.
- Enter a procedure name.
- Confirm the workflow behaves exactly as before the integration (manual category/template selection available, no Content Mapping stepper states).

### 3. Monitor Logs

Check for the fallback audit event:

```
content_mapping_fallback_used
```

This confirms the workflow is no longer using the new endpoint.

### 4. Optional: Revert Code

If a code-level rollback is required:

```bash
git revert <integration-commit>
# or
git checkout <pre-integration-commit> -- apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx
```

### 5. Optional: Revert Database Migration

If the integration migration added a relation table that is causing issues:

```bash
npx prisma migrate resolve --rolled-back <migration-name> -w apps/web
```

> Note: Leaving the relation table in place while the feature is disabled is safe and preferred to avoid data loss.

## Rollback Validation Checklist

- [ ] `FF_FEATURE_CONTENT_MAPPING_ENGINE` is `false` in the running environment.
- [ ] `/modules/informed-consents` loads without errors.
- [ ] Procedure entry does not call `/api/modules/informed-consents/content-mapping/resolve`.
- [ ] Existing manual template selection still works.
- [ ] No new `content_mapping_*` audit events are created.
- [ ] Existing consent issuance flow completes end-to-end.

## Communication

After rollback, notify:

- Engineering team
- QA / UAT team
- Clinical operations stakeholders (if pilot is active)
