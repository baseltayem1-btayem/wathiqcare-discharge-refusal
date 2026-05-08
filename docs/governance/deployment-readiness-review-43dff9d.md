# Deployment Readiness Review: 43dff9d

## 1) Staging Deployment Readiness
Status: Ready with controls
- Migration ordering:
  - [ ] Run schema migration before enabling module traffic.
  - [ ] Confirm promissory_notes table and PromissoryNoteStatus type exist.
- Environment dependencies:
  - [ ] DATABASE_URL valid for app and migration execution contexts.
  - [ ] Auth/session env values configured and consistent.
- Route readiness:
  - [ ] /modules and child routes resolve in staging.
  - [ ] Module APIs respond with authorized tenant-scoped data.
- Build reproducibility:
  - [ ] npm run build -w apps/web succeeds from clean workspace cache.

## 2) Controlled UAT Readiness
Status: Ready with supervised execution
- RBAC readiness:
  - [ ] Role matrix validated against module visibility expectations.
  - [ ] Unauthorized module direct navigation is blocked or redirected.
- Module visibility:
  - [ ] Role-specific cards/links in module portal are correct.
- Compatibility routing:
  - [ ] Discharge-refusal compatibility paths route correctly.
- Evidence capture:
  - [ ] Capture screenshots/logs for allowed and blocked-route outcomes.

## 3) Limited Production Rollout Readiness
Status: Conditionally ready
- Rollout controls:
  - [ ] Enable staged rollout gate and observation window.
  - [ ] Keep rollback criteria active and visible to on-call.
- Runtime verification:
  - [ ] Build/version fingerprint matches reviewed artifact.
  - [ ] Health checks and key route checks pass post-deploy.
- Monitoring readiness:
  - [ ] Alerting on auth failures, RBAC denies, API 5xx, and migration anomalies enabled.

## Decision
- Staging: GO
- Controlled UAT: GO
- Limited production rollout: GO with rollback gate enforced
