# Phase 35A – Day-1 Single-Tenant Pilot Monitoring Report

**Classification:** DAY-1 PILOT STABLE  
**Date:** 2026-06-01  
**Monitoring window:** 2026-06-01T06:12Z – 2026-06-01T06:24Z  
**Executed by:** GitHub Copilot Deployment Agent  
**Deployment reference:** Phase 35 — `wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app`  
**Production URL:** https://wathiqcare.online  
**Scope:** Single-tenant controlled pilot — `wathiqcare.med.sa` only

---

## 1. Deployment Identity Verification

| Field | Value | Status |
|---|---|---|
| Deployment URL | https://wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app | CONFIRMED |
| Production alias | https://wathiqcare.online | CONFIRMED |
| Git commit SHA | `0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0` | CONFIRMED (via /api/health/runtime) |
| Git branch | `phase24-evidence-package-final` | CONFIRMED (via /api/health/runtime) |
| Vercel env | production | CONFIRMED |
| DPL ID in HTML | `dpl_EozbXDScJErWBgMwmVcyHVXBbw7X` | CONFIRMED (matches inspect URL) |
| effectiveMode | normal | CONFIRMED |

---

## 2. Availability Monitoring

**Timestamp:** 2026-06-01T06:18Z  
**Check count:** 13/13  
**Evidence:** `docs/production-readiness/phase35a-availability-check.json`

| Path | HTTP Status | Result |
|---|---|---|
| `/` | 200 | PASS |
| `/request-demo` | 200 | PASS |
| `/login` | 200 | PASS |
| `/modules/informed-consents` | 200 | PASS |
| `/api/health` | 200 | PASS |
| `/api/health/runtime` | 200 | PASS |
| `/api/health/db` | 200 | PASS |
| `/api/health/auth` | 200 | PASS |
| `/api/health/dashboard` | 200 | PASS |
| `/modules/discharge-refusal/dashboard` | 200 | PASS |
| `/modules/discharge-refusal/cases` | 200 | PASS |
| `/modules/informed-consents/list` | 200 | PASS |
| `/modules/promissory-notes` | 200 | PASS |

**Result: 13/13 PASS**

---

## 3. Functional Pilot Monitoring

### 3.1 Module Availability

| Module | Status | Detail |
|---|---|---|
| informed-consents | available | `/api/health/dashboard` → `status: available` |
| promissory-notes | available | `/api/health/dashboard` → `status: available` |
| discharge-refusal | available | `/api/health/dashboard` → `status: available` |

### 3.2 Database Connectivity

```json
{
  "status": "ok",
  "prisma": { "ok": true, "latencyMs": 468 },
  "pooled": { "source": "DATABASE_URL", "configured": true, "sslMode": "require" },
  "direct": { "source": "DATABASE_URL_UNPOOLED", "configured": true, "sslMode": "require" }
}
```

DB status: **ok** | Latency: **468ms** | SSL: **required** | Connections: **pooled + direct both configured**

### 3.3 Authentication Health

```json
{
  "status": "ok",
  "auth": {
    "nextAuthSecretConfigured": true,
    "nextAuthUrlConfigured": true,
    "authTrustHostEnabled": true,
    "sessionCookie": { "name": "wathiqcare_access_token", "state": "missing" },
    "runtimeModes": { "effectiveMode": "normal", "maintenanceMode": false, "readonlyMode": false, "degradedMode": false }
  }
}
```

Auth status: **ok** | Session cookie correctly named | effectiveMode: **normal**

### 3.4 Auth Configuration (Public Endpoint)

```json
{
  "success": true,
  "data": {
    "tenantId": null,
    "auth_config": {
      "password_enabled": true,
      "microsoft_sso_enabled": false,
      "secure_link_enabled": false
    }
  }
}
```

Password authentication enabled. SSO disabled. Secure link disabled. `tenantId: null` for unauthenticated context — correct.

### 3.5 Protected API Gate Verification

| Endpoint | Expected behaviour | HTTP Status | Result |
|---|---|---|---|
| `/api/auth/config` | Public config endpoint | 200 | PASS |
| `/api/internal/dynamic-consent/pilot-status` | Auth-gated | 403 | PASS (expected) |
| `/api/modules/informed-consents/templates` | Auth-gated | 401 | PASS (expected) |
| `/api/modules/informed-consents/library` | Auth-gated | 401 | PASS (expected) |
| `/api/audit-log` | Auth-gated | 401 | PASS (expected) |
| `/api/auth/me` | Auth-gated | 401 | PASS (expected) |

### 3.6 Signing and OTP Endpoint Reachability

