# Canonical OpenAPI Readiness Report

Date: 2026-03-13
Mode: Controlled implementation (no DB/schema/migration changes)

## 1. OpenAPI Generation Status

Status: SUCCESS

Generation source:
- Live FastAPI application object from backend/main.py

Runtime note:
- A runtime-only shim was used during generation to bypass an unrelated import defect:
  - backend/discharge/home_healthcare/homecare_agreement_pdf.py imports load_homecare_template
  - backend/discharge/home_healthcare/homecare_agreement_engine.py does not currently define that symbol
- No source file changes were required for this shim.

## 2. Artifact Location

Canonical snapshot:
- docs/openapi/openapi.json

## 3. Duplicate Route Status

Validation result:
- Duplicate method+path entries: 0

This confirms duplicate canonical ownership collisions have been removed.

## 4. Route Ownership Confirmation

Canonical owner for stabilized duplicate families:
- discharge_refusal_workflow

Validated canonical routes and owners:
- GET /api/documents/{document_id}/preview -> backend.api.routers.discharge_refusal_workflow.preview_document_v2
- GET /api/documents/{document_id}/download -> backend.api.routers.discharge_refusal_workflow.download_document_v2
- GET /api/cases/{case_id}/documents -> backend.api.routers.discharge_refusal_workflow.get_case_documents_v2

Forms-specific renamed routes present:
- GET /api/forms/documents/{document_id}/preview-html
- GET /api/forms/cases/{case_id}/documents

## 5. Conditional Endpoint Note

Endpoint visibility changes by environment flag:
- SHC_COMPLIANCE_MODULE=false (canonical baseline): 68 paths
- SHC_COMPLIANCE_MODULE=true: adds
  - /api/shc-compliance/workflow

No baseline routes are removed when SHC is enabled.

## 6. Remaining Schema-Quality Gaps

OpenAPI quality observations from generated artifact:
- Total paths: 68
- Total operations: 68
- Component schemas: 24
- Operations with requestBody: 32
- Operations with explicit 200/201 response schema content: 5
- Operations with 200/201 response ref schema: 1
- Operations with 422 validation schema: 59
- Operations missing tags: 1 (GET /)
- Mutation endpoints without requestBody: 1 (POST /api/discharge/evidence-bundle/{discharge_case_id})

Interpretation:
- Contract-level route ownership and collision risks are resolved.
- Response modeling depth remains uneven; many endpoints rely on inferred/default response shapes.

## 7. Final Decision

Decision: GO

Rationale:
- Canonical OpenAPI artifact generated successfully.
- No duplicate method+path collisions remain.
- Canonical ownership for document and case-document route families is singular and validated.
- Conditional SHC visibility is clearly identified.

Scope boundary reminder:
- This decision covers API contract readiness for entity/database design planning only.
- It does not initiate schema implementation or migration execution.
