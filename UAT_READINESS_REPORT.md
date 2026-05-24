# UAT Readiness Report

Date: 2026-05-18
Mode: Production Stabilization and UAT Validation
Scope: Informed Consent Platform only
Deployment status: Not deployed by this pass

## Executive Summary

The informed-consent code path is stable in controlled validation, but the target pilot environment is not ready for production rollout yet.

Heuristic readiness scores from this validation pass:

- Overall stability: 71%
- PDF readiness: 92%
- AI readiness: 78%
- Signing readiness: 84%
- Pilot readiness: 35%

Decision: Do not deploy yet. Resolve pilot account readiness, patient/UAT data readiness, and authentication rate-limit behavior first.

## Validation Evidence Run

Executed in this pass:

- Focused informed-consent validation tests: 50 passed, 0 failed
- Full consent UAT generator: 19 passed, 0 failed
- Pilot readiness validation: 3 passed, 17 failed in latest artifact
- `npm run lint -- --quiet`: passed with warnings only
- `npm run build`: passed

Primary evidence sources:

- `uat-results/summary.json`
- `apps/web/artifacts/pilot-validation/pilot-validation-2026-05-18T04-42-50-770Z.json`
- focused tests under `apps/web/src/lib/server` and `apps/web/src/lib/core`

## Passed Validations

### Workflow and document generation

- Patient search normalization and UAT MRN alias coverage passed in focused tests.
- Signature evidence validation passed for OTP, tablet, and biometric sanitization paths.
- Audit chain integrity tests passed.
- Full consent UAT generator sealed 19 consent scenarios with valid QR verification and no missing mandatory fields.
- Generated UAT scenarios include general treatment, surgical consent, anesthesia, blood transfusion, DAMA/refusal, ICU critical care, minor guardian consent, and other high-risk flows.

### AI validation

- AI feature flag behavior validated at unit level.
- AI result wrapping stays in draft status.
- Physician review enforcement and pending-review semantics are covered by the AI service path and guardrail tests.
- Immutable legal block protection and AI dynamic-field restrictions passed.
- Arabic and English disclaimer generation passed.
- Structured metadata extraction and specialty prompt mapping passed.

### Signature and evidence validation

- Patient acknowledgment enforcement passed.
- Signature evidence hashing passed.
- Sanitized PDF signature metadata mapping passed.
- Biometric feature remains disabled by default.
- Raw biometric payload rejection passed.
- Local-agent-only DigitalPersona normalization passed.

### PDF and verification validation

- Informed-consent PDF preview adapter tests passed after aligning the verification route to the live consent path.
- Full UAT artifact generation produced Arabic, English, and bilingual PDF outputs for all 19 scenarios.
- QR verification status was `VALID` across generated UAT artifacts.
- Language isolation counts were zero in generated UAT outputs.

## Failed Validations

### Pilot environment readiness

Latest pilot-readiness artifact: `apps/web/artifacts/pilot-validation/pilot-validation-2026-05-18T04-42-50-770Z.json`

Failures:

- 5 of 5 expected IMC pilot UAT users were not present in the validated database snapshot.
- 7 of 10 expected pilot MRNs were missing.
- Authentication probes returned `429` for all five pilot users in the latest run.

Interpretation:

- The pilot environment is not provisioned consistently enough for a hospital-facing validation round.
- Auth probe results are also affected by rate limiting, so the login check is not currently a clean readiness signal.

## Warnings

- `npm run lint -- --quiet` passed with 34 warnings and 0 errors. Most warnings are pre-existing unused variables, `<img>` optimization warnings, and hook dependency warnings outside this stabilization slice.
- Next.js build emits a non-blocking Turbopack NFT tracing warning from `apps/web/next.config.js` via the legal-case PDF route.
- Live performance timings for authenticated bedside workflow actions were not fully instrumented in this pass.
- Live OTP provider behavior, live AI provider timeout handling, and live patient-side interruption testing were not fully exercised end-to-end because the pilot auth/data layer is not ready.

