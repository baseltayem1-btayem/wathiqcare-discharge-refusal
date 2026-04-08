# WathiqCare Saudi PDPL Medico-Legal Implementation Plan

## 1) Architecture plan

### Core target state
Transform `WathiqCare` into a **Saudi-compliant medico-legal execution platform** with the following layers:

1. **Case-Centric Execution Layer**
   - Keep all refusal/discharge workflows centered around `Case`.
   - Store medical + legal execution state in structured metadata and normalized compliance tables.

2. **Data Classification & Residency Layer**
   - Classify data into `PATIENT_SENSITIVE`, `OPERATIONAL`, `AUDIT_LOG`, `ANALYTICS`, and `BACKUP`.
   - Enforce `KSA_ONLY` for patient-sensitive/legal evidence paths.
   - Block risky deployment and export operations when region policy is not Saudi-compliant.

3. **Tenant Isolation & Security Policy Layer**
   - Mandatory `tenant_id` on all compliance entities.
   - Server-side tenant guards for reads/writes/exports.
   - Role-aware privileged access logging and MFA/step-up enforcement hooks.

4. **Legal Readiness Gate**
   - Evaluate a blocking checklist before allowing `READY_FOR_LEGAL`, `FINALIZED`, or legal export.
   - Keep a persisted readiness result and block reasons.

5. **Tamper-Evident Audit Chain**
   - Append every critical case/legal event into a hash chain with `previous_hash` and `current_hash`.
   - Allow verification/export for legal defensibility.

6. **Privacy & Governance Layer**
   - Consent management, DSR workflow, retention/deletion governance, incident response, and backup/DR registries.

7. **Compliance & Admin Experience**
   - New `/admin/*` screens for privacy, security, data residency, retention, incidents, backups, and report access.

---

## 2) DB schema proposal

### New tables / entities
- `consent_records`
- `data_subject_requests`
- `retention_policies`
- `retention_actions`
- `legal_readiness_checks`
- `audit_chain_events`
- `security_incidents`
- `backup_jobs`
- `backup_restore_tests`
- `report_access_logs`
- `data_residency_rules`
- `tenant_security_settings`
- `privileged_access_logs`

### Key design decisions
- All tables are **tenant-scoped**.
- All legal/compliance evidence tables support **append-heavy** usage.
- Sensitive legal/audit records are **not normally hard-deleted**.
- Add indexes on `tenant_id`, `case_id`, status, SLA dates, and timestamps.

---

## 3) API contract proposal

### Case & legal readiness
- `GET /api/discharge/cases/:caseId/legal-readiness`
- `POST /api/discharge/cases/:caseId/legal-package`
- `GET /api/discharge/cases/:caseId/audit-chain`
- `POST /api/discharge/cases/:caseId/presentation`
- `POST /api/discharge/cases/:caseId/signature`
- `POST /api/discharge/cases/:caseId/witness`

### Privacy / PDPL
- `GET|POST /api/discharge/cases/:caseId/consent`
- `GET|POST /api/privacy/dsr`
- `PATCH /api/privacy/dsr/:requestId`

### Admin governance
- `GET /api/admin/data-residency`
- `GET /api/admin/privacy`
- `GET /api/admin/security`
- `GET|POST /api/admin/retention`
- `GET|POST /api/admin/incidents`
- `GET|POST /api/admin/backups`
- `GET /api/admin/reports-access`

### Response shape principles
- Structured JSON
- Explicit `status`, `sla_state`, and `blockers`
- Role and tenant validation errors via consistent API errors

---

## 4) UI routes/components plan

### Case page `/cases/[id]`
Add sections for:
- `Overview`
- `Medical Workflow`
- `Legal Readiness`
- `Consent & Signatures`
- `Audit Trail`
- `Documents`
- `Assignments & SLA`
- `Security / Access Log`

### New admin pages
- `/admin/privacy`
- `/admin/security`
- `/admin/data-residency`
- `/admin/retention`
- `/admin/incidents`
- `/admin/backups`
- `/admin/reports-access`

### UX rules
- Use `compliant / warning / blocked` indicators.
- Reuse the current shell and case-centric navigation.
- Do not create duplicate workflow pages.

---

## 5) Implementation sequence

### Phase 1 (current priority)
1. Data residency policy + KSA deployment validation
2. Tenant isolation hardening
3. Tamper-evident audit chain foundation
4. Legal readiness engine + export blocking

### Phase 2
5. Consent module
6. DSR workflow module
7. Retention engine
8. Report access logging

### Phase 3
9. Incident response module
10. Backup / DR dashboard
11. Admin privacy/security screens
12. Compliance exports/reports

### Phase 4
13. MFA / step-up enforcement completion
14. Mobile/API hardening roadmap items
15. Extended automated tests

### Phase 5
16. Unified compliance command center across legal, privacy, security, and resilience controls
17. Executive attention queue with continuous control posture scoring
18. Exportable compliance dashboard for operational and audit review

### Phase 6
19. Controlled export approval workflow for compliance and quality evidence releases
20. Step-up protected approve/reject actions for sensitive report exports
21. Enforced release gates on CSV evidence downloads with full auditability

### Phase 7
22. Third-party processor register with Saudi residency and cross-border transfer safeguards
23. Due-diligence review workflow for vendor approvals, restrictions, and overdue review escalations
24. Compliance dashboard integration for continuous third-party risk visibility

### Phase 8
25. Policy attestation register for PDPL, CBAHI, JCI, and medico-legal governance evidence
26. Temporary exception / waiver workflow with expiry and accountable owner tracking
27. Compliance dashboard integration for overdue attestations and open governance exceptions

### Phase 9
28. Workforce training readiness register for PDPL, legal escalation, and security drill obligations
29. Role-based mandatory training completion evidence with accountable owners and due dates
30. Compliance dashboard integration for overdue training and critical workforce readiness gaps

### Phase 10
31. Corrective action and remediation register for incidents, audit findings, privacy gaps, and vendor issues
32. Accountable owner, root-cause, due-date, and closure-evidence workflow for each remediation item
33. Compliance dashboard integration for overdue and critical open remediation actions

---

## 6) Non-functional guardrails
- Preserve existing production-safe case flows.
- Enforce tenant scope on every new endpoint.
- Prefer server-side blocking for legal/privacy controls.
- Keep the implementation Saudi PDPL-oriented and legally defensible.