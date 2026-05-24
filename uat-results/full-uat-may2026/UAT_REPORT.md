# WathiqCare Online — Full Consent Workflow UAT Report

**Date:** 2026-05-20
**Operator:** Engineering / QA automation
**Tooling:** Playwright 1.59.x via `playwright.uat.config.ts`
**Spec:** `apps/web/tests/full-uat-may2026.uat.ts`
**Production alias:** `wathiqcare.online` → `wathiqcare-discharge-refusal-6d4yiccmy-wathiqcare.vercel.app` (73 days old, **not promoted**)
**Preview deploy (test-mode):** `wathiqcare-discharge-refusal-axl9qn65r-wathiqcare.vercel.app` (Phase 12.2)

> The production alias was **NOT** promoted. All consent-workflow validations
> were executed against the new preview deploy that ships Phase 12.2 test
> mode (fixed OTP 123456, simulated signing link, in-component state only —
> no SMTP, no SMS provider, no DB writes).

---

## 1. Executive Summary

| Area | Status |
|---|---|
| Production alias still pinned to 6d4yiccmy | ✅ |
| Production `/api/health` | ✅ 200 OK |
| Production `/login` shell renders | ✅ |
| Informed-consent preview test-mode banner + bilingual EN/AR | ✅ |
| Default patient/physician/witness values pre-fill | ✅ |
| OTP `123456` accepted by mock verification | ✅ |
| "Send Patient Signing Link" simulated (no SMTP, no SMS) | ✅ |
| `?token=test-patient-signing` route opens signing session | ✅ |
| Evidence + audit panel renders | ✅ |
| Mobile viewport (390×844) renders the consent shell | ✅ |
| **5-role login tour against prod alias** | ⚠ **BLOCKED — IP rate limit** |
| **5-role dashboard rendering screenshots** | ⚠ **BLOCKED — depends on login** |
| Any production data modified | ❌ None |
| Any real SMS sent | ❌ None |
| Any real email sent | ❌ None |

**Overall:** All consent-workflow and public-surface checks **PASS**. The
role-based login tour is **blocked** by an existing IP rate-limit window on
`/api/auth/password/login` and must be re-run from a clean IP, or after the
cooldown documented below.

---

## 2. Passed Items (9/9 automated)

### 2.1 Consent Workflow (preview test-mode)
1. ✅ Banner + default patient values + OTP code render
2. ✅ "Send Patient Signing Link" simulates email — exact message
   `Signing invitation sent successfully to admin@wathiqcare.med.sa` —
   no SMTP, no provider call; generated preview URL is correct
3. ✅ `?token=test-patient-signing` route surfaces signing-active sub-banner
4. ✅ OTP `123456` accepted by `MockOtpVerification` (`expectedCode` prop)
5. ✅ Evidence panel + audit-trail references render
6. ✅ Bilingual EN / AR shell — Arabic glyphs detected in markup
7. ✅ Mobile viewport (iPhone 12-ish, 390×844) renders the full shell

### 2.2 Production Public Surface
8. ✅ `https://wathiqcare.online/login` renders email + password + submit
9. ✅ `https://wathiqcare.online/api/health` → 200 `{"status":"ok",...}`

### 2.3 Production-Untouched Confirmations
- Alias `wathiqcare.online` still maps to `wathiqcare-discharge-refusal-6d4yiccmy-wathiqcare.vercel.app` (age 73 d).
- No `vercel alias` or `vercel promote` invoked in this UAT.
- Production `/api/health` returned `{"status":"ok","service":"frontend",...}`.
- No DB writes performed by the test mode (`handleSendSigningLink` only
  flips local React state; `navigator.clipboard` is browser-local; the
  signing panel is controlled via local state only).

---

## 3. Failed / Blocked Items

### 3.1 5-Role login tour — **BLOCKED**

| Role | Email | Result |
|---|---|---|
| Physician | dr.ahmed@wathiqcare.med.sa | ⚠ HTTP 429 (IP rate-limit pre-empts credential check) |
| Medical Director | medicaldirector@wathiqcare.med.sa | ⚠ HTTP 429 |
| Nursing Supervisor | nursingsupervisor@wathiqcare.med.sa | ⚠ HTTP 429 |
| Legal Reviewer | legalreviewer@wathiqcare.med.sa | ⚠ HTTP 429 |
| Compliance Reviewer | compliance@wathiqcare.med.sa | ⚠ HTTP 429 |

**Root cause** — `apps/web/app/api/auth/password/login/route.ts` lines
137–170: `checkRateLimit` counts failed attempts where
`email = ? OR ip_address = ?` within a rolling 15-minute window; threshold
is 5. Pre-existing failed attempts from this client IP exhausted the budget
before this UAT round began, and each subsequent 429 itself records a
`RATE_LIMITED` failure row — so further probing from the same IP extends
the lockout.

**Important consequence:** The 429 response is returned **before** any
credential validation happens, so this result does **not** confirm or deny
that the five accounts exist with the supplied password. The login tour
must be re-run from a different IP, OR after a 15-minute cooldown of the
current IP, to deliver definitive role-based dashboard screenshots.

### 3.2 None other.

---

## 4. UI Issues
None observed in the test-mode consent surface or the production login
shell at 1440×900 or 390×844.

