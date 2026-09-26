# 07 — Operational Runbooks

## 1. Audience

Platform SRE, engineering on-call, pilot program operations, clinical support.

## 2. Severity Definitions

| Severity | Definition | Response |
|----------|------------|----------|
| P1 | Patient harm potential, data loss, cross-tenant leak, audit-chain corruption, identity-binding bypass | Page on-call; halt dispatches; consider rollback. |
| P2 | Material operational degradation, no immediate patient harm | Page on-call; mitigate; pause-and-review. |
| P3 | Minor degradation | Log and triage during business hours. |

## 3. Runbook — OTP Delivery Failure

### Symptoms
- Patient reports not receiving OTP.
- `deliveryStatus: "failed"` in `notificationDeliveryAttempt`.
- OTP delivery success rate < 98%.

### Steps
1. Check Taqnyat configuration: `TAQNYAT_API_KEY`, `TAQNYAT_SENDER`.
2. Check email provider: `SMTP_HOST`/`SMTP_PASS` or `RESEND_API_KEY`.
3. Inspect `logRuntimeIncident` entries with module `public_signing` and type
   `SMS_FAILURE` / `EMAIL_FAILURE`.
4. If SMS provider is down but email is configured, patient can use email OTP.
5. If both are down, use the pilot override email (`PILOT_EMAIL_OVERRIDE_RECIPIENT`)
   to retrieve the OTP and deliver it via a clinical, out-of-band channel per
   hospital policy.
6. Record the incident and notify Program Operations.

### Escalation
- P2 if isolated to one patient.
- P1 if OTP delivery success < 90% sustained for ≥ 2 hours.

## 4. Runbook — PDF Generation Failure

### Symptoms
- Patient sees error after signing.
- `PDF_RENDER_FAILED` in logs.
- `computeFinalConsentPdfByteHash` returns `internal-puppeteer` for all
  requests.

### Steps
1. Check `PDF_RENDERER_URL` and `PDF_RENDERER_SECRET`.
2. Verify renderer `/health` returns ok.
3. If renderer returns 401, the web service is not sending the internal secret
   header; use internal Puppeteer fallback or fix the header.
4. If renderer times out, restart the renderer container and check CPU/memory.
5. Verify Chromium can launch and Arabic fonts render.
6. Re-finalize the affected consent after the renderer recovers.

### Escalation
- P2 if intermittent.
- P1 if no PDFs can be finalized (audit-chain hard trigger).

## 5. Runbook — Database Unavailability

### Symptoms
- Users see 503 with "Authentication service temporarily unavailable" or
  "Database unavailable".
- `DatabaseUnavailableError` incidents in logs.

### Steps
1. Verify database connectivity from the app host.
2. Check `DB_QUERY_TIMEOUT_MS` and `DB_QUERY_MAX_RETRIES` values.
3. Restart app instances after DB recovers.
4. If the outage occurred during signature submission, verify the consent
  record state and manually append any missing audit-chain events if needed.

### Escalation
- P2 until recovery.
- P1 if data corruption or partial writes are suspected.

## 6. Runbook — Audit-Chain Break

### Symptoms
- Daily integrity sample shows `verified: false` with `brokenAtIndex`.
- Missing `AuditChainEvent` rows for a finalized consent.

### Steps
1. Halt new dispatches for the affected tenant.
2. Preserve the current `AuditChainEvent` rows and application logs.
3. Determine whether the break is due to a missing event or a hash mismatch.
4. Do **not** mutate existing audit rows. Document the gap and the root cause.
5. Coordinate with Legal and Compliance before resuming.

### Escalation
- P1 (hard rollback trigger).

## 7. Runbook — Expired Secure Link

### Symptoms
- Patient opens link and sees "expired" message.
- `EXPIRED` event in audit log.

### Steps
1. Confirm patient identity through normal clinical channels.
2. Have the physician dispatch a new link.
3. Verify the new link arrives.
4. Revoke the old link if still active.

### Escalation
- P3 (routine support).

## 8. Runbook — Rollback Execution

### Trigger
Any hard trigger from `PILOT_READINESS_MASTER.md` §5.1.

### Steps
1. Notify Program Operations + IMC governance lead + on-call engineer.
2. Disable new dispatches at tenant level.
3. Re-alias `wathiqcare.online` to the pinned rollback target.
4. Run `__smoke_stabilization.cjs` — expect 11/11 PASS.
5. Snapshot logs, audit tables, and open signing sessions.
6. Schedule root-cause review within 24h.

## 9. Escalation Paths

| Issue | First Responder | Escalation |
|-------|-----------------|------------|
| OTP/SMS/Email | Engineering On-Call | Program Operations → Communications Lead |
| PDF/Renderer | Engineering On-Call | Platform SRE |
| DB/Storage | Platform SRE | Engineering Lead |
| Audit-chain gap | Engineering On-Call | Legal Reviewer + Compliance Reviewer |
| Security/PII | Security Officer | Legal + Compliance |
| Clinical workflow | Pilot Clinical Lead | IMC Governance Lead |

## 10. Monitoring Requirements

| Metric | Alert Threshold | Owner |
|--------|-----------------|-------|
| `/api/health` and `/health` / `/ready` | Any non-200 for 2 minutes | Platform SRE |
| Smoke harness | Any check FAIL for ≥ 30 minutes | Engineering On-Call |
| OTP delivery success | < 98% over 1h; < 90% over 2h | Engineering On-Call |
| PDF finalization latency | p95 > 10s | Engineering On-Call |
| DB unavailable errors | > 5 in 5 minutes | Platform SRE |
| Audit-chain verification failures | Any | Engineering + Legal |
| 5xx rate | > 1% over 10 minutes | Platform SRE |
| Public signing 429/401 rate | Spike > 5x baseline | Security + Engineering |

## 11. Findings

### 11.1 Runbooks exist but are distributed

- **Description:** Procedures are split across `PILOT_READINESS_MASTER.md`,
  `SOP_SECURE_SIGNING.md`, and this gate's deliverable. There is no single
  on-call incident-response page.
- **Severity:** Low
- **Operational Impact:** On-call engineer must search multiple documents under
  pressure.
- **Clinical Impact:** Longer incident response time.
- **Recommendation:** Consolidate a one-page incident-response index and link
  to detailed runbooks.
- **Estimated Effort:** 4–8 hours.
- **Owner:** Program Operations.

### 11.2 No automated paging integration verified

- **Description:** Monitoring thresholds are documented but no PagerDuty/Opsgenie
  routing is visible in the repository.
- **Severity:** Low
- **Operational Impact:** Reliance on manual notification may delay response.
- **Clinical Impact:** Potential delay in halting a P1 incident.
- **Recommendation:** Confirm paging integration with the production log sink
  and document the rotation.
- **Estimated Effort:** 2–4 hours.
- **Owner:** Platform SRE.
