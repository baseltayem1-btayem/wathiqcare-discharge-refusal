# SAFARI Public Signing Session — Root‑Cause Investigation

Date: 2026-05-27
Reporter: Production live‑validation (iPhone / Safari iOS)
Branch: `phase24-evidence-package-final`
Production deployment at time of report: `dpl_9VhEGcQfmqLKhRYmeKzRDe4zc87g` → build `wathiqcare-discharge-refusal-nts0jls4d-wathiqcare.vercel.app` (aliased to `wathiqcare.online`).
**Production promotion remains blocked pending the fix in this report.**

## 1. Symptom

On iPhone / Safari iOS, after the patient enters the OTP delivered by SMS, the next authenticated step of the public signing workflow fails with HTTP 401:

```
{ "error": "Missing public signing session" }
```

The workflow UI surfaces the message and the signature capture stage never renders.

## 2. Root cause

The OTP verify route returns the freshly minted `publicSigningSession` value **only inside the JSON body** and **does not write a `Set-Cookie` header** on the response.

File before fix: [apps/web/app/api/sign/[token]/verify-otp/route.ts](../../apps/web/app/api/sign/%5Btoken%5D/verify-otp/route.ts)

```ts
const payload = await verifySigningOtp({ token, otpCode: body?.otpCode ?? "", request });
return NextResponse.json(payload);   // <-- no response.cookies.set(...)
```

The cookie `wathiqcare_public_signing_session` is configured as `HttpOnly; Secure; SameSite=Lax` (see [apps/web/src/lib/server/sessionCookie.ts](../../apps/web/src/lib/server/sessionCookie.ts) and [apps/web/src/lib/server/public-signing-session.ts](../../apps/web/src/lib/server/public-signing-session.ts)). Because it is `HttpOnly`, client JavaScript **cannot** set it from the JSON body. With no `Set-Cookie` ever emitted, every subsequent authenticated POST (`/api/public-signing/document/[token]/sign`, `/decision`, `/education`, `/preview`) calls `readPublicSigningSession()` against an empty cookie jar and throws:

```ts
// apps/web/src/lib/server/public-signing-session.ts:101
export function readPublicSigningSession(request: NextRequest): PublicSigningSessionPayload {
  const value = request.cookies.get(getPublicSigningSessionCookieName())?.value;
  if (!value) {
    throw new ApiError(401, "Missing public signing session");  // <-- the observed error
  }
  return parsePublicSigningSessionCookieValue(value);
}
```

The helper that was supposed to be invoked, `buildPublicSigningSessionCookieOptions`, is defined and exported but currently has **zero call sites in `apps/web/app`** (confirmed via grep). The pre‑compiled artifact under `apps/web/.next/server/app/api/sign/[token]/verify-otp/route.js` does contain the correct `response.cookies.set(...)` invocation, which proves the route was complete at some earlier point and has since regressed in source. Only one commit touches the file (`c85ed36`), so the regression entered with that commit and was never noticed because the v1.0.1 11‑check API smoke runs server‑to‑server and reads `publicSigningSession.value` from the JSON body, manually inlining it into a `Cookie:` header. That masks the bug from any API test.

## 3. Affected browsers

This is **not Safari‑specific**. The bug fires on every real browser (Chrome, Safari desktop, Safari iOS, Edge, Firefox, Android Chrome) because no browser allows client JS to set an `HttpOnly` cookie. Safari iOS was the first surface to expose it because:

1. The Playwright walkthrough committed earlier in this branch stops after rendering the OTP stage and capturing the v1.1 marker; it does not complete OTP submission.
2. The production v1.0.1 smoke uses raw HTTP and manually carries the value as a `Cookie:` header, so it gets `409` (DRAFT status) instead of the underlying `401`.
3. A human walking through the consent on iPhone Safari is the first request path that uses real cookie storage end‑to‑end.

There is **no Safari ITP, third‑party‑cookie, or SameSite issue** here. The verify‑otp call and the next authenticated call are same‑origin first‑party POSTs against `https://wathiqcare.online`. The cookie attributes (`HttpOnly; Secure; SameSite=Lax; Path=/; Domain=.wathiqcare.online`) are fully compatible with Safari iOS for first‑party flows.

## 4. Reproduction steps

Pre‑condition: a valid signing token whose document is in `APPROVED` (or `READY_FOR_SIGNATURE`) status.

### 4.1 Mobile reproduction (the observed failure)

1. Open `https://wathiqcare.online/sign/{token}/workflow` in iPhone Safari (or Chrome desktop — same result).
2. Step through Education → Consent Review → Decision (Accept).
3. Tap "Request OTP" → receive SMS → enter OTP → tap Verify.
4. `POST /api/sign/{token}/verify-otp` returns `200` and the JSON body contains `verified: true` plus `publicSigningSession.value`. **No `Set-Cookie` header is in the response.**
5. The workflow component advances to the Signature stage and tries any of:
   - `POST /api/public-signing/document/{token}/decision`
   - `POST /api/public-signing/document/{token}/sign`
6. The browser sends no `wathiqcare_public_signing_session` cookie. The server returns `401 Missing public signing session` and the UI renders the error.

### 4.2 API reproduction (synthetic, confirms server-side)

```
POST /api/sign/{token}/request-otp           -> 200
POST /api/sign/{token}/verify-otp            -> 200 (no Set-Cookie header)
POST /api/public-signing/document/{token}/decision -> 401 {"error":"Missing public signing session"}
```

