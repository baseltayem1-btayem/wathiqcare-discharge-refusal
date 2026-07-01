# 01 — Append-only Audit Remediation

## Scope
RC1 Gate 1.3A Finding 1: Audit records must be append-only.

## Original finding
- The Prisma middleware in `apps/web/src/lib/server/prisma.ts` only blocked `update*` / `delete*` actions for a small, hard-coded list of audit models (`AUDIT_PROTECTED_MODELS`).
- Legally sensitive event/log tables such as `reportAccessLog`, `privilegedAccessLog`, `securityIncident`, `caseStepEvent`, `caseAssignmentHistory`, `subscriptionEvent`, `trakCareIntegrationLog`, `governanceEvent`, `procedureEducationAuditEvent`, and `notificationDeliveryAttempt` were not protected at the application layer.
- Audit tables had foreign-key relations with `onDelete: Cascade`. Deleting a parent tenant, case, or consent document could silently cascade to audit rows, bypassing any application-level guard.
- Operational/raw SQL scripts (e.g., `reset_production_data.py`, test teardowns) executed `DELETE FROM audit_logs`, demonstrating that immutability was not enforced at the database layer.
- Python backends (`apps/api/backend`, `backend`) use a separate SQLAlchemy stack; their audit/event tables were not covered by the TypeScript Prisma middleware at all.

## Root cause
1. `AUDIT_PROTECTED_MODELS` was incomplete.
2. Protection was implemented only as a Prisma middleware hook, which cannot intercept raw SQL, cascade deletes, or direct DB access.
3. No database constraints (restrict deletes, no-update triggers, separate immutable schema) had been applied.

## Technical solution
1. **Extended application-level protection** in `apps/web/src/lib/server/audit-foundation.ts`:
   ```ts
   export const AUDIT_PROTECTED_MODELS = [
     "auditLog", "auditChainEvent", "consentAuditEvent", "consentTimelineEvent",
     "evidenceEvent", "consentEvidencePackage", "webhookEvent",
     // RC1 Gate 1.3A additions:
     "reportAccessLog", "privilegedAccessLog", "securityIncident",
     "caseStepEvent", "caseAssignmentHistory", "subscriptionEvent",
     "trakCareIntegrationLog", "governanceEvent",
     "procedureEducationAuditEvent", "notificationDeliveryAttempt",
   ] as const;
   ```
   The existing `assertAuditAppendOnly()` helper and the Prisma middleware now reject any Prisma `update*` / `delete*` against these models with `AUDIT_APPEND_ONLY_VIOLATION`.

2. **Documented required database constraints** (to be applied in a dedicated migration before production):
   - Change all audit/event FK `onDelete` actions from `Cascade` to `Restrict` in the Prisma schema and the physical database.
   - Add PostgreSQL triggers or row-level policies that reject `UPDATE`/`DELETE` on audit tables from application roles.
   - Remove direct `DELETE` privileges for application DB users on `audit_logs`, `audit_chain_events`, `consent_audit_events`, `consent_timeline_events`, `evidence_events`, `report_access_logs`, `privileged_access_logs`, `security_incidents`, `case_step_events`, `case_assignment_history`, `subscription_events`, `trak_care_integration_logs`, `governance_events`, `procedure_education_audit_events`, and `notification_delivery_attempts`.
   - Operational reset scripts must truncate only non-audit tenant data or be retired in favor of tenant lifecycle soft-deletion.

3. **Python/SQLAlchemy note**: The Python backend is documented as a separate remediation boundary. Its audit tables (`audit_logs`, `workflow_audit_logs`, `discharge_session_audit_logs`) must receive equivalent DB-level protections (restrict deletes, append-only triggers) in the same migration.

## Verification evidence
- `apps/web/src/lib/server/audit-foundation.test.ts` passes:
  - `isAuditProtectedModel returns true for protected models`
  - `assertAuditAppendOnly throws for update and delete on protected models`
- `npm run build -w apps/web` completed successfully after the change.
- `npm run test -w apps/web` — 208 unit tests pass.

## Residual risk
- **Application-level guards do not stop raw SQL, cascade deletes, or superuser mutations.** True append-only behavior requires the documented DB constraints to be applied and tested in a future deployment phase.
- `consentEvidencePackage` rows are still updated in `persistPublicSigningEvidencePackages` (new evidence copies overwrite existing rows by `copyType`). This was left unchanged to avoid redesigning the evidence storage model; it must be migrated to versioned insert-only rows before claiming full evidence immutability.
- Python audit tables and the in-memory `AuditLogger` in `apps/api/backend/audit/audit_logger.py` are outside the Prisma middleware scope and need their own enforcement.
