// End-to-end probe for pre-OTP bootstrap fix.
// Cold open -> request OTP -> resolve OTP from DB -> verify OTP -> re-fetch with cookie.

const { spawnSync } = require('child_process');
const fs = require('fs');

const BASE = process.env.BASE || 'https://wathiqcare.online';
const token = process.argv[2];
if (!token) {
  console.error('USAGE: node __pre_otp_bootstrap_e2e.cjs <token>');
  process.exit(1);
}

const MOBILE = '966543587772';

function setCookieToHeader(setCookie) {
  if (!setCookie) return null;
  const first = setCookie.split(/, (?=[A-Za-z0-9_-]+=)/)[0];
  return first.split(';')[0];
}

(async () => {
  const out = { base: BASE, token, steps: [] };

  // 1. Cold GET (no cookie)
  const r1 = await fetch(`${BASE}/api/public-signing/document/${token}`);
  const j1 = await r1.json();
  out.steps.push({
    name: 'cold_get_no_cookie',
    status: r1.status,
    phase: j1.phase,
    hasBootstrap: !!j1.bootstrap,
    facilityName: j1.bootstrap?.facilityName ?? null,
    templateTitleAr: j1.bootstrap?.templateTitleAr ?? null,
    templateTitleEn: j1.bootstrap?.templateTitleEn ?? null,
    moduleType: j1.bootstrap?.moduleType ?? null,
    signerRole: j1.bootstrap?.signerRole ?? null,
    educationRequired: j1.bootstrap?.educationRequired ?? null,
    leaksPhi: Boolean(
      j1.bootstrap && (j1.bootstrap.patientName || j1.bootstrap.mrn || j1.bootstrap.diagnosis || j1.bootstrap.sections),
    ),
  });

  // 2a. Record CONSENT_PRESENTED (required by lifecycle before decision)
  const r2a = await fetch(`${BASE}/api/public-signing/document/${token}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventType: 'CONSENT_PRESENTED' }),
  });
  out.steps.push({ name: 'decision_presented', status: r2a.status, ok: r2a.ok });

  // 2b. Record CONSENT_ACCEPTED (required before OTP)
  const r2b = await fetch(`${BASE}/api/public-signing/document/${token}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventType: 'CONSENT_ACCEPTED' }),
  });
  out.steps.push({ name: 'decision_accepted', status: r2b.status, ok: r2b.ok });

  // 2. Request OTP
  const r2 = await fetch(`${BASE}/api/sign/${token}/request-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'sms', mobileNumber: MOBILE, locale: 'ar' }),
  });
  const j2 = await r2.json().catch(() => ({}));
  out.steps.push({ name: 'request_otp', status: r2.status, ok: r2.ok, challengeId: j2.data?.challengeId ?? j2.challengeId ?? null });

  // 3. Resolve OTP from DB
  const res = spawnSync(process.execPath, ['__resolve_signing_otp.cjs', token], { encoding: 'utf8' });
  let otpCode = null;
  try {
    const parsed = JSON.parse((res.stdout || '').trim());
    otpCode = parsed.code;
  } catch (_e) {
    otpCode = null;
  }
  out.steps.push({ name: 'resolve_otp_from_db', code: otpCode, stderr: (res.stderr || '').slice(-200), exit: res.status });
  if (!otpCode || !/^\d{4,8}$/.test(otpCode)) {
    fs.writeFileSync('docs/production/pre-otp-bootstrap/e2e-probe.json', JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  // 4. Verify OTP
  const r4 = await fetch(`${BASE}/api/sign/${token}/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ otpCode }),
  });
  const j4 = await r4.json().catch(() => ({}));
  const setCookie = r4.headers.get('set-cookie');
  const cookieHeader = setCookieToHeader(setCookie);
  out.steps.push({
    name: 'verify_otp',
    status: r4.status,
    ok: r4.ok,
    setCookieRaw: setCookie ? setCookie.slice(0, 200) + '…' : null,
    sessionCookieParsed: cookieHeader ? cookieHeader.slice(0, 60) + '…' : null,
    cookieAttrs: setCookie
      ? {
          httpOnly: /HttpOnly/i.test(setCookie),
          secure: /Secure/i.test(setCookie),
          sameSite: (setCookie.match(/SameSite=(\w+)/i) || [])[1] ?? null,
          domain: (setCookie.match(/Domain=([^;]+)/i) || [])[1] ?? null,
          maxAge: (setCookie.match(/Max-Age=(\d+)/i) || [])[1] ?? null,
          path: (setCookie.match(/Path=([^;]+)/i) || [])[1] ?? null,
        }
      : null,
  });

  if (!cookieHeader) {
    fs.writeFileSync('docs/production/pre-otp-bootstrap/e2e-probe.json', JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  // 5. Re-fetch document WITH cookie - should return full payload (no `phase`)
  const r5 = await fetch(`${BASE}/api/public-signing/document/${token}`, { headers: { cookie: cookieHeader } });
  const j5 = await r5.json().catch(() => ({}));
  out.steps.push({
    name: 'refetch_with_cookie',
    status: r5.status,
    hasPhaseKey: 'phase' in j5,
    hasDocumentId: !!j5.documentId,
    hasTemplate: !!j5.template,
    hasEducation: !!j5.education,
    hasDecision: !!j5.decision,
    hasSignature: !!j5.signature,
    keys: Object.keys(j5).slice(0, 20),
  });

  fs.writeFileSync('docs/production/pre-otp-bootstrap/e2e-probe.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(2);
});
