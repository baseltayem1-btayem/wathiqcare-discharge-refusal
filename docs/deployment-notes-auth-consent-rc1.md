# Deployment Notes (AUTH-CONSENT-RC1)

Date: 2026-05-15
Branch: chore/document-migration-drift-consent-templates

## Change Package
- Login stabilization updates.
- Informed-consent RBAC correction.
- MRN DB fallback hardening.
- Consent-template schema repair and migration-drift documentation.
- Persisted consent document generation validation.
- Real PDF generation path validation for UAT artifacts.

## Pre-Deploy Checks
1. Verify branch and commit integrity.
2. Run migration drift detection against target DB.
3. Run schema readiness check for informed-consents.
4. Run UAT/full consent output generation and verify summary.
5. Confirm signing and audit endpoints health.

## Deploy Sequence
1. Deploy backend services and confirm readiness endpoints.
2. Deploy frontend and verify login and role routing.
3. Run smoke checks for:
   - login
   - case load
   - consent capture
   - PDF generation
   - audit trail write
4. Validate one full bilingual consent flow in pilot tenant.

## Post-Deploy Validation
- Confirm consent_templates.risk_level schema presence in target DB.
- Confirm persisted document creation succeeds.
- Confirm final PDF generation and download URL availability.
- Confirm QR verification endpoint response and integrity.
- Confirm role permissions in doctor/legal/observer paths.

## Monitoring Focus (First 24 Hours)
- Login error rate and auth token failures.
- Consent save latency and failure ratio.
- PDF generation failures and timeout ratio.
- Signature/OTP failure ratios.
- Audit trail ingestion latency.

## Release Governance
- Controlled pilot only.
- Track all deviations in known limitations.
- Escalate immediately on any legal-document generation regressions.
