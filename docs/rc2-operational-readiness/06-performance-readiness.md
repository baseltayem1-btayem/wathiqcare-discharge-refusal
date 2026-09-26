# 06 — Performance Readiness

## 1. Current State

No dedicated load-test results or performance-test harness were found in the
repository. The following assessment is based on code review and architectural
inference.

## 2. Component Performance Characteristics

| Component | Bottleneck Risk | Notes |
|-----------|-----------------|-------|
| Consent content mapping | Low | Static library lookup + optional DB catalog query; DB errors swallowed to fallback. |
| Public signing API | Low-Medium | OTP verify and signature write are transactional; single-row updates. |
| PDF generation | High | Each request launches a full Chromium browser (external or Puppeteer). No render queue or browser pool. |
| Audit writes | Medium | Sequential Prisma inserts per event; no batching. |
| Notification delivery | Medium | Synchronous SMS/email calls block the OTP request response. |
| Database | Low-Medium | Prisma connection pool default; no observed query-level pagination for audit lists. |
| File storage | Low | Reads PDFs from local filesystem path; no CDN or object-store abstraction. |
| Background jobs | N/A | No active worker; cannot assess throughput. |

## 3. Known Limits

| Limit | Value | Source |
|-------|-------|--------|
| PDF renderer body size | 25 MB | `apps/pdf-renderer/src/server.ts:7` |
| Renderer viewport | A4 @ 794×1123 | `apps/pdf-renderer/src/server.ts:103-108` |
| Public signing session TTL | 30 minutes | `public-signing-service.ts:55` |
| OTP expiry | 10 minutes | `public-signing-service.ts:54` |
| OTP max attempts | 3 | `public-signing-service.ts:53` |
| DB query timeout | 5 seconds (default) | `db-resilience.ts:10` |
| DB retries | 2 (default) | `db-resilience.ts:11` |

## 4. Findings

### 4.1 PDF rendering is not optimized for concurrent load

- **Description:** Every PDF request launches a fresh Chromium instance. The
  external renderer does the same. There is no browser pool, render queue, or
  concurrency limit.
- **Severity:** High
- **Operational Impact:** Under concurrent signing load, CPU and memory usage
  spike; requests may time out or fail.
- **Clinical Impact:** Physicians may wait for PDF finalization; patients may
  see errors after signing.
- **Recommendation:** Implement a render queue or browser pool; add a circuit
  breaker around the renderer; load-test with expected pilot concurrency.
- **Estimated Effort:** 3–7 days.
- **Owner:** Engineering + Platform SRE.

### 4.2 Synchronous notification blocking

- **Description:** `requestSigningOtp` awaits both SMS and email delivery
  before returning the response. Provider latency directly affects API latency.
- **Severity:** Medium
- **Operational Impact:** Slow OTP responses; potential HTTP timeouts if the
  provider is slow.
- **Clinical Impact:** Patient sees spinner/delay; may retry and create extra
  OTP requests.
- **Recommendation:** Move notification delivery to an async queue (or fire-and-
  forget with immediate status) and return a 202 Accepted response.
- **Estimated Effort:** 2–4 days.
- **Owner:** Engineering.

### 4.3 Rate limiting (partially addressed)

- **Description:** No rate-limit middleware was found on public signing,
  dispatch, or auth endpoints. The only throttle was the OTP attempt count per
  challenge.
- **Severity:** Medium
- **Operational Impact:** Vulnerable to accidental or malicious load spikes.
- **Clinical Impact:** Service degradation could affect all users.
- **Remediation (2026-06-27):** Added an in-memory rate limiter
  (`apps/web/src/lib/server/rate-limiter.ts`) and applied it to the new
  public secure-link OTP routes (`/api/public/secure-links/{token}/otp` and
  `/api/public/secure-links/{token}/verify-otp`).  The login endpoint already
  had DB-backed rate limiting.
- **Recommendation:** Extend per-IP and per-token rate limits to all public
  and internal endpoints before pilot expansion; configure alerts on
  rate-limit hits.  Replace the in-memory store with Redis before general
  availability.
- **Estimated Effort:** 1–2 days remaining.
- **Owner:** Engineering + Security.

### 4.4 Audit list queries may be unbounded

- **Description:** Several dashboard and evidence-export queries use `findMany`
  without explicit limits or date filters (e.g., `getBackupDashboard` takes
  `take: 50`, but audit exports are not inspected).
- **Severity:** Low
- **Operational Impact:** Large tenants may experience slow page loads or OOM.
- **Clinical Impact:** Compliance officers cannot review evidence in a timely
  manner.
- **Recommendation:** Add mandatory pagination, default date windows, and
  server-side filtering to all audit/evidence list endpoints.
- **Estimated Effort:** 1–2 days.
- **Owner:** Engineering.

### 4.5 No load-test evidence

- **Description:** There are no load-test scripts or performance baselines for
  the pilot concurrency target.
- **Severity:** Medium
- **Operational Impact:** Unknown breaking point; pilot may hit unexpected
  latency.
- **Clinical Impact:** Disruption during peak clinical hours.
- **Recommendation:** Run a load test simulating the pilot cohort (e.g., 20
  concurrent signings, 100 dispatched links/hour) and capture p50/p95/p99
  latencies for OTP, signature, and PDF finalization.
- **Estimated Effort:** 2–3 days.
- **Owner:** Platform SRE + Engineering.
