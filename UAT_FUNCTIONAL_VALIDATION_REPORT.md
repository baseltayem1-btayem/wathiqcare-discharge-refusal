# UAT Functional Validation Report

- **Date:** 2026-05-22
- **Repository:** `baseltayem1-btayem/wathiqcare-discharge-refusal`
- **Requested user:** `dr.ahmed@wathiqcare.med.sa`
- **Validation target:** Informed Consent flow on the current deployment

## Summary

Live functional UAT could not be completed from this sandbox because the current deployment was not reachable over DNS. I therefore recorded the blocked live-validation result and verified the expected informed-consent landing route from the checked-in application code.

## Deployment Access Attempts

### Attempted URLs

1. `https://wathiqcare.online/login`
2. `https://web-kaizcjuea-wathiqcare.vercel.app/login`

### Result

Both URLs were unreachable from this environment:

- Playwright browser navigation returned `net::ERR_BLOCKED_BY_CLIENT`
- Direct HTTP requests from the sandbox failed DNS resolution (`Failed to resolve`)

Because of that, I could not:

- log in with `dr.ahmed@wathiqcare.med.sa`
- open the live Informed Consent module
- capture live screenshots for Consent Type, Patient Education, Understanding Check, Signature, OTP, or Evidence Package
- confirm the actual live post-login landing route from runtime behavior

## Route Verification From Source

The current checked-in application code routes the primary Informed Consents entrypoint to the **new** path:

- `/modules/informed-consents` redirects to `/modules/informed-consents/create`
  - Source: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/app/modules/informed-consents/page.tsx`
- The previous module dashboard is preserved at `/legacy/informed-consents`
  - Source: `/tmp/workspace/baseltayem1-btayem/wathiqcare-discharge-refusal/apps/web/app/legacy/informed-consents/page.tsx`

## Requested Validation Items

| Item | Status | Notes |
|---|---|---|
| Login with `dr.ahmed@wathiqcare.med.sa` | Blocked | Deployment unreachable from sandbox |
| Open Informed Consent | Blocked | Dependent on successful live login |
| Confirm current live route | Blocked live / inferred from source | Code indicates `/modules/informed-consents/create` |
| Screenshot: Consent Type | Not captured | Live app unreachable |
| Screenshot: Patient Education | Not captured | Live app unreachable |
| Screenshot: Understanding Check | Not captured | Live app unreachable |
| Screenshot: Signature | Not captured | Live app unreachable |
| Screenshot: OTP | Not captured | Live app unreachable |
| Screenshot: Evidence Package | Not captured | Live app unreachable |

## Conclusion

- **Live UAT status:** Blocked by deployment reachability from this environment
- **Source-verified expected landing route:** `/modules/informed-consents/create`
- **Legacy route:** `/modules/informed-consents` redirects; legacy experience now lives at `/legacy/informed-consents`

## Recommended Next Step

Re-run this validation from a network environment that can resolve and access the active deployment, then capture the six requested screenshots directly from the live session.
