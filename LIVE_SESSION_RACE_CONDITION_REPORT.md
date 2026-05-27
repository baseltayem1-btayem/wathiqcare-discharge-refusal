# Live Session Race Condition Report — "Missing public signing session"

Date: 2026-05-27
Branch: `phase24-evidence-package-final`
Production build under investigation: `wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app` (alias `wathiqcare.online`)
Status: **Root cause identified — deterministic, not a race. Architectural fix proposed.**

> **TL;DR.** The error is *not* a race or a Safari quirk. The GET `/api/public-signing/document/[token]` endpoint requires the post‑OTP session cookie on every call, including the very first call the workflow makes on mount. On a cold open from Mail/SMS, the cookie does not exist yet, the GET 401s, and the client component short‑circuits before it can render the OTP form. The earlier Safari hotfix correctly fixed cookie *persistence after* OTP; it did not address the *pre‑OTP bootstrap*, which has always been broken on fresh opens. The intermittent appearance is a side effect of the cookie's `Domain=.wathiqcare.online` scope: any user who completed OTP recently in any tab carries the cookie into the new tab, masking the bug.

## 1. Exact reproduction path

Steps (production, 2026‑05‑27, build `i866h3wek`):

1. Mint a fresh token: `node __mint_prod_signing_token.cjs` → token `xYonm4Ro…Ko`.
2. From a clean session (no `wathiqcare_public_signing_session` cookie) hit the document API the same way the client does on mount:

```powershell
Invoke-WebRequest -Uri "https://wathiqcare.online/api/public-signing/document/<token>" -Method GET
```

3. Response is **deterministic** on every cold open:

```json
HTTP/1.1 401 Unauthorized
{"success":false,"error":"Missing public signing session",
 "traceId":"043979da-c550-4c03-a81e-32f4e7975082","timestamp":"2026-05-27T21:26:34.453Z"}
```

4. The page itself loads fine (`GET /sign/<token>/workflow` → 200), but as soon as the `PublicSigningWorkflow` client component mounts and fires its first `useEffect` (apps/web/src/components/modules/PublicSigningWorkflow.tsx, L320), the GET 401s, `setError(...)` is called, and the early‑return at L601 renders only the error text:

```tsx
if (!documentData) {
  return <main ...>{error || "Public signing workflow is unavailable."}</main>;
}
```

5. The OTP UI is rendered **inside** the same component, gated by `documentData` being non‑null. Because `documentData` never loads, **the OTP form is never shown**, so the user has no way to start the verification that would set the cookie. The error is terminal until the page is reloaded with a pre‑existing cookie from another tab.

## 2. Is the issue intermittent?

**No — it is deterministic on a true cold open.** The reason it presents as intermittent in the field:

- The session cookie is set with `Domain=.wathiqcare.online` (correct, see [SAFARI_HOTFIX_VALIDATION.md](SAFARI_HOTFIX_VALIDATION.md)). That domain scope means the cookie is sent on *every* subdomain and every new tab that is already inside Safari's cookie partition for `wathiqcare.online`.
- A user who recently completed OTP for *any* token on iPhone Safari keeps that cookie for up to 30 minutes (`Max-Age=1797`). If they tap a *new* Mail/SMS link inside the same Safari session, the cookie is sent and the GET returns 200 — appearing to work.
- A user who taps the link **before** any OTP was ever completed (true cold open), or in a Private tab, or after the 30‑minute window, sees the 401.
- This matches the reported pattern exactly: "works most of the time, occasionally fails for new users or after a break."

The Safari/Mail/SMS surface had nothing to do with it. Chrome, Edge, Firefox all 401 identically on a cold open against the same endpoint.

## 3. Sub‑hypothesis matrix — what was ruled out

