# Production Go-Live Checklist

Date: 2026-05-18
Scope: Informed Consent Platform only
Current decision: Prepare only. Do not deploy yet.

## Current Status

- Core code/test readiness: acceptable
- Document/PDF/evidence readiness: acceptable
- Pilot environment readiness: not acceptable yet
- Production deployment authorization: not granted by this checklist

## Environment Readiness

- [x] Root production URL identified: `https://wathiqcare.online`
- [x] Canonical public URL in current configuration: `https://wathiqcare.online`
- [x] `npm run lint -- --quiet` completed with warnings only
- [x] `npm run build` completed successfully
- [x] Full consent UAT generator completed successfully
- [ ] Pilot IMC UAT accounts verified in target environment
- [ ] Pilot IMC MRN dataset complete in target environment
- [ ] Pilot authentication probes complete without `429` rate limiting
- [ ] Manual bedside workflow validation completed with hospital users

## Feature Flag Plan

Current safe defaults from `apps/web/src/lib/config/feature-flags.ts`:

- `ENABLE_TABLET_SIGNATURE=true`
- `ENABLE_BIOMETRIC_SIGNATURE=false`
- `ENABLE_CLINICAL_AI_ASSISTANT=false`
- `FF_ENABLE_AI_ASSIST=true`
- `FF_ENABLE_PDF_QR_CODE=true`
- `FF_ENABLE_PDF_WATERMARK=true`
- `FF_ENABLE_BILINGUAL_PDF=true`
- `FF_ENABLE_EVIDENCE_PACKAGES=true`
- `FF_ENABLE_AUDIT_CHAIN=true`

Recommended production rollout state:

- Keep biometric off for pilot go-live.
- Keep clinical AI assistant off by default unless the pilot explicitly requires it and physician review workflow is confirmed in production.
- Keep QR, evidence package, audit chain, and bilingual PDF enabled.
- Enable any patient-facing external signing features only after OTP provider and delivery monitoring are confirmed.

## Production URLs

- Public platform: `https://wathiqcare.online`
- WWW redirect target observed in current environment: `https://www.wathiqcare.online`
- Informed-consent verification UI route: `/modules/informed-consents/evidence-verify/[token]`
- Informed-consent verification API route: `/api/modules/informed-consents/evidence/verify/[token]`
- Local biometric UAT stub: `http://127.0.0.1:8787/biometric/verify`

## OTP Readiness

- [x] OTP request/verification routes exist
- [ ] Real pilot OTP delivery verified against target provider in the intended environment
- [ ] Pilot rate-limit thresholds verified against expected ward usage
- [ ] Duplicate-request handling verified in a live authenticated session

## PDF Readiness

- [x] Generated UAT artifacts passed for 19 scenarios
- [x] Arabic, English, and bilingual outputs generated
- [x] QR verification status valid in generated UAT outputs
- [x] Evidence package and audit trail artifacts generated
- [ ] Human print-quality review completed on hospital printers
- [ ] Mobile/tablet bedside preview reviewed manually by pilot staff

## AI Readiness

- [x] AI feature flagging and draft-only behavior validated
- [x] Immutable legal block protection validated
- [x] Physician review enforcement path validated at service level
- [ ] Live provider timeout/error path verified in authenticated pilot flow
- [ ] Real Arabic clinical phrasing reviewed by pilot physicians

## Signing Readiness

- [x] OTP signing validation path covered
- [x] Tablet evidence validation path covered
- [x] Signature evidence hashing and sanitized metadata validated
- [x] Biometric disabled-by-default behavior validated
- [x] Raw biometric rejection validated
- [ ] Live bedside OTP + tablet execution completed with pilot users
- [ ] Biometric remains blocked from production activation pending approvals

## Rollback Readiness

- [x] Existing rollback guidance exists in `DNS_CUTOVER_GUIDE.md`
- [x] Extended rollback and incident material exists in `CONTROLLED_PRODUCTION_PILOT_ROLLOUT_PACKAGE.md`
- [ ] Confirm exact deployment rollback owner and approval chain
- [ ] Confirm latest restorable production database backup timestamp
- [ ] Confirm Vercel rollback target build ID before any release
- [ ] Confirm OTP provider rollback/fallback communication plan

Rollback trigger conditions for informed-consent pilot:

1. pilot auth failures exceed acceptable threshold
2. OTP delivery failures block patient completion
3. PDF/evidence generation produces missing or invalid verification metadata
4. patient-sign workflow cannot complete reliably at bedside

## Monitoring Checklist

