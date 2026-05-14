# Consent Template Output Verification Report

Date: 2026-05-12
Repository: wathiqcare-discharge-refusal
Scope: Full verification for all 19 WathiqCare consent templates
Execution: npm run uat:full-consent

## Verification Criteria

For each template, the following were verified:

1. Arabic PDF generated successfully.
2. English PDF generated successfully.
3. Consent snapshot JSON exists.
4. Audit trail JSON exists.
5. Evidence package exists.
6. QR verification works.
7. Legal seal hash exists.
8. Signature block exists.
9. OTP/signing log exists where applicable.
10. Required sections exist:
   - patient information
   - physician information
   - diagnosis
   - procedure/service
   - benefits
   - risks
   - complications
   - alternatives
   - consequences of refusal
   - patient acknowledgment
   - physician declaration
   - witness/guardian/interpreter where applicable
   - signature block

## Verification Matrix

| Template Name | Arabic PDF | English PDF | Risks | Alternatives | Refusal Consequences | Signature | QR | Audit | Evidence Package | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| 01-general-treatment | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 02-surgical-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 03-anesthesia-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 04-blood-transfusion-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 05-high-risk-procedure-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 06-procedural-sedation-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 07-dama-refusal-of-treatment | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 08-refusal-of-surgery | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 09-telemedicine-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 10-photography-media-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 11-pdpl-data-processing-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 12-research-participation-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 13-chemotherapy-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 14-radiotherapy-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 15-contrast-media-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 16-icu-critical-care-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 17-home-healthcare-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 18-special-interventional-procedure-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 19-minor-guardian-consent | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## Notes on Item 9 (OTP/Signing Log)

- Signing block exists in all templates via consent-snapshot signatures array.
- OTP-specific signing was not applicable in this generated UAT batch (no signature method marked OTP in snapshot data).
- Therefore, OTP log check is treated as Not Applicable, while signing log/signature evidence is present.

## Final Status

PASS criteria requires all 19 templates to have complete outputs successfully.

Result: PASS
- Total templates: 19
- Passed: 19
- Failed: 0

## Evidence Sources

- uat-results/summary.json
- uat-results/*/arabic.pdf
- uat-results/*/english.pdf
- uat-results/*/consent-snapshot.json
- uat-results/*/audit-trail.json
- uat-results/*/qr-verification.json
- uat-results/*/evidence-package/
- validation_results.json
