# Release Notes: WathiqCare Informed Consents — Production Release Preparation

## 1) Executive Summary
This release prepares the Informed Consents module for production merge by adding release governance artifacts, controlled rollout gates, protected route enforcement, role-scoped access policy, and API integration scaffolding for legal and compliance workflows.

## 2) New Routes
- UI routes:
  - `/modules/informed-consents`
  - `/modules/informed-consents/create`
  - `/modules/informed-consents/list`
  - `/modules/informed-consents/templates`
  - `/modules/informed-consents/archive`
- API integration layer placeholders:
  - `/api/informed-consents/patient`
  - `/api/informed-consents/templates`
  - `/api/informed-consents/signatures`
  - `/api/informed-consents/pdf`
  - `/api/informed-consents/audit`

## 3) Added / Updated Components and Platform Surfaces
- Tenant production sidebar now includes direct Informed Consents navigation (Arabic/English labels).
- Module access catalog now uses explicit role-scoped release policy for Informed Consents.
- Informed Consents pages now support release-flag-driven exposure.
- Middleware added to protect informed-consents page/API routes.

## 4) Legal Workflow Features in Scope
- Role-scoped informed consent workflow access for clinical and legal issuance operations.
- Dedicated API integration placeholders for patient lookup, templates, signatures, PDF output, and audit events.
- Controlled rollout behavior through feature flags and middleware enforcement.

## 5) PDPL Readiness Status
- Release gate keeps module exposure controlled by environment flag.
- Access policy constrains informed-consent operations to approved roles.
- Protected route middleware enforces authenticated and role-appropriate access before route entry.
- Audit endpoint scaffold included for immutable-chain and retention policy implementation.

## 6) Audit Trail Placeholders
- API scaffold includes explicit audit integration endpoint:
  - `/api/informed-consents/audit`
- Database schema includes TODO placeholders for:
  - `consent_audit_logs`
  - `consent_generated_pdfs`
  - and related consent lifecycle entities.

## 7) Signature Workflow Readiness
- Signature integration endpoint scaffold:
  - `/api/informed-consents/signatures`
- Release comments define required production integrations:
  - OTP provider challenge/verification
  - digital signature provider and certificate verification

## 8) PDF Legal Package Generation Readiness
- Dedicated PDF integration endpoint scaffold:
  - `/api/informed-consents/pdf`
- Release comments define production integrations for:
  - PDF filler provider
  - immutable storage backend for finalized legal PDFs

## 9) Environment and Operational Controls
- Added feature flag:
  - `ENABLE_INFORMED_CONSENTS=true`
- Release readiness comment anchors added for:
  - OTP provider
  - PDF filler integration
  - digital signature provider
  - immutable storage
  - audit retention

## 10) Merge Readiness
The Informed Consents module is prepared for merge into `main` with controlled rollout safeguards, legal/compliance integration placeholders, and executive auditability documentation in place.