- [ ] Public health endpoint check on `https://wathiqcare.online/health`
- [ ] Application auth health check
- [ ] OTP request and verification success/failure counters
- [ ] Informed-consent PDF generation failures
- [ ] Evidence-package generation failures
- [ ] Informed-consent verification route failures
- [ ] Login `429` monitoring for pilot users
- [ ] Exception monitoring for `/api/modules/informed-consents/**`
- [ ] Audit/evidence integrity alert review

## Support Contacts

Confirm before go-live:

- [ ] Platform engineering on-call assigned
- [ ] IMC physician champion assigned
- [ ] Nursing supervisor assigned
- [ ] Legal reviewer assigned
- [ ] Compliance reviewer assigned
- [ ] OTP/provider escalation owner assigned

Reference from existing rollout material:

- Prior pilot support mailbox in repo material: `signing-pilot-support@wathiqcare.local`
- Status: verify or replace with a real monitored mailbox before any hospital pilot

## Incident Escalation Checklist

- [ ] Define Severity 1 owner for signing outages
- [ ] Define Severity 1 owner for PDF/evidence corruption concerns
- [ ] Define Severity 1 owner for authentication failures
- [ ] Define Legal/Compliance escalation owner for medico-legal incidents
- [ ] Define rollback authority for production release owner
- [ ] Publish escalation path to pilot ward staff before launch

## Deployment Preparation Checklist

- [ ] Verify current main branch commit intended for release
- [ ] Verify successful root build on clean dependency state
- [ ] Verify latest pilot-validation artifact after account/data repair
- [ ] Verify latest UAT artifact set is available under `uat-results/`
- [ ] Verify production env vars and secrets are present
- [ ] Verify database backup completed before release window
- [ ] Verify support/on-call roster published
- [ ] Verify no pending schema or feature-flag surprises remain

## Rollback Checklist

- [ ] Identify previous stable Vercel deployment
- [ ] Identify latest good database backup
- [ ] Prepare comms template for pilot pause/rollback
- [ ] Prepare auth/OTP vendor escalation template
- [ ] Confirm decision-maker for rollback authorization

## Feature Flag Rollout Plan

Phase 1:

- Keep biometric off
- Keep clinical AI assistant off unless explicitly approved for pilot cohort
- Keep tablet signing on
- Keep evidence, audit, and bilingual PDF on

Phase 2 after pilot stabilization:

- Re-evaluate clinical AI cohort enablement
- Re-evaluate external signing or OTP expansion only after delivery metrics are stable

## Pilot Rollout Plan

1. Repair and verify pilot IMC users.
2. Repair and verify pilot MRNs and encounters.
3. Re-run pilot validation and ensure auth probes are not rate-limited.
4. Run bedside validation with physician and nursing users on OTP and tablet paths.
5. Review generated PDFs and evidence packages with legal/compliance stakeholders.
6. Approve a limited pilot cohort only after the above is complete.

## IMC UAT Accounts To Prepare

Source: `apps/web/scripts/seed-uat-users.mjs`

- `dr.ahmed@wathiqcare.med.sa` — Pilot Physician
- `medicaldirector@wathiqcare.med.sa` — Medical Director
- `nursingsupervisor@wathiqcare.med.sa` — Nursing Supervisor
- `legalreviewer@wathiqcare.med.sa` — Legal Reviewer
- `compliance@wathiqcare.med.sa` — Compliance Reviewer

Preparation status in latest pilot artifact: not ready in target validation snapshot.

## Test Physician Accounts

- Primary physician validation account: `dr.ahmed@wathiqcare.med.sa`
- Secondary physician approval path: `medicaldirector@wathiqcare.med.sa`

## Test Patient Scenarios

Generated UAT scenarios currently available under `uat-results/`:

1. `01-general-treatment`
2. `02-surgical-consent`
3. `03-anesthesia-consent`
4. `04-blood-transfusion-consent`
5. `05-high-risk-procedure-consent`
6. `06-procedural-sedation-consent`
7. `07-dama-refusal-of-treatment`
8. `08-refusal-of-surgery`
9. `09-telemedicine-consent`
10. `10-photography-media-consent`
11. `11-pdpl-data-processing-consent`
12. `12-research-participation-consent`
13. `13-chemotherapy-consent`
14. `14-radiotherapy-consent`
15. `15-contrast-media-consent`
16. `16-icu-critical-care-consent`
17. `17-home-healthcare-consent`
18. `18-special-interventional-procedure-consent`
19. `19-minor-guardian-consent`

## Release Gate

Do not proceed to production deployment until all items below are true:

- pilot users verified
- pilot MRNs verified
- pilot auth checks pass without rate-limit interference
- bedside OTP/tablet validation completed
- legal/compliance review of generated outputs completed
- release owner and rollback owner assigned