| Endpoint | Expected (invalid test token) | HTTP Status | Result |
|---|---|---|---|
| `/api/sign/test-token/context` | 404 (invalid token) | 404 | GATED-OK |
| `/api/public-signing/document/test-token/preview` | 404 (invalid token) | 404 | GATED-OK |
| `/api/discharge/secure/test-token` | 404 (invalid token) | 404 | GATED-OK |
| `/api/discharge/verify` | 400 (missing params) | 400 | GATED-OK |
| `/api/modules/informed-consents/evidence/verify/test-token` | Reachable | 200 | PASS |

No 500 errors on any signing or OTP endpoint. All gating correct.

### 3.7 Real Pilot Traffic Observed

The following authenticated traffic was observed in Vercel logs during the monitoring window, indicating pilot users are actively accessing the system:

| Timestamp | Route | Status | Significance |
|---|---|---|---|
| 09:18:17 | `GET /api/auth/me` | 200 | Authenticated session active |
| 09:18:14 | `GET /api/modules/informed-consents/templates` | 200 | Pilot user accessing consent templates |
| 09:17:42 | `GET /modules/informed-consents` | 200 | Pilot user in informed consent module |
| 09:17:41 | `GET /modules/discharge-refusal` | 200 | Pilot user in discharge-refusal module |

**Observation:** Authenticated pilot users are actively using the platform. Consent template access confirmed.

---

## 4. Safety Monitoring

**Log window:** Last 200 Vercel log entries from `wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app`  
**Evidence:** `docs/production-readiness/phase35a-vercel-logs-raw.txt`

### 4.1 HTTP 500 Error Check

| Metric | Count | Status |
|---|---|---|
| HTTP 500 entries in 200-entry log window | **0** | CLEAR |

### 4.2 Log-Level Summary

| Level | Count | Cause | Classification |
|---|---|---|---|
| info | ~172 | Normal request/response traffic | Expected |
| warning | 12 | Test-token signing probes → 404 responses (own monitoring probes) | Expected — not real errors |
| error | 16 | Unauthenticated API probes → 401 responses (own monitoring probes) | Expected — correct auth gating |

No real warnings or errors from production user traffic detected.

### 4.3 Safety Signal Summary

| Safety Check | Result | Evidence |
|---|---|---|
| HTTP 500 errors | **NONE** | 0 in 200-entry log window |
| OTP failures | **NONE** | No OTP API calls in monitoring window |
| Email delivery failures | **NONE** | No email delivery log entries detected |
| Signing failures | **NONE** | Signing endpoints return 404/400 for invalid tokens; 0 signing errors |
| Evidence/audit write failures | **NONE** | No audit write errors in log window |
| Arabic mojibake / encoding corruption | **NONE** | `/ar/login`: charset=utf-8; mojibake patterns absent; 23,699 char clean response |
| Tenant isolation warning | **NONE** | `tenantId: null` for unauthenticated context; no tenant data exposed |
| Unexpected public link exposure | **NONE** | Signing tokens return 404 for random/invalid tokens |
| Unauthorized data visibility | **NONE** | All protected APIs return 401 without leaking data |
| SMS unintended delivery | **NONE** | Zero SMS-related log entries in monitoring window |

### 4.4 Arabic Encoding Detail

- URL: `https://wathiqcare.online/ar/login`
- HTTP status: 200
- Content-Type: `text/html; charset=utf-8`
- UTF-8 declared: true
- Mojibake patterns (`Ø\S`, `Ù\S`) detected: **false**
- Body length: 23,699 characters
- DPL ID in HTML: `dpl_EozbXDScJErWBgMwmVcyHVXBbw7X` — matches deployment

Arabic content pipeline: **no encoding corruption detected**.

---

## 5. Runtime Metrics Snapshot

From `/api/health/dashboard` at 2026-06-01T06:19Z:

```json
{
  "metrics": {
    "counters": {
      "response_time_ms": 1,
      "db_latency_ms": 10,
      "pdf_generation_duration_ms": 0,
      "session_validation_duration_ms": 6
    },
    "latestMs": {
      "response_time_ms": 6880,
      "session_validation_duration_ms": 1399,
      "db_latency_ms": 468
    },
    "updatedAt": "2026-06-01T06:19:02.305Z"
  }
}
```

DB latency 468ms — within acceptable range. Session validation 1399ms — within expected SSR range. PDF generation: 0 (no PDF generation requests in monitoring window; expected for Day 1 early phase).

---

## 6. Incident Summary

**Critical incidents: 0**  
**Rollback triggers encountered: 0**

| Incident ID | Severity | Description | Rollback Required | Status |
|---|---|---|---|---|
| OBS-2026-0601-001 | Low (Observation) | `legalreviewer@wathiqcare.med.sa` roleMatch=false in pilot-uat validator. User authenticates successfully. Validator expected-role string mismatch only. | No | Open – validator fix queued post-pilot |