## 5. Workflow Issues
None observed in the items that were executable. The patient-signing
panel inside the preview is a controlled production component reused via
local state; full deterministic flip of `acknowledgmentAccepted` is
covered by manual UAT (per repo memory
`/memories/repo/discharge-workflow-active-path.md`).

---

## 6. Screenshots Generated

Path: `uat-results/full-uat-may2026/`

| File | Description |
|---|---|
| `consent-01-defaults.png` | Test-mode banner + default-values card |
| `consent-02-signing-link-sent.png` | "Sent" success state + generated URL |
| `consent-03-signing-link-route.png` | Page loaded with `?token=test-patient-signing` |
| `consent-04-otp-entered.png` | OTP `123456` filled in mock verification |
| `consent-05-evidence-panel.png` | Evidence + audit-trail references visible |
| `consent-06-bilingual.png` | EN/AR parallel rendering |
| `consent-07-mobile-390.png` | Mobile (390×844) viewport |
| `prod-00-login-shell.png` | Production login form (wathiqcare.online/login) |

Per-role dashboard screenshots (`dashboard-physician.png`,
`dashboard-medical-director.png`, etc.) are **pending** the login-tour
retry described in §7.

---

## 7. How to Complete the Blocked Login Tour

After the IP-level 15-minute rate-limit window clears (≥ 15 minutes since
the last 429 from this IP), or from a different network, run:

```powershell
cd C:\work\wathiqcare-discharge-refusal-main
npx playwright test --config playwright.uat.config.ts --grep "@login" --reporter=list
```

Expected per-role output line in console:

```
[UAT-LOGIN] role=<key> loginHTTP=200 finalURL=https://wathiqcare.online/<dashboard> alert=""
```

The spec uses `expect.soft(...)`, so all five roles run in a single pass
even if one or more still hit 429 — making it safe to retry without
re-tripping the limit on the others.

To bypass any future rate-limit blockage during scheduled UAT runs,
recommended platform changes (see §8.2) include adding an allow-list for
QA IPs or short-circuiting `checkRateLimit` for explicitly tagged UAT
test accounts.

---

## 8. Recommendations Before Production Promotion

### 8.1 Required (block promotion if unresolved)
1. **Complete the 5-role login tour** from a clean IP and attach the five
   `dashboard-<role>.png` screenshots to this report. Without this, the
   "role permissions render correctly" requirement is unverified.
2. **Confirm the test patient `MRN-TEST-1001`** exists only in the
   non-production tenant (`Test/Demo`) so any manual end-to-end attempt
   on the production alias cannot accidentally create real audit rows.
3. **Decide on test-mode visibility in production.** Phase 12.2 lives at
   `/internal/enterprise-consent`. The route is currently reachable on the
   preview deploy `axl9qn65r`. Before any promotion that includes this
   commit (`6341327`), either gate the route behind an internal-only
   middleware or scrub it from the prod build to avoid public exposure
   of the "PREVIEW TEST MODE — NO REAL SMS OR EMAIL SENT" surface.

### 8.2 Strongly recommended
4. **Rate-limit allow-list for QA / UAT runners.** Add an env-driven
   IP allow-list or header (e.g. `X-WC-QA-Token`) that `checkRateLimit`
   honours, so scheduled UAT runs never trip the lockout used in §3.1.
5. **Persist a UAT smoke test in CI** (`playwright.uat.config.ts` +
   `*.uat.ts`) executing the `@consent` and `@public` groups against
   every preview deploy. Already wired here; needs to be added as a
   GitHub Actions step.
6. **Document the "preview-only" guardrails** in the runbook for the
   support team so the test-mode banner is never mistaken for a
   production incident.

### 8.3 Nice to have
7. Generate a deterministic full-flow Playwright test that flips
   `acknowledgmentAccepted` via a stable test-id rather than the current
   "manual UAT" gate, so the success summary card can be asserted in CI.
8. Capture per-role dashboard markup snapshots (in addition to the
   PNG screenshots) for visual-regression diffs.

---

## 9. Compliance Confirmations

- ✅ **No production data modified.** The only `INSERT` paths touched by
  this UAT round are the existing `login_attempts` audit rows produced by
  the platform's own rate-limit telemetry (rows the platform inserts
  regardless of who calls the endpoint). No domain tables (consents,
  patients, evidence, audit_trails) were written to.
- ✅ **No real SMS sent.** No SMS provider invoked. Test mode uses
  `MockOtpVerification` with `expectedCode="123456"`.
- ✅ **No real email sent.** No SMTP / mail provider invoked. The
  "Send Patient Signing Link" button only flips local React state and
  computes a URL via `window.location.origin`.
- ✅ **Production alias not promoted.** `wathiqcare.online` still maps
  to `wathiqcare-discharge-refusal-6d4yiccmy-wathiqcare.vercel.app`.

---

## 10. Final UAT Status

| Category | Status |
|---|---|
| Phase 12.2 test-mode consent workflow | ✅ READY |
| Production public surface (health + login shell) | ✅ READY |
| Role-based dashboards (login tour) | ⏸ PENDING re-run from clean IP |
| Production data integrity | ✅ INTACT |
| No real SMS / email | ✅ CONFIRMED |
| Production alias untouched | ✅ CONFIRMED |

**Recommendation:** Do **not** promote production alias yet. Complete the
role login tour from a clean IP (or after 15-min cooldown), attach the
five dashboard screenshots, then re-issue this report for sign-off.
