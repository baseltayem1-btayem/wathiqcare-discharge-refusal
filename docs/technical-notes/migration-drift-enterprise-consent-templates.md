# Technical Note: Migration Drift for Enterprise Consent Templates

## Context
During release validation, the expected Prisma SQL migration was present in source control but not applied in the target database environment due to legacy migration ledger drift.

## 1) Expected Migration
- Path: `apps/web/prisma/migrations/0024_enterprise_consent_templates.sql`
- Purpose: introduce enterprise informed-consent template persistence updates, including the `consent_templates.risk_level` column and related schema updates required by the informed-consents workflow.

## 2) Why `prisma migrate deploy` Did Not Apply It
- Root cause: legacy Prisma migration ledger drift.
- The migration history recorded in the Prisma migrations ledger did not match the effective schema state lineage expected by current migration ordering.
- As a result, `prisma migrate deploy` did not apply `0024_enterprise_consent_templates.sql` in this environment even though application code expected the post-migration schema.

## 3) Manual SQL Applied (Summary, No Secrets)
To unblock production-readiness validation, equivalent SQL changes from the expected migration were applied directly and minimally:
- Added/ensured the `risk_level` field on `consent_templates`.
- Applied the related table/constraint alignment needed by the enterprise consent-template flow.
- Preserved existing data and avoided destructive schema operations.
- No credentials, keys, tokens, or environment secrets were included in the SQL execution artifacts.

## 4) Verification Performed
Validation completed after direct SQL application:
- `consent_templates.risk_level` exists in the live schema.
- Persisted informed-consent document creation succeeded.
- PDF generation for the persisted document succeeded end-to-end.

## 5) Future Safeguards
The following safeguards are required before future production deploys:
- Add a migration drift check as a required pre-deploy gate for production.
- Add a schema readiness health check for informed-consents that verifies required columns/tables before enabling the workflow.

## 6) Operational Note
This change was implemented as a controlled operational mitigation for migration drift. The code path now runs against the verified schema shape, and future deploy gates should prevent recurrence.