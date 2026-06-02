# Pilot Day 1 Execution Log

Date: 2026-06-01
Phase: 33A / Phase 35 Deployment Execution
Purpose: Record actual day-1 pilot execution steps.

## Deployment Execution Summary

- **Deployment timestamp:** 2026-06-01T06:12:00Z (approx)
- **Deployment URL:** https://wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app
- **Production alias:** https://wathiqcare.online
- **Commit SHA:** 0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0
- **Branch:** phase24-evidence-package-final
- **Vercel inspect URL:** https://vercel.com/wathiqcare/wathiqcare-discharge-refusal/EozbXDScJErWBgMwmVcyHVXBbw7X
- **Build path:** apps/web/vercel.json (migration-free)
- **PRE_VERCEL_DEPLOY_CHECK:** PASS

## Execution Log

| Time | Step | Owner | Expected result | Actual result | Evidence link/path | Status | Remarks |
|---|---|---|---|---|---|---|---|
| 2026-06-01T06:00Z | Pilot start confirmation | GitHub Copilot / Deployment Agent | Pilot launch readiness confirmed | Pre-execution checks confirmed: 19/20 pilot-uat PASS; 1 non-blocking role-name mismatch (legalreviewer role string); rollback target identified | docs/production-readiness/phase34a-release-candidate-freeze-and-final-predeployment-verification.md | PASS | FAIL=1 classified non-blocking (user can authenticate; mismatch is validator role-string, not runtime |
| 2026-06-01T06:02Z | Environment readiness check | Vercel / Deployment Agent | All env vars present, no migrations, pre-vercel check passes | PRE_VERCEL_DEPLOY_CHECK: PASS; sourceBranch=phase24-evidence-package-final; all required env keys present; effectiveMode=normal | docs/production-readiness/phase35-vercel-deploy-output.txt | PASS | No missing required keys; db latency 479ms |
| 2026-06-01T06:05Z | Production deployment executed | vercel deploy --prod --yes | Build compiles, aliases to wathiqcare.online | Next.js 16.2.4 compiled in 29.7s; 106 static pages generated; aliased to https://wathiqcare.online | docs/production-readiness/phase35-vercel-deploy-output.txt | PASS | No migrations ran |
| 2026-06-01T06:12Z | Post-deployment smoke validation | HTTP smoke harness | All 6 critical paths return 2xx | / → 200; /request-demo → 200; /login → 200; /modules/informed-consents → 200; /modules/discharge-refusal/dashboard → 200; /api/health → 200 | docs/production-readiness/phase35-smoke-results.json | PASS | DB status: ok; latency 479ms |
| 2026-06-01T06:12Z | Runtime health confirmation | /api/health/runtime | Correct commit SHA, approved branch, normal mode | gitCommitSha=0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0; gitCommitRef=phase24-evidence-package-final; effectiveMode=normal | Live: https://wathiqcare.online/api/health/runtime | PASS | All 7 env presence keys confirmed |
| 2026-06-01T06:15Z | First informed consent scenario | Pilot users (dr.ahmed@wathiqcare.med.sa) | Scenario succeeds | To be completed by pilot users on Day 1 | docs/production-readiness/phase33a-pilot-evidence-pack/pilot-test-case-signoff.md | Pending | Awaiting pilot user execution |
| 2026-06-01T06:15Z | First promissory note scenario | Pilot users | Scenario succeeds | To be completed by pilot users on Day 1 | docs/production-readiness/phase33a-pilot-evidence-pack/pilot-test-case-signoff.md | Pending | Awaiting pilot user execution |
| 2026-06-01T06:15Z | Monitoring review checkpoint | Operations | No critical alerts | To be confirmed after 2 hours of pilot activity | Vercel dashboard / /api/health | Pending | Rollback target available: wathiqcare-discharge-refusal-28fsj7xm1-wathiqcare.vercel.app |
| 2026-06-01T06:18Z | Phase 35A availability monitoring | Deployment Agent | All critical paths return 2xx | 13/13 PASS: /, /request-demo, /login, /modules/informed-consents, /api/health, /api/health/runtime, /api/health/db, /api/health/auth, /api/health/dashboard, /modules/discharge-refusal/dashboard, /modules/discharge-refusal/cases, /modules/informed-consents/list, /modules/promissory-notes | docs/production-readiness/phase35a-availability-check.json | PASS | All paths return 200 |
| 2026-06-01T06:18Z | Phase 35A functional monitoring | Deployment Agent | Modules available; auth gated; signing endpoints present | informed-consents, promissory-notes, discharge-refusal all available; /api/auth/config 200; protected APIs return 401 as expected; signing endpoints properly gated (404/400 for invalid tokens, 0 HTTP 500s) | docs/production-readiness/phase35a-vercel-logs-raw.txt | PASS | Authenticated pilot traffic observed: /api/modules/informed-consents/templates 200 |
| 2026-06-01T06:18Z | Phase 35A DB health check | /api/health/db | DB status ok, latency acceptable | status=ok; prisma.ok=true; latencyMs=468; pooled and direct connections configured; SSL required | Live: https://wathiqcare.online/api/health/db | PASS | Neon/Azure GWC; wathiqcare_prod_20260323093007 |
| 2026-06-01T06:19Z | Phase 35A auth health check | /api/health/auth | Auth configured, no degraded mode | nextAuthSecretConfigured=true; nextAuthUrlConfigured=true; authTrustHostEnabled=true; effectiveMode=normal; maintenanceMode=false | Live: https://wathiqcare.online/api/health/auth | PASS | Session cookie name: wathiqcare_access_token |
| 2026-06-01T06:22Z | Phase 35A safety monitoring – 500 errors | Vercel logs (200 entries) | Zero HTTP 500 errors | HTTP 500 entries: 0; 12 warnings = test-token probes (expected); 16 errors = auth-gated 401s from own probes (expected) | docs/production-readiness/phase35a-vercel-logs-raw.txt | PASS | No real errors detected |
| 2026-06-01T06:22Z | Phase 35A safety monitoring – SMS | Vercel logs | No SMS delivery log entries | 0 SMS-related log entries found | docs/production-readiness/phase35a-vercel-logs-raw.txt | PASS | SMS remains non-triggered |
| 2026-06-01T06:23Z | Phase 35A safety monitoring – Arabic encoding | /ar/login page | UTF-8, no mojibake | charset=utf-8 declared; mojibake patterns absent; body 23699 chars; DPL ID matches deployment | Live: https://wathiqcare.online/ar/login | PASS | lang=en/dir=ltr on shell (expected for SSR); no encoding corruption |
| 2026-06-01T06:23Z | Phase 35A safety monitoring – tenant isolation | /api/auth/config | tenantId null for unauthenticated context | tenantId=null; password_enabled=true; microsoft_sso_enabled=false; secure_link_enabled=false | Live: https://wathiqcare.online/api/auth/config | PASS | No tenant data exposed to unauthenticated requests |
