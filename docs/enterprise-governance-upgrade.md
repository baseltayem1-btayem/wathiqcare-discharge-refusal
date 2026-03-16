# Enterprise Governance Upgrade

## Scope

This upgrade extends WathiqCare from a refusal-workflow module into an enterprise-ready governance foundation with:

- multilingual template registry and fallback resolution
- scalable multi-department routing
- integration abstraction and configurable connectors
- reusable financial guarantee framework
- immutable append-only enterprise audit metadata
- centralized tenant/system configuration

## Implemented Backend Architecture

### 1. Multi-language template architecture

Implemented components:

- Model: `backend/models/document_template.py`
- Service: `backend/services/template_localization_service.py`
- Settings source: `backend/services/system_settings_service.py`
- APIs:
  - `GET /api/enterprise/templates`
  - `GET /api/enterprise/templates/{template_key}`
  - `GET /api/enterprise/templates/{template_key}/validate`
  - `GET /api/forms/templates?language_code=...`
  - `GET /api/forms/templates/{form_type}?language_code=...`
  - `GET /api/forms/templates/{form_type}/validate?language_code=...`

Resolution behavior:

1. requested language
2. tenant/system default language
3. English fallback

Generation path integration:

- `backend/core/discharge_workflow_service.py`
- `backend/core/forms_engine_service.py`

Document generation and preview now resolve active localized template versions and return fallback metadata.

### 2. Multi-department workflow scalability

Implemented components:

- Department master model: `backend/models/department.py`
- Department service/routing: `backend/services/department_service.py`
- Workflow routing extensions:
  - `backend/models/assignment_rule.py` (department/user/escalation routing fields)
  - `backend/models/workflow_task.py` (assigned/escalation department)
  - `backend/models/workflow_notification.py` (recipient department)
  - `backend/services/workflow_engine.py` (department-aware assignment)
  - `backend/services/task_service.py` + `backend/api/routers/workflow.py` (`/tasks/department/{department_code}`)

The workflow path remains backward-compatible while assignment/routing is now configurable by team, role, department, and named user.

### 3. Integration extensibility layer

Implemented components:

- Model: `backend/models/integration_config.py`
- Abstraction service and interface:
  - `backend/services/integration_abstraction_service.py`
  - `IExternalIntegrationService`
  - `IntegrationDispatcher`
- Config APIs:
  - `GET /api/enterprise/integrations`
  - `POST /api/enterprise/integrations`

Existing integration router now uses this abstraction and integration config state.

### 4. Financial guarantee framework

Implemented components:

- Models:
  - `backend/models/financial_liability_record.py`
  - `backend/models/financial_guarantee.py`
  - `backend/models/admission.py`
  - `backend/models/discharge_case.py` (admission link)
- Service: `backend/services/financial_guarantee_service.py`
- APIs:
  - `GET /api/enterprise/financial-guarantees`
  - `POST /api/enterprise/financial-guarantees`

Guaranteed types supported:

- `promissory_note`
- `deposit`
- `insurance_guarantee`
- `bank_guarantee`
- `corporate_undertaking`

Compatibility:

- `generate_financial_notice` flow can now create financial guarantees (including promissory note) using a reusable framework.

### 5. Enterprise audit and compliance hardening

Implemented components:

- Audit model extension: `backend/models/workflow_audit_log.py`
  - actor role/department/ip
  - entity type/id
  - payload summary
  - hash chain (`previous_hash`, `immutable_hash`)
- Immutable logging logic: `backend/services/audit_service.py`
- Audit usage added across:
  - workflow transitions
  - task completion/escalation
  - document preview/view/download
  - form generation/signature operations
  - financial guarantee creation

Audit records are append-only through application paths; no update/delete routes are exposed.

### 6. Central configuration layer

Implemented components:

- Model: `backend/models/system_setting.py`
- Service: `backend/services/system_settings_service.py`
- APIs:
  - `GET /api/enterprise/settings`
  - `POST /api/enterprise/settings`

Configurable domains include:

- default/supported languages
- escalation thresholds
- department routing rules
- financial guarantee rules
- compliance notification rules
- document version defaults
- audit retention

## Migrations and Data Model Work

Migration added:

- `backend/migrations/20260315_enterprise_governance_foundation/migration.sql`

Covers:

- new enterprise tables
- extension columns for existing workflow tables
- immutable audit hash-chain fields
- default departments and core settings seed

## Frontend Minimal Support

Minimal UI support added without redesign:

- language selection in generation modals
- financial guarantee placeholder inputs in financial notice modal
- language metadata handling in frontend document mapping

Files:

- `frontend/src/components/forms/GenerateRefusalFormModal.tsx`
- `frontend/src/components/forms/GenerateFinancialNoticeModal.tsx`
- `frontend/src/lib/types/documents.ts`
- `frontend/src/lib/services/dischargeRefusalWorkflow.service.ts`

## Notes

- Existing workflow contracts and endpoints were preserved.
- The upgrade is additive and production-safe by design.