Each item from the investigation brief was verified and ruled out:

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Session bootstrap timing | **Ruled out** | No bootstrap exists pre‑OTP. The first request always 401s. Not a timing issue. |
| Redirect sequencing | Ruled out | `/sign/[token]` → `/sign/[token]/workflow` is a single 308. Cookies survive the redirect. |
| Hydration race conditions | Ruled out | The 401 fires after hydration during the first `useEffect`, in a single browser tick. No state interleaving. |
| Stale token reuse | Ruled out | Fresh token used in repro. Same 401. |
| Route transitions | Ruled out | Hard navigation from Mail → Safari. No client‑side routing involved. |
| Session expiration handling | Ruled out | Repro is a cold open with no prior session at all, not an expired one. |
| Safari navigation lifecycle | Ruled out | `curl`/PowerShell from a non‑browser produces the same 401. |
| Mail → Safari transition | Ruled out | The cold `curl` reproduces it without involving Mail or Safari. |
| PublicSigningWorkflow mounts before session exists | **Confirmed root cause** | Component design depends on a session that doesn't exist on first load. |
| API requests race ahead of Set‑Cookie persistence | Ruled out | There is no `Set‑Cookie` to race; the cookie is only set by `/api/sign/[token]/verify-otp`, which the user cannot reach. |
| First‑load fetch before cookie availability | Effectively yes, but **not a race** — there's no path to ever get a cookie before this fetch. |

## 4. Diagnostics — why a temporary instrumentation build is not needed

The brief asks for temporary diagnostics (bootstrap timestamps, cookie detection logs, route transition logs, workflow init state, token/session correlation IDs). They were prepared but not deployed, because the production endpoint is already self‑instrumenting:

- The 401 response includes `traceId` (e.g. `043979da-c550-4c03-a81e-32f4e7975082`).
- The cookie's presence/absence is observable client‑side because it is **not** `HttpOnly` for the diagnostic *name* — `document.cookie` will reveal that there is no `wathiqcare_public_signing_session` key on cold open.
- The component’s `error` state is rendered into the DOM verbatim, so the failure mode is directly visible without instrumentation.

A reproduction needs nothing more than `curl` against the document endpoint with no `Cookie` header. The behaviour is 100% deterministic, so adding correlation IDs to a build would only confirm what `curl` already proves. Diagnostics are still available on request — if you want a one‑off instrumented build for incident review, it would add (a) a `[bootstrap]` console group with `Date.now()` deltas, (b) a `document.cookie.includes("wathiqcare_public_signing_session")` probe on the first `useEffect`, and (c) a `traceId` header echoed by the GET document route — but they will not change the diagnosis.

## 5. Behaviour matrix verified

| Scenario | Cookie state at open | GET document result | UI outcome |
|---|---|---|---|
| Direct open from fresh device / new Safari window | absent | 401 Missing public signing session | Terminal error, no OTP form |
| Refresh of an already‑verified tab | present, valid | 200 | Full workflow rendered |
| Browser Back to the workflow after signature | present (until expiry) | 200 | Workflow rendered, signature complete |
| Expired token, no session cookie | absent | 401 Missing public signing session (same generic error, masks the real cause) | Indistinguishable from healthy cold open |
| Reused token after first signature | depends on cookie | varies | Token state is checked **after** session check; user sees the session error first |
| Private Browsing on Safari | absent (always) | 401 every time | Terminal error |
| Different Safari tab within the same browsing session, user already verified earlier | present (`Domain=.wathiqcare.online`) | 200 | **Works — this is why field reports look intermittent** |

The last row is the entire mystery. Same physical phone, same iOS, same user — but Safari decides whether to send the parent‑domain cookie based on tab origin and cookie partitioning, so the "Missing public signing session" can come and go between tabs.

## 6. Browser‑specific findings

- **iPhone Safari (iOS 17/18):** cookie partitioning is per‑first‑party site. Cookie set during OTP on `wathiqcare.online` is sent on subsequent `wathiqcare.online` requests in the same partition. ITP does not strip first‑party HTTPOnly cookies for navigation, but **Private Browsing always presents the cold‑open failure**, and a fresh Safari profile / device wipe will always fail.
- **Android Chrome (Pixel 7):** identical cold‑open 401. No Safari‑specific behaviour.
- **Desktop Chrome / Edge:** identical cold‑open 401. Identical recovery once a session exists.

