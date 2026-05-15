# Controlled Pilot Readiness Report (RC1)

Date: 2026-05-15
Release Candidate: AUTH-CONSENT-RC1
Branch: chore/document-migration-drift-consent-templates

## Scope
Pilot/UAT hardening closure for:
- login stabilization
- informed-consent RBAC fix
- MRN DB fallback
- consent-template schema repair
- persisted consent document generation
- real PDF generation path

## Release Note Summary
- Login stabilization updates reduced login route/session regressions.
- Informed-consent RBAC fix enforces role-scoped case actions.
- MRN DB fallback supports resilient patient lookup when primary data path degrades.
- Consent-template schema repair completed, including migration-drift mitigation.
- Persisted informed-consent document generation validated.
- Real PDF generation path validated in UAT flow outputs.

## Final UAT Checklist

| Item | Status | Evidence |
|---|---|---|
| Arabic/English | PASS | `uat-results/summary.json` reports 19/19 modules PASS, zero language leakage, and Arabic/English/bilingual artifacts. |
| Mobile | PASS | `node qa-playwright-check.js` completed successfully with mobile checks and screenshots. |
| QR verification | PASS | `uat-results/summary.json` reports `qrVerificationStatus: VALID` across modules; QR integrity also validated in `FINAL_END_TO_END_SIGNING_REPORT.md`. |
| PDF download | PASS (UAT) / WARN (live fetch) | UAT artifacts include generated PDFs for all 19 modules; live fetch check failed in `e2e-pdf-verification-report.json` with `fetch failed`. |
| Secure signing | PASS with warnings | `FINAL_END_TO_END_SIGNING_REPORT.md` final status SUCCESS, no failed steps, with warning-only simulated public endpoint steps. |
| Workflow approvals | PASS | Role flow and legal readiness behavior validated in `SAFE_ROLE_UAT_COMPLETION.md` and `SAFE_ROLE_UAT_EXECUTION_SUMMARY.md`. |
| Audit trail | PASS | Audit trail generation for all modules in UAT artifacts; immutable-chain checks in `FINAL_END_TO_END_SIGNING_REPORT.md`. |
| Role permissions | PASS | Role isolation and observer mode improvements validated in `SAFE_ROLE_UAT_COMPLETION.md`. |

## Drift and Schema Readiness
- Expected migration: `apps/web/prisma/migrations/0024_enterprise_consent_templates.sql`
- Technical note: `docs/technical-notes/migration-drift-enterprise-consent-templates.md`
- Root cause recorded: legacy Prisma migration ledger drift
- Mitigation recorded: controlled direct SQL alignment and verification

## Go/No-Go Decision
Decision: GO for controlled pilot, with known limitations tracked and rollback/deployment procedures attached.

## Required Follow-Up Gates
1. Migration drift check before production deploy.
2. Schema readiness health check for informed-consents before workflow enablement.
3. Repeat live PDF e2e fetch validation in target environment before broad rollout.