## 5. Proposed fix (applied in this branch)

Re-add the cookie persistence on the verify‑otp response so the browser receives `Set-Cookie: wathiqcare_public_signing_session=...` with the existing security attributes already enforced by `buildPublicSigningSessionCookieOptions` (`HttpOnly`, `Secure` in production, `SameSite=Lax`, host‑scoped to `.wathiqcare.online`).

Patched file: [apps/web/app/api/sign/[token]/verify-otp/route.ts](../../apps/web/app/api/sign/%5Btoken%5D/verify-otp/route.ts)

```ts
const response = NextResponse.json(payload);

if (payload.verified && payload.publicSigningSession) {
  response.cookies.set(
    getPublicSigningSessionCookieName(),
    payload.publicSigningSession.value,
    buildPublicSigningSessionCookieOptions(
      payload.publicSigningSession.expiresAt,
      request,
    ),
  );
}

return response;
```

Properties of the fix:

- **No security control is weakened.** Cookie attributes are unchanged: `HttpOnly: true`, `Secure: true` (production), `SameSite: lax`, `Path: /`, `Domain: .wathiqcare.online` in prod, signed with the JWT secret via HMAC‑SHA256.
- **No bypass.** The signature submission still requires `readPublicSigningSession()` to validate signature, timing, and expiry. The fix only restores the legitimate way the cookie is supposed to be issued after a successful OTP.
- **No new endpoints, no new data, no schema change.** The JSON body still carries `publicSigningSession.value` for server‑to‑server callers (used by smoke scripts).
- **Diagnostics surface preserved.** Errors continue to flow through `handleApiError`. We are intentionally **not** adding extra logging in this hotfix because (a) the OTP and challenge IDs are already recorded via `insertOtpEvent` and `recordEvidenceEvent` inside `verifySigningOtp`, and (b) adding request‑level logging would risk leaking the signed cookie value into structured logs. Safe diagnostic addition is captured as a follow‑up below.

### 5.1 Follow‑up safe diagnostics (separate PR, not part of hotfix)

To make regressions of this class detectable without weakening security:

- Server‑side: emit a structured log event `public_signing.session_cookie_issued` carrying `{ tokenHashPrefix, challengeId, expiresAt }` — never the cookie value itself.
- Server‑side: emit `public_signing.session_cookie_missing` whenever `readPublicSigningSession` throws, carrying the request path and `tokenHashPrefix`.
- Client‑side: when `/api/sign/[token]/verify-otp` returns `verified: true`, inspect `document.cookie` for the session cookie **name only** (HttpOnly cookies are not visible, so the right check is to issue a follow‑up `GET /api/public-signing/document/[token]` and verify it returns 200 before transitioning to the Signature stage). If it returns 401, surface a deterministic "session cookie not persisted — please retry" message.
- E2E: extend `__preview_landing_walkthrough.cjs` to drive OTP entry through the Signature stage so the browser flow exercises the cookie boundary.

## 6. Rollback safety

The fix is a forward change adding a header on a single response. To roll back, revert the patch on [apps/web/app/api/sign/[token]/verify-otp/route.ts](../../apps/web/app/api/sign/%5Btoken%5D/verify-otp/route.ts) — no data migration, no env var, no client change. Behavior reverts to the broken baseline.

In production, alias‑level rollback is also available per [docs/production/PRODUCTION_PROMOTION_REPORT.md](PRODUCTION_PROMOTION_REPORT.md) §5 (repoint aliases to `dpl_DVEGHkneXYppASBVSuLVXpj7Y2Rr`). That older deployment predates `c85ed36` and therefore also lacks the cookie line; rolling back to it does **not** fix the bug. The forward fix must ship.

## 7. Production impact assessment

| Dimension | Assessment |
|---|---|
| Severity | High. Every browser‑based signing attempt fails at the Signature stage after OTP. |
| Scope | All tenants, all consent module types, all browsers, both EN and AR. Not v1.1‑specific. |
| Data integrity | None. No partial or invalid signatures could be persisted because the 401 fires before `submitPublicSigningSignature` writes evidence. |
| OTP/SMS cost | Each affected patient consumes one SMS; the failure occurs after delivery. The patient can re‑request a fresh OTP once the fix ships. |
| Pilot exposure | Pilot operators have been able to approve and dispatch consents, but no live patient could complete signature on a real device. No false‑positive PDFs were generated. |
| Audit trail | OTP‑verified evidence is still recorded by `verifySigningOtp` via `insertOtpEvent` and `recordEvidenceEvent`. The missing artifact is the post‑OTP signature row. |

## 8. Promotion gate

Production promotion of v1.1 remains **blocked** until:

1. This patch is merged into `phase24-evidence-package-final`.
2. A new production deployment is built from the patched source (Vercel rebuild; `vercel redeploy` of the current prod deployment is not sufficient since the source itself changed).
3. The reproduction in §4.2 is re‑run against the new production alias and returns `200` with a `Set-Cookie: wathiqcare_public_signing_session=...` header.
4. A live iPhone Safari walkthrough completes the Signature stage and the Confirmation banner renders.

When all four conditions are green, attach the verified curl/Playwright transcripts to [docs/production/PRODUCTION_PROMOTION_REPORT.md](PRODUCTION_PROMOTION_REPORT.md) and lift the gate.