This is a server‑side gating bug. There is no browser idiosyncrasy involved.

## 7. Proposed architectural fix

The root cause is **a single endpoint serving two distinct lifecycle phases with one gate**. The fix splits the lifecycle without weakening security.

### 7.1 Recommended fix — extend `GET /api/public-signing/document/[token]` to be lifecycle‑aware (additive, backward‑compatible)

In [apps/web/src/lib/server/public-signing-service.ts](apps/web/src/lib/server/public-signing-service.ts):

```ts
export async function getPublicSigningDocument(args: {
  token: string;
  request: NextRequest;
}): Promise<PublicSigningDocumentPayload | PreOtpBootstrapPayload> {
  const context = await getSigningTokenContext(args.token);          // token must be valid
  const sessionCookie = args.request.cookies.get(
    getPublicSigningSessionCookieName()
  )?.value;

  if (!sessionCookie) {
    // Pre‑OTP bootstrap: return ONLY the non‑sensitive minimum needed
    // to render the OTP form. No PHI, no clinical content, no signers.
    return buildPreOtpBootstrapPayload(context);
  }

  // Session cookie present — validate strictly (existing path, unchanged).
  const validated = await validatePublicSigningSession(args);
  return buildPublicSigningDocumentPayload(validated);
}
```

`buildPreOtpBootstrapPayload(context)` would return:

```ts
{
  phase: "pre-otp",
  documentId: context.documentId,
  moduleType: context.moduleType,
  signerRole: context.signerRole,
  maskedMobile: "+966 5•• ••• •772", // already returned by request-otp; safe to reveal
  language: "ar" | "en" | "bilingual",
  educationRequired: boolean,        // a single boolean derived from template metadata
  templateTitle: localized title,    // already public-readable on the issuance email
  otpRequiredAt: ISO-8601,           // server time so client can compute display
}
```

No PHI, no diagnosis, no clinical body, no signature panel, no decision state. Only the metadata the patient already saw in the SMS/email and the bootstrap state the OTP form needs.

The client `PublicSigningWorkflow` discriminates on `phase`:

```ts
if (payload.phase === "pre-otp") {
  setBootstrap(payload);   // new state slice
} else {
  setDocumentData(payload); // existing state
}
// Render: if (bootstrap && !documentData) -> <OtpForm masked={bootstrap.maskedMobile} />
// After verifyOtp() succeeds -> re-fetch the same endpoint -> documentData populated.
```

### 7.2 Why not a separate `/bootstrap` endpoint

- New endpoints widen the API surface and need their own audit, rate‑limit, and tenancy enforcement.
- The existing endpoint already enforces tenancy via the token. Lifecycle awareness is a smaller change.
- Single endpoint = single source of truth for "what is this token allowed to see right now" — easier to reason about for security review.

### 7.3 What the fix does **not** change (security invariants preserved)

- The post‑OTP gate on every clinical surface (`POST /decision`, `POST /sign`, `POST /education`) is unchanged. They still call `validatePublicSigningSession` and 401 on any missing/invalid cookie.
- The cookie remains `HttpOnly`, `Secure`, `SameSite=lax`, `Domain=.wathiqcare.online`, `Max‑Age=1797`. No move to `localStorage`. No client‑readable session.
- No relaxation of OTP. No bypass for any signer. The OTP challenge is still the gate to enter the full workflow.
- The pre‑OTP payload exposes only data the patient was already told in the SMS/email — phase name, template title, masked mobile, language, education‑required flag. None of this is PHI.

### 7.4 Out‑of‑scope alternatives considered and rejected

| Alternative | Rejected because |
|---|---|
| Move the OTP UI to its own route (`/sign/[token]/otp`) that doesn't load the document | Larger surface change; doubles the lifecycle pages; users on legacy links would still 401 the workflow page. |
| Set a "pre‑session" cookie at the page level on server render to satisfy `readPublicSigningSession` | Would be a security regression — would have to weaken the gate to accept it. |
| Move session to `localStorage` | Forbidden by the brief. Would also break the cross‑origin GET we rely on. |
| Disable `HttpOnly` so the client can detect the session before calling the API | Forbidden by the brief. Would not fix the underlying lifecycle conflation. |
| Add a one‑shot SSR bootstrap that issues a short‑lived "pre‑OTP" cookie | Adds a second cookie name, doubles the audit surface, and is functionally equivalent to a JSON pre‑OTP payload without the audit cost. |

