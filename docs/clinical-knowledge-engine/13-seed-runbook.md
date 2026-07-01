# Clinical Knowledge Engine — Seed Runbook

## Purpose

Seed a tenant with the IMC approved consent library as versioned, governed Clinical Knowledge Engine entities.

## Prerequisites

1. Migration `0028_clinical_knowledge_engine_mvp.sql` has been applied.
2. `DATABASE_URL` (or `DATABASE_URL_UNPOOLED` for direct execution) is configured.
3. The target tenant exists in the `Tenant` table.
4. A valid user ID exists to record as the migration actor (optional; defaults to `system-migration`).

## Commands

### Generate Prisma client

```bash
cd apps/web
npm run prisma:generate
```

### Seed a tenant

```bash
cd apps/web
npm run seed:clinical-knowledge <tenant-id> [created-by-user-id]
```

Example:

```bash
npm run seed:clinical-knowledge tenant-imc-pilot user-platform-admin-001
```

### Verify the seed

```sql
SELECT
  (SELECT COUNT(*) FROM "clinical_specialties" WHERE tenant_id = '<tenant-id>') AS specialties,
  (SELECT COUNT(*) FROM "clinical_procedures" WHERE tenant_id = '<tenant-id>') AS procedures,
  (SELECT COUNT(*) FROM "clinical_consent_forms" WHERE tenant_id = '<tenant-id>') AS consent_forms,
  (SELECT COUNT(*) FROM "clinical_education_materials" WHERE tenant_id = '<tenant-id>') AS education_materials,
  (SELECT COUNT(*) FROM "clinical_risk_disclosures" WHERE tenant_id = '<tenant-id>') AS risk_disclosures,
  (SELECT COUNT(*) FROM "clinical_knowledge_packages" WHERE tenant_id = '<tenant-id>') AS packages,
  (SELECT COUNT(*) FROM "clinical_package_items" WHERE tenant_id = '<tenant-id>') AS package_items,
  (SELECT COUNT(*) FROM "clinical_decision_rules" WHERE tenant_id = '<tenant-id>') AS decision_rules,
  (SELECT COUNT(*) FROM "clinical_governance_events" WHERE tenant_id = '<tenant-id>') AS governance_events;
```

Expected minimums (counts depend on IMC library size):

- specialties ≥ 1
- procedures = size of IMC library
- consent_forms = size of IMC library
- packages = size of IMC library
- every package has ≥ 1 package item of type `CONSENT_FORM`
- governance_events ≥ packages + consent_forms + education_materials + risk_disclosures + procedures

## Idempotency

The seed script uses stable, deterministic IDs derived from `tenantId + entity + key`. Running it repeatedly for the same tenant will not create duplicates because Prisma `upsert` / `createMany({ skipDuplicates: true })` is used.

## Warnings

If the seed adapter encounters an unrecognized specialty or missing relation, warnings are printed to stdout. Review these with clinical governance before pilot go-live.

## Rollback

To remove seeded data for a tenant:

```sql
DELETE FROM "clinical_governance_events" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_package_items" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_knowledge_packages" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_decision_rules" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_risk_disclosures" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_education_materials" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_consent_form_sections" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_consent_forms" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_procedures" WHERE tenant_id = '<tenant-id>';
DELETE FROM "clinical_specialties" WHERE tenant_id = '<tenant-id>';
```

This is tenant-scoped and will not affect other tenants.