Full incident log: `docs/production-readiness/phase33a-pilot-evidence-pack/pilot-incident-log.md`

---

## 7. Mandatory Restrictions — Ongoing Compliance

| Restriction | Monitoring Status |
|---|---|
| Single-tenant pilot only — `wathiqcare.med.sa` | CONFIRMED — no multi-tenant events observed |
| No SMS delivery | CONFIRMED — zero SMS log entries |
| No broad patient delivery | CONFIRMED — no patient-facing OTP delivery observed |
| No runtime logic changes | CONFIRMED — no source changes since Phase 34A freeze |
| No migrations | CONFIRMED — deployment used migration-free build path |
| No Arabic guard bypass | CONFIRMED — Arabic encoding intact; no guard changes |
| No OTP/signing/token/session bypass | CONFIRMED — all endpoints correctly gated |

---

## 8. Rollback Readiness

| Field | Value |
|---|---|
| Rollback target | `wathiqcare-discharge-refusal-28fsj7xm1-wathiqcare.vercel.app` |
| Rollback command | `vercel alias set wathiqcare-discharge-refusal-28fsj7xm1-wathiqcare.vercel.app wathiqcare.online --scope wathiqcare` |
| Rollback authorization | `docs/production-readiness/phase33a-pilot-evidence-pack/pilot-rollback-authorization.md` |
| Rollback triggers remaining | None triggered. Monitoring continues. |

---

## 9. Evidence Artifacts

| Artifact | Path |
|---|---|
| Availability check results (JSON) | `docs/production-readiness/phase35a-availability-check.json` |
| Vercel logs (raw) | `docs/production-readiness/phase35a-vercel-logs-raw.txt` |
| Day-1 execution log (updated) | `docs/production-readiness/phase33a-pilot-evidence-pack/pilot-day-1-execution-log.md` |
| Incident log (updated) | `docs/production-readiness/phase33a-pilot-evidence-pack/pilot-incident-log.md` |
| Phase 35 deployment report | `docs/production-readiness/phase35-single-tenant-controlled-pilot-deployment-execution-report.md` |
| Pilot UAT validation report | `apps/web/artifacts/pilot-validation/pilot-validation-2026-06-01T06-00-47-238Z.json` |

---

## 10. Final Classification

```
╔══════════════════════════════════════════════════════════════════════════╗
║  DAY-1 PILOT STABLE                                                      ║
║                                                                          ║
║  Production URL:    https://wathiqcare.online                            ║
║  Monitoring:        2026-06-01T06:12Z – 06:24Z                          ║
║  Availability:      13/13 PASS                                           ║
║  HTTP 500 errors:   0                                                    ║
║  SMS delivery:      NOT TRIGGERED                                        ║
║  Arabic encoding:   CLEAN                                                ║
║  Tenant isolation:  OK                                                   ║
║  Pilot traffic:     OBSERVED (authenticated users active)                ║
║  Incidents:         0 critical / 1 observation (non-blocking)            ║
║                                                                          ║
║  Scope: wathiqcare.med.sa — SINGLE TENANT ONLY                          ║
║  Rollback target ready. Monitoring continues.                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 11. Next Steps

1. **Continue monitoring** — run availability and log checks at 2-hour intervals during pilot Day 1.
2. **Pilot user sign-off** — pilot users (`dr.ahmed@wathiqcare.med.sa`, `medicaldirector@wathiqcare.med.sa`, `nursingsupervisor@wathiqcare.med.sa`, `legalreviewer@wathiqcare.med.sa`, `compliance@wathiqcare.med.sa`) to execute informed consent and promissory note test cases and update `pilot-test-case-signoff.md`.
3. **Validator fix** — post-pilot: correct expected role string in `validate-pilot-uat-readiness.mjs` for `legalreviewer@wathiqcare.med.sa` (OBS-2026-0601-001).
4. **Day-1 close-out** — at end of Day 1, update `pilot-day-1-execution-log.md` with final pilot user scenario completion status.
5. **Phase 36 preparation** — pending Day-1 completion and go/no-go from pilot users before any Phase 36 scope expansion.

---

## 12. Related Documents

| Document | Path |
|---|---|
| Phase 33 Runbook | `docs/production-readiness/phase33-single-tenant-controlled-pilot-runbook.md` |
| Phase 33A Evidence Pack | `docs/production-readiness/phase33a-pilot-evidence-pack/` |
| Phase 34 Final Approval | `docs/production-readiness/phase34-final-single-tenant-controlled-pilot-deployment-approval.md` |
| Phase 34A RC Freeze | `docs/production-readiness/phase34a-release-candidate-freeze-and-final-predeployment-verification.md` |
| Phase 35 Deployment Report | `docs/production-readiness/phase35-single-tenant-controlled-pilot-deployment-execution-report.md` |