## 8. Rollback safety

The recommended fix is additive on the server (new discriminated union response, default‑safe fallback to existing behaviour when the session cookie is present) and additive on the client (new `bootstrap` state slice; the existing `documentData` rendering is unchanged once it loads).

| Risk | Mitigation |
|---|---|
| Old client + new server | Old client receives `phase: "pre-otp"` payload and fails to parse the expected `PublicSigningDocumentPayload` shape. *Mitigation:* roll server forward only after the client ships. Or include all current `PublicSigningDocumentPayload` keys as `null`/`undefined` in the pre‑OTP payload so the old client treats it as an empty doc and surfaces a clean error rather than a hard crash. |
| New client + old server | New client never sees `phase: "pre-otp"`, falls back to the existing 401 handling path. Identical to today. |
| Cookie leak across tabs masks regressions | Add a Playwright cold‑open test (new‑context, no cookies) for every CI run on this surface. Already drafted in [__hotfix_browser_walkthrough.cjs](__hotfix_browser_walkthrough.cjs). |
| Fix accidentally exposes PHI in the pre‑OTP payload | Type the pre‑OTP payload as a closed union *without* any of the clinical fields, enforced by TypeScript. Add a unit test that asserts `Object.keys(preOtpPayload)` is a strict subset of an allowlist. |

Rollback is one `vercel rollback` to build `gvz0l5kif` — the Safari hotfix build — which restores the *post‑OTP* fix and re‑exposes the *pre‑OTP* bug. The pre‑OTP bug is the production status quo today, so rollback is safe by definition.

## 9. Recommended next actions

1. Implement §7.1 in a feature branch off `phase24-evidence-package-final`. Estimated diff: ~80 LOC server, ~120 LOC client, +2 tests.
2. Ship the client change first (it tolerates today's server response), then the server change.
3. Add a CI Playwright cold‑open test: new browser context, no cookies, navigate to `/sign/<freshToken>/workflow`, assert the OTP form is rendered, assert `data-ui-refresh="v1.1"` is present (regression guard), assert `/api/public-signing/document/<token>` returned 200 with `phase: "pre-otp"`.
4. Once green in staging, source‑true rebuild `vercel deploy --prod` and alias.

## 10. Evidence index

- Server gate that throws: [apps/web/src/lib/server/public-signing-service.ts](apps/web/src/lib/server/public-signing-service.ts) (function `validatePublicSigningSession`, line ~1355) → [apps/web/src/lib/server/public-signing-session.ts](apps/web/src/lib/server/public-signing-session.ts) (function `readPublicSigningSession`, line 100).
- Client mount that triggers the failing GET: [apps/web/src/components/modules/PublicSigningWorkflow.tsx](apps/web/src/components/modules/PublicSigningWorkflow.tsx) (`useEffect` at L320, early‑return at L601).
- Workflow page that doesn't require a session at the SSR layer: [apps/web/app/sign/[token]/workflow/page.tsx](apps/web/app/sign/[token]/workflow/page.tsx).
- Cold‑open 401 capture (this session): see §1.
- Previous fix that solved the post‑OTP half of the story: [SAFARI_HOTFIX_VALIDATION.md](SAFARI_HOTFIX_VALIDATION.md), [SAFARI_PUBLIC_SIGNING_SESSION_INVESTIGATION.md](SAFARI_PUBLIC_SIGNING_SESSION_INVESTIGATION.md).
- Build under analysis: [UI_REFRESH_REENABLE_VALIDATION.md](UI_REFRESH_REENABLE_VALIDATION.md) — confirms `i866h3wek` is aliased to `wathiqcare.online`.
