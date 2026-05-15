# Known Limitations (AUTH-CONSENT-RC1)

Date: 2026-05-15

## 1) Live PDF E2E Fetch Dependency
- Observation: `e2e-pdf-verification-report.json` failed at step "Generate Draft PDF" with `fetch failed`.
- Impact: Live endpoint reachability/transport path may intermittently block the standalone fetch-based verifier.
- Current mitigation: UAT output generation remains successful (`uat:full-consent` passed 19/19).
- Required action: Re-run live fetch verification in the target pilot environment and capture network trace on failure.

## 2) Signing Flow Public Endpoint Simulation Warnings
- Observation: `FINAL_END_TO_END_SIGNING_REPORT.md` includes warning steps using simulated public endpoint behavior while final status remains SUCCESS.
- Impact: Non-blocking for controlled pilot, but should be removed for broad release confidence.
- Required action: Confirm full non-simulated endpoint coverage in pre-production and production smoke tests.

## 3) Legacy Migration Ledger Drift Exposure
- Observation: Prisma migration ledger drift prevented expected migration application in at least one environment.
- Impact: Schema readiness can diverge from expected migration chain.
- Current mitigation: Direct SQL alignment documented and verified.
- Required action: Enforce migration drift checks and schema readiness gates in deploy pipeline.

## 4) Evidence Commit Hash in UAT Summary
- Observation: `uat-results/summary.json` records `commitHash` as `UNKNOWN`.
- Impact: Reduces traceability for compliance evidence packages.
- Required action: Inject git SHA during UAT run in CI pipeline.
