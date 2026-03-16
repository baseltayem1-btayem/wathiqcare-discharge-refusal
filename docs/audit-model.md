# Audit Model

## Purpose
Provide immutable, queryable evidence of critical actions affecting cases, workflow state, legal events, and system operations.

## Core Table
- `AuditLog`

Key fields:
- tenant context: `tenantId`
- subject: `entityType`, `entityId`
- action: `action`
- actor: `actorUserId`, `actorEmail`, `actorRoleSnapshot`
- request context: `ipAddress`, `userAgent`
- payload snapshots: `beforeJson`, `afterJson`, `metadataJson`
- event time: `occurredAt`

## Write Path
`AuditService.log(...)` is called by domain services after successful operations, for example:
- case creation/update/assignment/closure
- acknowledgment send/respond
- refusal event record
- discharge decision updates
- workflow transition execution
- task changes
- document upload/generation/deletion
- legal note and legal hold actions
- OTP request/verification state changes

## Read Path
- Case-specific audit trail:
  - `AuditService.caseAudit(tenantId, refusalCaseId)`
- API endpoint:
  - `GET /api/cases/:id/audit`
  - `GET /api/audit/logs`

## Immutability and Integrity Expectations
- Audit records are append-only from application perspective.
- Updates/deletes to audit records should not be exposed in service API.
- Actor identity should come from resolved auth user context, not client payload.

## Operational Guidance
- Index by `tenantId`, `entityType`, `entityId`, and `occurredAt` for fast investigations.
- Apply retention policy according to legal and regulatory controls.
- Export audit trails as part of legal response and post-incident analysis workflows.

## Recommended Enhancements
- Cryptographic event chaining for tamper evidence.
- External immutable log sink (WORM/object lock/SIEM).
- Correlation IDs propagated from ingress gateway to all audit writes.
