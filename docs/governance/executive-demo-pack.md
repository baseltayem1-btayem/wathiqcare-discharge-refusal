# WathiqCare Executive Demo Pack

## Demo Objective

Demonstrate the validated WathiqCare baseline as a production-ready medico-legal discharge refusal platform with preserved TrakCare-style clinical workflow presentation.

## Recommended Demo Environment

- Controlled non-production environment aligned to the validated production-like baseline
- UTF-8-safe database configuration
- Seeded users for approved demo roles only
- No live patient data

## Demo Flow

1. Login to the system with an approved demonstration account.
2. Show the role dashboard and explain role-based landing behavior.
3. Open a case workspace and show the clinical execution context.
4. Demonstrate secure patient flow readiness and explain patient-facing secure link use.
5. Show signature or refusal submission evidence capture.
6. Show audit trail visibility for the workflow.
7. Show Arabic and English PDF output.
8. Show legal package generation and explain medico-legal packaging.

## Executive Screenshot List

- Login screen
- Role dashboard
- Case workspace
- Secure patient decision screen
- Signature or attestation evidence view
- Audit trail view
- Arabic PDF sample
- English PDF sample
- Legal package view

## Architecture Overview

- Next.js application for authenticated clinical and legal workflow surfaces
- Backend services for OTP, document workflow, and signature support
- PostgreSQL-backed persistence with UTF-8 requirements for Arabic evidence fidelity
- Audit and audit-chain persistence supporting legal defensibility

## Legal Defensibility Summary

- Public secure decisions are captured and persisted
- OTP control path includes expiry, resend throttling, and replay protection
- Signature and refusal actions generate auditable traceability
- Legal package generation is tied to validated readiness and evidence assembly
- Arabic and English output paths support bilingual medico-legal operation

## Key Risks Now Closed

- Arabic legal package persistence defect due to non-UTF-8 storage
- OTP replay, resend, and expiry control gaps
- Missing public secure decision audit persistence
- Login or hydration instability affecting validated entry flow

## Remaining Operational Controls

- Maintain environment variable parity across deployed surfaces
- Monitor audit, OTP, secure-link, and PDF failure signals daily
- Enforce controlled-release discipline around the frozen baseline
- Use rollback on any legal-defensibility regression instead of live patching

## Presenter Notes

- Keep the demonstration aligned to validated workflows only
- Do not improvise unvalidated admin or configuration changes during the session
- If asked about roadmap items, separate them clearly from the frozen release baseline
