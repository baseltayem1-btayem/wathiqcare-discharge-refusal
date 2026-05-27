# PILOT TEST SCENARIOS

**Audience:** QA, Program Operations, on-call engineering.
**Release:** v1.0.1
**Use:** Manual + scripted validation during the pilot window. Each scenario is reproducible.

---

## Conventions

- **Production base URL:** `https://wathiqcare.online`.
- **Pilot test physician:** `dr.ahmed@wathiqcare.med.sa` (production credentials held by Program Operations).
- **Pilot test patient:** designated by IMC governance (do not use real patient PII for non-production test runs).
- **Evidence:** every executed scenario must save its evidence (smoke JSON, screenshots, audit-chain export) under `/pilot-evidence/<date>-<scenario-id>/`.

---

## S1 — Successful Signing (happy path)

**Goal:** End-to-end Accept flow generates a valid, defensible consent PDF.

**Preconditions:** Pilot test patient with valid mobile; latest approved template available.

**Steps:**
1. Physician dispatches consent for the test patient.
2. Patient opens the SMS link on mobile.
3. Patient reads education content; the **Step N of M** indicator is visible.
4. Patient taps **Accept and Continue**.
5. Patient enters mobile number, taps **Request OTP**.
6. Patient receives SMS code and enters it; taps **Verify OTP**.
7. Patient draws signature; submits.
8. Confirmation screen displayed.

**Expected:**
- Audit chain: `DISPATCHED → EDUCATION_VIEWED → DECISION_ACCEPTED → OTP_REQUESTED → OTP_VERIFIED → SIGNATURE_CAPTURED → PDF_FINALIZED`.
- Final PDF generated; hash present in audit row matches recomputed hash.
- Evidence package passes `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §4.

---

## S2 — Refusal Flow

**Goal:** A refusal is captured with full evidence equivalent to a positive consent.

**Steps:**
1. Steps 1–3 as in S1.
2. Patient taps **Refuse Treatment**.
3. Patient reads and confirms refusal acknowledgement.
4. Patient completes OTP (Request → Verify).
5. Patient signs the **Refusal Signature**.
6. Confirmation screen displayed.

**Expected:**
- Audit chain: `... → DECISION_REFUSED → REFUSAL_ACKNOWLEDGED → OTP_REQUESTED → OTP_VERIFIED → SIGNATURE_CAPTURED → PDF_FINALIZED`.
- Refusal PDF generated with refusal language; hash matches.
- Patient timeline does **not** show "incomplete" or "abandoned"; refusal is a terminal valid state.

---

## S3 — Expired Link

**Goal:** Expired tokens are rejected and produce a clear patient message and audit event.

**Preconditions:** A token that has crossed its TTL (use a test token whose TTL has been set short for QA, OR an actual expired token from the operations log).

**Steps:**
1. Open the expired link on mobile.

**Expected:**
- Patient sees an "expired" message with guidance to contact their physician.
- No partial state created or resumed.
- Audit event `EXPIRED` (or equivalent) recorded.
- Smoke check: `/sign/<expired-token>/workflow` responds with the expired view, NOT a 500.

---

## S4 — Invalid OTP

**Goal:** Wrong OTP codes are rejected without leaking signal.

**Steps:**
1. Reach OTP stage (after decision).
2. Enter a wrong 6-digit code; tap **Verify OTP**.

**Expected:**
- Inline error: invalid OTP.
- No information about how close the guess was, no enumeration signal.
- Audit event for failed verification recorded (counter only, not the code itself).
- After the configured number of attempts, lockout cool-down activates.
- Signature endpoint still returns 401/409 (verified by smoke `signatureProtectedBeforeOtp`).

---

## S5 — Repeated OTP Requests

**Goal:** Re-requesting OTP invalidates the previous code and is rate-limited.

**Steps:**
1. Reach OTP stage.
2. Tap **Request OTP**; receive code A.
3. Wait briefly; tap **Request OTP** again; receive code B.
4. Attempt to verify with code A.

**Expected:**
- Code A is invalid after code B issuance.
- Code B verifies normally.
- Excessive re-requests are throttled and surface a clear UI message.
- Audit chain records each `OTP_REQUESTED` event distinctly with timestamps.

---

## S6 — Mobile Interruption

**Goal:** Patient progress is preserved across short interruptions within the session window.

**Variants:**
- S6a: Phone call interrupts the page after OTP verification, before signature submit. Patient returns within the session window.
- S6b: App switch to SMS app to retrieve code, then back to the signing page.

**Expected:**
- Session cookie / state persists; patient can complete signature.
- If the session expires during interruption, the patient sees a clear "session expired" screen; physician re-dispatches.
- No silent loss of OTP verification — if the session is still valid, OTP-verified state is honoured; if expired, the patient must restart the gated stages.

---

## S7 — Session Timeout

**Goal:** Sessions cannot be reused past their TTL; signing requires a fresh, gated session.

**Steps:**
1. Reach OTP-verified state.
2. Wait until past the configured session TTL.
3. Attempt to submit a signature.

**Expected:**
- Signature endpoint returns 401 (missing/expired public signing session).
- UI presents a "session expired" path; the patient is guided to restart from a freshly dispatched link.
- No automatic silent renewal of OTP verification past the TTL.

---

## S8 — Accessibility Checks

**Goal:** The mobile signing flow is usable across assistive-technology configurations commonly enabled by patients.

**Checklist (perform on at least one iOS and one Android device):**

- [ ] All interactive elements have visible focus indicators.
- [ ] Buttons and inputs have accessible names (screen reader reads meaningful labels).
- [ ] OTP input is recognized by autofill where supported (SMS code autofill).
- [ ] Contrast meets WCAG 2.1 AA for body text, buttons, and error messages.
- [ ] Text scaling at 200% does not break layout or hide controls.
- [ ] Arabic right-to-left layout is correct in all stages.
- [ ] Signature pad is operable with finger and stylus.
- [ ] Step indicator content is conveyed to assistive tech (e.g., aria-current or equivalent).
- [ ] Errors are announced (live region or focus management).
- [ ] No reliance on color alone to convey state (accept vs refuse, success vs error).

---

## S9 — Smoke Harness (continuous)

Run on each pilot operating day:

```powershell
node __smoke_stabilization.cjs
```

**Expected:** `overall: "PASS"`, 11/11. Archive output to `/pilot-evidence/<date>-smoke.json`.

---

## S10 — Cross-tenant Isolation (negative)

**Goal:** A token issued under one tenant cannot resolve a document from another tenant.

**Steps:** (engineering-led, dry-run)
1. Construct a request that pairs a real token from tenant A with a forged tenant-B context attempt.
2. Confirm server-side rejection (404/401) with no leakage of either tenant's data.

**Expected:** No data crosses tenants under any combination of headers, cookies, or query params.

---

## Reporting

For every scenario executed, capture:

- Scenario ID and variant.
- Operator.
- Timestamp.
- Result: PASS / FAIL / N/A.
- Evidence path under `/pilot-evidence/`.
- Defect ticket reference if FAIL.

Aggregate daily into `/pilot-evidence/<date>-scenarios-summary.md`.
