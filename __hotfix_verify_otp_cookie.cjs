// Hotfix validation: request OTP -> resolve from DB -> verify and capture Set-Cookie
const { execSync } = require('child_process');
const fs = require('fs');

const BASE = 'https://wathiqcare.online';
const TOKEN = process.argv[2];
if (!TOKEN) { console.error('TOKEN required'); process.exit(1); }

(async () => {
  const out = { base: BASE, token: TOKEN, ts: new Date().toISOString() };

  // 0) decision events: CONSENT_PRESENTED then CONSENT_ACCEPTED (no session required)
  for (const eventType of ['CONSENT_PRESENTED', 'CONSENT_ACCEPTED']) {
    const r = await fetch(`${BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventType }),
    });
    out[`preDecision_${eventType}`] = { status: r.status, body: safeJson(await r.text()) };
  }

  // 1) request-otp
  const reqOtp = await fetch(`${BASE}/api/sign/${encodeURIComponent(TOKEN)}/request-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'sms', mobileNumber: '966543587772' }),
  });
  const reqOtpBody = await reqOtp.text();
  out.requestOtp = { status: reqOtp.status, body: safeJson(reqOtpBody) };

  // 2) resolve OTP from prod DB
  let resolved;
  try {
    const resolvedRaw = execSync(`node __resolve_signing_otp.cjs ${TOKEN}`, { encoding: 'utf8' });
    resolved = JSON.parse(resolvedRaw);
  } catch (e) {
    out.resolveOtp = { error: String(e.message || e) };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  out.resolveOtp = { challengeId: resolved.challengeId, expiresAt: resolved.expiresAt, codeLength: resolved.code.length };

  // 3) verify-otp — capture full response headers
  const verifyRes = await fetch(`${BASE}/api/sign/${encodeURIComponent(TOKEN)}/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ otpCode: resolved.code }),
  });
  const setCookieRaw = verifyRes.headers.get('set-cookie');
  const verifyBody = await verifyRes.text();
  const verifyJson = safeJson(verifyBody);

  out.verifyOtp = {
    status: verifyRes.status,
    headers: {
      'set-cookie': setCookieRaw,
    },
    bodyVerified: verifyJson?.verified,
    bodyHasPublicSigningSession: Boolean(verifyJson?.publicSigningSession?.value),
  };

  // Parse Set-Cookie to confirm wathiqcare_public_signing_session present + flags
  if (setCookieRaw) {
    const parts = setCookieRaw.split(/,(?=\s*\w+=)/g);
    const sessionCookie = parts.find((p) => /wathiqcare_public_signing_session=/i.test(p));
    out.verifyOtp.sessionCookieLine = sessionCookie || null;
    if (sessionCookie) {
      out.verifyOtp.cookieFlags = {
        httpOnly: /HttpOnly/i.test(sessionCookie),
        secure: /Secure/i.test(sessionCookie),
        sameSite: (sessionCookie.match(/SameSite=([^;]+)/i) || [])[1] || null,
        path: (sessionCookie.match(/Path=([^;]+)/i) || [])[1] || null,
        domain: (sessionCookie.match(/Domain=([^;]+)/i) || [])[1] || null,
        maxAge: (sessionCookie.match(/Max-Age=([^;]+)/i) || [])[1] || null,
      };
    }
  }

  // 4) prove continuity: GET document with the cookie -> 200
  const cookieValueLine = setCookieRaw && setCookieRaw.split(/,(?=\s*\w+=)/g)
    .find((p) => /wathiqcare_public_signing_session=/i.test(p));
  const cookieKv = cookieValueLine ? cookieValueLine.split(';')[0].trim() : null;
  if (cookieKv) {
    const docRes = await fetch(`${BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}`, {
      method: 'GET',
      headers: { cookie: cookieKv },
    });
    const docBody = await docRes.text();
    out.continuityCheck = {
      endpoint: 'GET /api/public-signing/document/[token]',
      status: docRes.status,
      ok: docRes.ok,
      bodyPreview: docBody.slice(0, 300),
    };

    // 5) decision (CONSENT_ACCEPTED is harmless if already recorded; this just proves session reading)
    const decRes = await fetch(`${BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieKv },
      body: JSON.stringify({ eventType: 'CONSENT_ACCEPTED' }),
    });
    const decBody = await decRes.text();
    out.decisionCheck = { status: decRes.status, body: safeJson(decBody) };
  } else {
    out.continuityCheck = { skipped: true, reason: 'no session cookie returned by verify-otp' };
  }

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(99);
});

function safeJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 400) }; }
}
