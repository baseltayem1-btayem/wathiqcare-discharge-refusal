# Pilot Rollout & Rollback — Dynamic Consent

> **Status:** Preview-only. NOT a production activation document.
>
> Phase 8 establishes the **architecture** for a controlled internal
> pilot rollout. It does **not** activate production, does **not**
> replace the production informed-consent workflow, does **not**
> change the production renderer, does **not** modify auth/RBAC,
> Prisma schema, TrakCare, patient search, or generate-draft, and
> does **not** expose any preview surface publicly.

## Preview-only guarantee

The dynamic consent pilot is and remains preview-only until **all**
production activation conditions below are satisfied and approved.

- `ENABLE_DYNAMIC_CONSENT_ENGINE` is `false` in production.
- The pilot module is **default-deny**:
  - Requires `?engine=dynamic-preview` or `?pilot=dynamic-consent`.
  - Requires the authenticated user to be on the static
    `PILOT_ALLOWED_USERS` allow-list.
  - Requires the specialty to be on the static allow-list.
- The pilot audit event is built **in memory only**. It is never
  written to the database, never sent to an external service, never
  written to console with PHI, and the email is masked
  (`dr.ahmed@…` → `dr***@…`).
- No production route currently consults the pilot module. The
  module is isolated and additive.

## Activation prerequisites

Production activation requires **all** of the following, signed off
in writing:

1. Phase 7 pilot readiness checklist signed off
   (see [internal-pilot-readiness-dynamic-consent.md](./internal-pilot-readiness-dynamic-consent.md)).
2. Phase 8 QA matrix fully green
   (see [internal-pilot-qa-matrix.md](./internal-pilot-qa-matrix.md)).
3. Persisted-evidence schema design reviewed and approved (no schema
   work performed in Phases 1–8).
4. Real QR encoding wired and reviewed.
5. Real signer-chain validation implemented and reviewed.
6. Penetration test sign-off on the public verification route.
7. Backout / kill-switch documented for the operations team.
8. Staged production rollout plan (single tenant → multi-tenant)
   approved by leadership.

## Feature-flag matrix

| Flag / Signal | Default | Purpose | Effect on production |
| --- | --- | --- | --- |
| `ENABLE_DYNAMIC_CONSENT_ENGINE` | `false` | Global runtime gate | None until set `true` in a production environment AND all activation prerequisites pass. |
| `?engine=dynamic-preview` | absent | Per-request preview opt-in | Activates preview-only routes; ignored by production routes. |
| `?pilot=dynamic-consent` | absent | Pilot-status alias | Activates the pilot-status endpoint. |
| `DYNAMIC_CONSENT_PILOT_USERS` (env) | unset | **Additive** local-only allow-list extension | Adds users to the static allow-list. Malformed values are ignored silently. Never logged in full. |

## Pilot enablement checklist (internal-only)

- [ ] Pilot module imported only by internal preview surfaces.
- [ ] No production route imports `@/modules/consent-engine/pilot`.
- [ ] `getPilotAllowList()` does not include real production users
      outside the named pilot cohort.
- [ ] Specialty allow-list matches the legal-approved specialty list.
- [ ] Pilot-status route returns 403 without `?engine` /
      `?pilot` parameter.
- [ ] Pilot-status route returns 401 without authentication.
- [ ] Internal preview page banner displays the four warnings.
- [ ] `productionActive` is always `false` in the rollout status.

## Physician onboarding checklist

- [ ] Pilot physician identified and contacted.
- [ ] Pilot physician account email added to `PILOT_ALLOWED_USERS`
      (static) or `DYNAMIC_CONSENT_PILOT_USERS` (local env).
- [ ] Pilot physician briefed on
      [internal-pilot-test-script-dynamic-consent.md](./internal-pilot-test-script-dynamic-consent.md).
- [ ] Pilot physician given preview deployment URL.
- [ ] Pilot physician confirms the "INTERNAL PILOT PREVIEW ONLY"
      banner is visible on every preview session.
- [ ] Feedback returned and recorded.

## Legal approval checklist

- [ ] Bilingual legal statements approved per specialty.
- [ ] Declaration block approved per specialty.
- [ ] Warning block approved per specialty.
- [ ] DAMA refusal language approved by counsel.
- [ ] Anesthesia separate-consent language approved.
- [ ] Audit footer language approved.
- [ ] Pilot module + audit-masking strategy reviewed for legal-hold
      compatibility.
- [ ] Production activation explicitly **not** approved by this
      phase.

## Compliance sign-off checklist

- [ ] No PHI persisted from the preview surface.
- [ ] No PHI transmitted to external services.
- [ ] No PHI logged in plain form.
- [ ] Pilot audit event masking verified
      (`previewUserMasked` shows masked email only).
- [ ] Determinism validator reports zero drifts.
- [ ] `productionActive: false` confirmed in pilot-status API
      response for every test run.
- [ ] All audit hashes match between preview, evidence panel, PDF,
      verification preview, and pilot-status response.

## Production activation conditions

Production activation is **out of scope for Phase 8**. Activation
requires a separate phase covering:

1. Production-grade persisted evidence (DB schema + migrations).
2. Real signer-chain verification.
3. Real QR encoding.
4. Public `/verify/<evidenceId>` route + penetration test.
5. Aliasing `wathiqcare.online` to the activated deployment.
6. Flipping `ENABLE_DYNAMIC_CONSENT_ENGINE=true` in production.
7. Operations runbook + on-call training.

**None of these are performed by Phase 8.**

## Kill-switch strategy

- **Primary kill switch:** set
  `ENABLE_DYNAMIC_CONSENT_ENGINE=false` in the affected environment.
  Preview routes still require `?engine=dynamic-preview` /
  `?pilot=dynamic-consent`, so the global flag being false is
  sufficient to disable any future production activation instantly.
- **Allow-list kill switch:** clear
  `DYNAMIC_CONSENT_PILOT_USERS` (env) and revert the static
  `PILOT_ALLOWED_USERS` array to an empty list. All pilot eligibility
  checks return `user-not-allow-listed`.
- **Route kill switch:** delete or 404 the internal preview routes
  (`/internal/dynamic-consent-preview`, `/internal/verify/*`,
  `/api/internal/dynamic-consent/*`). No production data is affected.

## Rollback steps

```powershell
cd C:\work\wathiqcare-discharge-refusal-main

# Soft rollback: revert Phase 8 only.
git revert <phase8-sha>

# Full rollback to before the dynamic engine work:
git reset --hard 7bb804c   # Phase 6 head
# or further back to before Phase 4/5/6/7/8 as required.
```

No data migration is required for any rollback path because no
schema or production data is touched by Phases 1–8.

## Explicit warning

**Production activation is not part of Phase 8.** Anyone proposing
to flip `ENABLE_DYNAMIC_CONSENT_ENGINE=true` in production must
first complete the [Production activation conditions](#production-activation-conditions)
above and obtain written sign-off from Legal, Compliance, and
Engineering leadership.