## Stability Findings

- Core informed-consent validation surfaces are stable in local and generated-UAT execution.
- The informed-consent PDF preview adapter had a route mismatch against the live verification path; this was corrected in this pass.
- `server-only` import behavior was interfering with the plain `tsx` test runner; this was stabilized for non-Next execution without changing the production runtime path.
- The build toolchain required a clean reinstall with dev dependencies after environment drift introduced a transient dependency-resolution failure. The final required build passed.

## PDF Quality Findings

- Generated UAT outputs demonstrate Arabic, English, and bilingual document variants for 19 scenarios.
- QR and legal seal generation are consistent across all generated UAT scenarios.
- No missing mandatory fields were reported in generated outputs.
- No language leakage was reported in generated outputs.
- Remaining gap: this pass did not include visual human review of print fidelity, typography, or overflow on actual hospital printers.

## AI Findings

- AI safety and governance guardrails are materially stronger than the operational pilot layer.
- AI is still gated by feature flags and physician review, which is appropriate for pilot readiness.
- Immutable legal block protection and dynamic-field restrictions are in place and validated.
- Remaining gap: live provider failure modes such as oversized responses, malformed JSON from the real provider, and end-to-end Arabic phrasing review were not executed against an authenticated live pilot session in this pass.

## Medico-Legal Findings

- Evidence hashing, audit-chain validation, QR verification, and sealed UAT outputs support defensibility in generated artifacts.
- Biometric raw payload rejection and disabled-by-default control reduce legal and privacy exposure.
- Clinical AI remains physician-reviewed and does not directly finalize legal content.
- Main medico-legal blocker is not document integrity; it is pilot operational readiness. Missing pilot users and missing pilot MRNs undermine defensible bedside execution if go-live were attempted now.

## Performance Findings

Measured in this pass:

- Focused informed-consent test slice: 50 tests completed successfully in under 0.5s.
- PDF preview adapter test: 3 tests passed in under 0.6s.
- Production build: successful compile and type phase completed in roughly 20s before route finalization.

Not fully measured in this pass:

- authenticated consent page load time
- live AI generation latency
- live OTP turnaround time
- live signing submission latency
- live verification generation latency

Reason: pilot environment account/data readiness and rate-limit behavior prevented clean authenticated end-to-end performance measurement.

## Critical Blockers Before Production

1. Pilot IMC UAT accounts are not provisioned or not visible to the validated database snapshot.
2. Pilot MRN coverage is incomplete; 7 of 10 expected MRNs were missing in the latest readiness artifact.
3. Authentication readiness is obscured by `429` rate limiting on pilot probes.
4. Bedside/live workflow usability cannot be signed off responsibly until the account and patient-data prerequisites are fixed.

## Recommended Fixes Before Production

1. Run the IMC pilot UAT user seed/repair flow and verify all five expected users exist, are active, verified, and mapped to the correct tenant.
2. Restore or seed the missing pilot MRNs: `IMC-2026-02002`, `02003`, `02004`, `02005`, `02010`, `02015`, `02020`.
3. Review login rate-limit policy for pilot validation so readiness probes do not self-block with `429`.
4. Execute one authenticated bedside validation round covering OTP-only, tablet, and patient review/sign flows after the pilot users and MRNs are fixed.
5. Perform human visual PDF review on the generated UAT outputs before production rollout.
6. Keep `ENABLE_BIOMETRIC_SIGNATURE=false` until HID SDK, Legal, PDPL, and cybersecurity approvals are explicitly complete.

## Pilot Readiness Score

Pilot readiness score: 35%

Reasoning:

- Code-path stability is good.
- Generated document/evidence quality is good.
- Pilot operational prerequisites are not ready.
- Hospital usability signoff cannot be completed credibly until users, MRNs, and login validation are repaired.
