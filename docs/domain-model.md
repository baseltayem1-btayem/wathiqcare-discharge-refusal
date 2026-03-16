# Domain Model

## Modeling Goals
- Enforce multi-tenant data isolation.
- Represent refusal-of-discharge lifecycle with explicit workflow transitions.
- Keep legal/compliance and audit artifacts first-class.
- Support extensible reporting and notification pipelines.

## Core Entity Groups

### 1. Tenant and Governance
- `Tenant`, `TenantSetting`
- `Facility`, `Department`

### 2. Identity and Access
- `User`, `Role`, `Permission`
- Junctions: `UserRole`, `RolePermission`

### 3. Patient and Encounter
- `Patient`, `PatientContact`, `PatientRepresentative`
- `Encounter`

### 4. Case and Clinical Decisioning
- `RefusalCase`
- `DischargeDecision`, `DischargePlan`, `DischargePlanItem`
- `RefusalReasonCategory`, `RefusalEvent`
- `AcknowledgmentRequest`, `AcknowledgmentResponse`

### 5. Workflow Engine
- `Workflow`, `WorkflowVersion`
- `WorkflowStage`, `WorkflowTransition`, `WorkflowTransitionRole`
- `CaseStageHistory`

### 6. Work Management
- `Task`, `TaskComment`, `EscalationEvent`

### 7. Documents and Signatures
- `DocumentTemplate`, `GeneratedDocument`
- `CaseAttachment`, `AttachmentVersion`
- `SignatureEvent`

### 8. Communication and OTP
- `NotificationTemplate`, `Notification`
- `OtpRequest`, `OtpAttempt`
- `CommunicationLog`

### 9. Legal and Compliance
- `PrivilegedNote`, `LegalHold`, `RetentionPolicy`

### 10. Audit and Reporting
- `AuditLog`, `AccessLog`
- `ReportExport`, `MetricsEvent`

## Primary Lifecycle Relationships
1. A `RefusalCase` belongs to one tenant and links to one patient and one encounter.
2. A case may have one discharge decision and one discharge plan with multiple plan items.
3. A case progresses through workflow stages via transitions, each transition optionally role-gated.
4. Each transition writes one `CaseStageHistory` record.
5. Transition automation may create `Task` and `Notification` records.
6. Legal/compliance overlays can be attached any time (`PrivilegedNote`, `LegalHold`).
7. Every significant mutation should generate an `AuditLog` event.

## Data Integrity Patterns
- Tenant and time-based query indexes across case, task, audit, notification, and OTP tables.
- Unique constraints for key identifiers (tenant code, role code within tenant scope, permission key, etc.).
- Explicit enums for status and category fields to avoid ambiguous free-text states.
- Soft-delete semantics on `CaseAttachment` through `deletedAt`.

## Important Enums (Selected)
- Case lifecycle: `CaseStatus`, `CaseType`, `CasePriority`
- Workflow status: `WorkflowVersionStatus`
- Task management: `TaskStatus`, `TaskPriority`
- Acknowledgment and delivery: `AcknowledgmentRequestStatus`, `AcknowledgmentOutcome`, `DeliveryMethod`
- Notification/OTP: `NotificationStatus`, `OtpStatus`, `OtpAttemptResult`
- Compliance/reporting: `VisibilityScope`, `DeleteBehavior`, `ArchiveBehavior`, `ReportExportStatus`

## Migration Baseline
- Initial full-schema SQL migration generated at:
  - `backend-nest/prisma/migrations/20260315_modular_monolith_init/migration.sql`
