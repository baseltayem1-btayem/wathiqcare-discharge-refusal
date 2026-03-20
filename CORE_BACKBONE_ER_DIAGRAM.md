# CORE BACKBONE ER DIAGRAM

Date: 2026-03-13
Status: Architecture documentation (non-executable)

## Mermaid ER Diagram

```mermaid
erDiagram
    WORKFLOW_DISCHARGE_CASES {
        uuid case_id PK
        uuid tenant_id
        string current_status
        datetime updated_at
    }

    WORKFLOW_WORKFLOW_EVENTS {
        uuid event_id PK
        uuid case_id FK
        uuid actor_user_id
        string event_type
        datetime occurred_at
    }

    WORKFLOW_WORKFLOW_TASKS {
        uuid task_id PK
        uuid case_id FK
        uuid event_id FK
        string task_type
        string task_status
    }

    WORKFLOW_LEGAL_ESCALATIONS {
        uuid legal_escalation_id PK
        uuid case_id FK
        string escalation_status
        datetime escalated_at
    }

    WORKFLOW_COMPLIANCE_REVIEWS {
        uuid compliance_review_id PK
        uuid case_id FK
        string review_status
        datetime reviewed_at
    }

    DOCUMENTS_DOCUMENT_RECORDS {
        uuid document_id PK
        uuid case_id FK
        uuid event_id FK
        string document_type
        string storage_path
        string status
    }

    DOCUMENTS_DOCUMENT_SIGNATURES {
        uuid signature_id PK
        uuid document_id FK
        string signature_method
        datetime signed_at
    }

    DOCUMENTS_EVIDENCE_BUNDLES {
        uuid evidence_bundle_id PK
        uuid case_id FK
        datetime generated_at
    }

    AUDIT_FORENSIC_AUDIT_LOGS {
        uuid forensic_audit_log_id PK
        uuid case_id FK
        uuid event_id FK
        datetime created_at
    }

    INTEGRATION_INTEGRATION_REFERENCES {
        uuid integration_reference_id PK
        uuid case_id FK
        string external_system_code
        datetime observed_at
    }

    WORKFLOW_DISCHARGE_CASES ||--o{ WORKFLOW_WORKFLOW_EVENTS : "current state -> chronological history"
    WORKFLOW_DISCHARGE_CASES ||--o{ WORKFLOW_WORKFLOW_TASKS : "case operational tasks"
    WORKFLOW_DISCHARGE_CASES ||--o{ WORKFLOW_LEGAL_ESCALATIONS : "case legal trace"
    WORKFLOW_DISCHARGE_CASES ||--o{ WORKFLOW_COMPLIANCE_REVIEWS : "case compliance trace"
    WORKFLOW_DISCHARGE_CASES ||--o{ DOCUMENTS_DOCUMENT_RECORDS : "mandatory document case linkage"
    WORKFLOW_WORKFLOW_EVENTS ||--o{ DOCUMENTS_DOCUMENT_RECORDS : "event linkage expected (event_id)"
    DOCUMENTS_DOCUMENT_RECORDS ||--o{ DOCUMENTS_DOCUMENT_SIGNATURES : "signature proof chain"
    WORKFLOW_DISCHARGE_CASES ||--o{ DOCUMENTS_EVIDENCE_BUNDLES : "evidence bundle traceability"
    WORKFLOW_DISCHARGE_CASES ||--o{ AUDIT_FORENSIC_AUDIT_LOGS : "forensic case audit trail"
    WORKFLOW_DISCHARGE_CASES ||--o{ INTEGRATION_INTEGRATION_REFERENCES : "external integration trace"
```

Entity name mapping used in diagram:
- WORKFLOW_DISCHARGE_CASES = workflow.discharge_cases
- WORKFLOW_WORKFLOW_EVENTS = workflow.workflow_events
- WORKFLOW_WORKFLOW_TASKS = workflow.workflow_tasks
- WORKFLOW_LEGAL_ESCALATIONS = workflow.legal_escalations
- WORKFLOW_COMPLIANCE_REVIEWS = workflow.compliance_reviews
- DOCUMENTS_DOCUMENT_RECORDS = documents.document_records
- DOCUMENTS_DOCUMENT_SIGNATURES = documents.document_signatures
- DOCUMENTS_EVIDENCE_BUNDLES = documents.evidence_bundles
- AUDIT_FORENSIC_AUDIT_LOGS = audit.forensic_audit_logs
- INTEGRATION_INTEGRATION_REFERENCES = integration.integration_references

## Explanatory Notes

- Current state rule: `workflow.discharge_cases` is the canonical current-state case header for operational workflow decisions.
- Workflow history rule: `workflow.workflow_events` stores the complete chronological event history for each case.
- Document traceability rule: every `documents.document_records` row must link to `case_id`, and should link to `event_id` wherever operationally possible; any missing event linkage must be explicitly documented as an exception.
