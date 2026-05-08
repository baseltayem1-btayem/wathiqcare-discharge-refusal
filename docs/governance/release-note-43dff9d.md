# Release Note: Modular Medico-Legal Platform Stabilization (43dff9d)

## 1. Executive Summary
This release stabilizes the modular medico-legal platform foundation while preserving existing discharge-refusal workflows. The change set is focused on module architecture, routing, API structure, and role-based access enforcement readiness for controlled rollout review.

## 2. New Module Architecture
- Introduced a unified module portal shell under /modules with module-level structure for:
  - Informed Consents
  - Electronic Promissory Notes
  - Discharge Refusal
- Added shared module shell and portal components for consistent navigation and tenant-context behavior.
- Centralized module catalog metadata and role access declarations.

## 3. Routes Added
Primary module routes added/updated:
- /modules
- /modules/informed-consents
- /modules/informed-consents/create
- /modules/informed-consents/list
- /modules/informed-consents/templates
- /modules/informed-consents/archive
- /modules/promissory-notes
- /modules/promissory-notes/create
- /modules/promissory-notes/list
- /modules/promissory-notes/archive
- /modules/discharge-refusal
- /modules/discharge-refusal/dashboard
- /modules/discharge-refusal/cases

## 4. APIs Added
- /api/modules/informed-consents
- /api/modules/promissory-notes

These APIs align with module boundaries and provide tenant-scoped server handlers for controlled module data operations.

## 5. RBAC and Tenant Scoping Approach
- Module-level access is defined centrally using allowed role sets per module.
- Platform-level role claims retain cross-module administrative visibility where appropriate.
- Tenant users are restricted to module access allowed by role, with server-side authorization checks used for page/API paths.
- Routing compatibility mappings are maintained for discharge-refusal operational paths.

## 6. Discharge-Refusal Compatibility Preservation
- Existing discharge-refusal entry points and operational flows remain available.
- Compatibility aliases and route mapping are preserved so legacy discharge workflow usage is not disrupted.
- No discharge workflow redesign is included in this stabilization commit.

## 7. Testing Evidence
Validation evidence for this stabilization package:
- Build: passed
- Unit/integration tests: 87 passed, 0 failed
- Smoke tests: 21 passed, 0 failed

## 8. Deployment Considerations
- Ensure migration sequence includes promissory-notes schema objects before traffic cutover.
- Roll out with tenant-aware monitoring on module APIs and route authorization behavior.
- Verify environment variables and session/cookie settings in target runtime before enabling broad access.
- Keep controlled rollout gate active during first production observation window.

## 9. Rollback Considerations
- Rollback target: previous stable deployment artifact before 43dff9d.
- Database rollback strategy: only after validating backward compatibility and migration safety; prefer forward-fix if data already written.
- Operational fallback: disable new module navigation exposure while preserving discharge-refusal baseline operations.
