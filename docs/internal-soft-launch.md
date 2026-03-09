# Internal Soft Launch Runbook

## Objective
Validate the platform in a controlled hospital pilot before external rollout, with focus on the Case Based Medico-Legal Workflow:

1. Case
2. Documents
3. Signature
4. Evidence

## Current Readiness (March 9, 2026)

Status: GO for internal soft launch

Validation baseline:
- Backend tests: 60 passed
- Frontend lint: passed
- Frontend production build: passed
- Full verification script: passed (`./check_all.sh`)

## Public Homepage Release (WATHIQCARE.ONLINE)

Release objective:
- Serve bilingual public landing page on root route `/`
- Keep authenticated system reachable and unchanged via `/login` and existing protected routes

Production route map:
- Public homepage: `https://wathiqcare.online/`
- System entry: `https://wathiqcare.online/login`
- Authenticated modules (must remain reachable after login):
  - `/dashboard`
  - `/cases`
  - `/consents`
  - `/workflow`
  - `/escalation-timeline`
  - `/audit-log`
  - `/legal-case-file`
  - `/admin`
  - `/bundles`

Public landing acceptance checklist:
- Root route displays public website content, not the internal dashboard
- Language toggle switches Arabic and English correctly
- Arabic displays RTL layout correctly
- English displays LTR layout correctly
- Enter System CTA routes to `/login`
- Request Demo CTA opens configured contact channel (`mailto:` placeholder is acceptable)
- Existing login flow and post-login redirects still work
- Existing protected modules continue to function without route regressions

Production verification commands:
```bash
curl -I https://wathiqcare.online/
curl -I https://wathiqcare.online/login
```

Expected result:
- `https://wathiqcare.online/` returns 200 and serves landing HTML
- `https://wathiqcare.online/login` returns 200 and serves login page

Manual browser validation (required):
1. Open `https://wathiqcare.online/`
2. Switch EN/AR from landing header
3. Confirm RTL/LTR and section content changes
4. Click Enter System and confirm navigation to `/login`
5. Login with pilot account and confirm redirect to dashboard/app
6. Open `cases`, `consents`, `workflow`, and `audit-log` to confirm continuity

## Included Product Scope

### Core Experience
- Dashboard with KPI cards, legal risk board, work queue, and system activity timeline
- Patient Workspace with required tabs:
  - Overview
  - Consents
  - Agreements
  - ROI
  - Archive
  - Audit Log
- Document issuance workspace with legal templates and action controls
- Electronic signature flows:
  - Refusal form
  - Financial responsibility notice
  - Informed consent
  - Home care agreement

### Compliance
- Compliance dashboard reports:
  - CBAHI compliance
  - JCI consent compliance
  - PDPL logs
  - Missing consents

### Integrations
- HIS endpoint: `GET /his/patient/{mrn}`
- FHIR endpoints:
  - `GET /fhir/patient/{patient_id}`
  - `GET /fhir/encounter/{encounter_id}`
  - `GET /fhir/procedure/{procedure_id}`
  - `GET /fhir/consent/{consent_id}`
- Integration status endpoints:
  - Backend: `GET /integrations/systems`
  - Frontend API bridge: `GET /api/integrations/status`

### Admin Operations
- Tenant lifecycle:
  - Create Tenant
  - Suspend/Activate Tenant
- Subscription controls:
  - Plan
  - Billing interval
  - Status
  - Seat limit
- User management with healthcare role visibility:
  - Doctor
  - Nurse
  - Legal Officer
  - HIM

## Internal Launch Checklist

### Pre-Launch (T-24h)
- Confirm production environment variables are set:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`
  - Optional integration flags:
    - `HIS_INTEGRATION_ENABLED`
    - `FHIR_INTEGRATION_ENABLED`
    - `DOCUWARE_ENABLED`
    - `SHAREPOINT_ENABLED`
    - `ERP_ENABLED`
- Run full quality gate:
  - `./check_all.sh`
- Confirm database migrations are applied
- Seed at least one pilot tenant and pilot users (Doctor, Nurse, Legal Officer, HIM)

### Launch Day (T0)
- Start services
- Perform smoke tests:
  - Login and redirect to dashboard
  - Open public root URL and validate landing page first-render
  - Validate Enter System CTA to `/login`
  - Create case
  - Open patient workspace
  - Generate document
  - Execute signature flow
  - Verify final PDF issuance
  - Generate evidence bundle
  - Validate compliance report updates
- Confirm integration status panel reflects expected environment flags

### Post-Launch Monitoring (T+0 to T+72h)
- Review audit trail volume and error patterns every 4 hours
- Track missing consent counts and legal escalations daily
- Validate PDPL-related logs are being generated
- Monitor tenant usage and seat capacity in Admin panel

## Go / No-Go Criteria

Go if all are true:
- Quality gate passes (`./check_all.sh`)
- Root domain serves public landing (`/`)
- Enter System routes to `/login`
- Login and protected routes remain functional
- No blocker in signature verification
- No blocker in document generation and archive
- No critical authentication or tenant-access errors
- No critical data-loss or audit-log failures

No-Go if any are true:
- Root route still serves internal app unexpectedly
- Enter System does not route to `/login`
- Authenticated modules inaccessible after landing release
- Login/session instability
- Final signed PDF cannot be issued
- Evidence bundles fail consistently
- Compliance reporting broken for pilot tenant

## Rollback Plan

If critical issue appears:
1. Disable pilot user access at tenant level (suspend tenant)
2. Revert to previous stable commit
3. Redeploy backend/frontend
4. Re-run smoke tests on rollback version
5. Re-enable tenant after issue fix and validation

## Pilot Feedback Loop

Collect structured feedback from Doctor, Nurse, Legal Officer, and HIM:
- Clarity of workflow steps
- Signature friction points
- Legal/compliance confidence
- Report usefulness

Apply fixes in small release batches (daily or every 48 hours during soft launch window).
