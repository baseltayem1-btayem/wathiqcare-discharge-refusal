# PRODUCTION CHANGE GUARDRAILS

**Scope:** WathiqCare Informed Consents v1.0 Pilot Ready (`wathiqcare-informed-consent-pilot-ready-v1.0`)
**Production URL:** https://wathiqcare.online
**Effective:** 2026-05-27

Every change to production MUST satisfy the relevant rule(s) below. If multiple rules apply, ALL must pass before merge / deploy. No rule may be skipped without sign-off recorded in the change description.

---

## Rule 1 — No direct production changes without a smoke test
- Run `node __smoke_stabilization.cjs` against production after every deploy.
- Block alias promotion (`vercel alias`) if any of the 11 checks fail.
- A passing smoke result must be attached to the change record.

## Rule 2 — No schema change without migration review
- Any modification to `apps/web/prisma/schema.prisma` MUST be accompanied by a numbered migration in `apps/web/prisma/migrations/`.
- Review checklist: idempotent, additive-preferred, includes rollback note, no destructive `DROP` against `consent_documents`, `audit_chain_events`, `notification_delivery_attempts`, `signatures`, `evidence_packages`, `education_packages`, or `consent_templates`.
- Run `npx prisma migrate diff` against production read-only before applying.

## Rule 3 — No notification routing change without patient-email test
- Any edit to `apps/web/src/lib/server/pilot-email-override.ts`, `module-secure-signing-service.ts`, or `public-signing-service.ts` notification paths requires:
  - Verifying `consent_documents.metadata.secureSigningWorkflow.recipientEmail` is still the authoritative source.
  - Asserting empty `recipientEmail` still produces 400 at the dispatch endpoint.
  - Confirming `secure_signing_link`, `secure_signing_otp`, and `patient_copy_notification` all route to that email in a fresh end-to-end run.

## Rule 4 — No workflow route change without checking `/sign/{token}/workflow`
- Any edit to `apps/web/app/sign/[token]/**` or `apps/web/src/lib/server/module-secure-signing-service.ts` must:
  - Keep `buildSigningUrlFromToken` appending `/workflow` in ALL env-precedence branches.
  - Keep `apps/web/app/sign/[token]/page.tsx` as a server-side redirect to `./workflow` (a 307 in production).
  - Verify GET `/sign/{token}/workflow` returns 200 with `InformedConsentsEnterpriseWorkflowScreens` in the HTML payload.
  - Verify GET `/sign/{token}` returns 307 → `/sign/{token}/workflow`.

## Rule 5 — No OTP change without verify-otp and cookie test
- Any edit to `apps/web/app/api/sign/[token]/request-otp/route.ts`, `verify-otp/route.ts`, or the OTP helpers in `public-signing-service.ts` requires:
  - Pre-decision OTP request returns 409 "Consent decision is required before OTP can be requested".
  - Post-decision OTP request returns 200 and emits `OTP_REQUESTED` to `audit_chain_events`.
  - `verify-otp` sets the public-signing session cookie and emits `OTP_VERIFIED` + `PUBLIC_SIGNING_OTP_VERIFIED`.
  - HMAC `otpHash` stays the only persisted form (never the cleartext OTP).

## Rule 6 — No evidence change without package/hash verification
- Any edit to `apps/web/src/lib/server/{public-signing-service,unified-legal-evidence-service,audit-chain-service}.ts` or to evidence endpoints requires:
  - Deterministic `documentHash` recomputable from `{documentId, consentReference, status, diagnosis, plannedProcedure, templateVersionId, updatedAt}` produces the same value as before the change.
  - Signature hash remains `sha256(signatureDataUrl)`.
  - Sidecar evidence package pattern preserved (see `/memories/repo/evidence-package-2-sidecar-pattern.md`); evidence packages MUST NOT be re-embedded inline.
  - Unified Evidence Certificate endpoint still returns the consolidated package.

---

## Standing Prohibitions

- DO NOT add OTP-first patient entrypoints. The legacy OTP-only page is archived and MUST stay archived.
- DO NOT bypass the workflow ordering (Education → Acknowledgement → Consent → Decision → OTP → Signature → Patient Copy).
- DO NOT introduce admin-email fallbacks in patient notifications.
- DO NOT set `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED=true` in production without an explicit, ticketed override request.
- DO NOT force-push to `main`, `phase24-evidence-package-final`, or any release-tag commit.
- DO NOT delete `audit_chain_events`, evidence package rows, or signature records.

## Change-Acceptance Checklist

Before merging any production-bound change, the author confirms in the PR description:

- [ ] Smoke test executed against production and attached (Rule 1).
- [ ] If schema touched: migration reviewed and rollback noted (Rule 2).
- [ ] If notifications touched: recipient-email contract verified (Rule 3).
- [ ] If `/sign/**` touched: workflow URL contract verified (Rule 4).
- [ ] If OTP touched: pre/post-decision gates verified, cookie behavior verified (Rule 5).
- [ ] If evidence touched: hash + sidecar contract verified (Rule 6).
- [ ] No prohibited behavior re-introduced.
