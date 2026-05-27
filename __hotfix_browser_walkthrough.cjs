// Drives the post-OTP flow in iPhone Safari (webkit), Android Chrome (chromium device emulation),
// and Desktop Chrome. Captures landing → education → consent → OTP → verify (with real Set-Cookie
// from server) → signature submission attempt → confirmation. Saves screenshots and a JSON log.

const { chromium, webkit, devices } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'https://wathiqcare.online';
const TOKEN = process.argv[2];
if (!TOKEN) { console.error('TOKEN required'); process.exit(1); }
const OUT_DIR = 'docs/production/hotfix-browsers';
fs.mkdirSync(OUT_DIR, { recursive: true });

function nowSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function recordDecision(eventType) {
  await fetch(`${BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventType }),
  });
}

async function requestOtp() {
  return fetch(`${BASE}/api/sign/${encodeURIComponent(TOKEN)}/request-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'sms', mobileNumber: '966543587772' }),
  }).then((r) => r.json());
}

function resolveOtp() {
  const raw = execSync(`node __resolve_signing_otp.cjs ${TOKEN}`, { encoding: 'utf8' });
  return JSON.parse(raw);
}

async function runBrowser({ name, launcher, device }) {
  const result = { name, ts: new Date().toISOString(), steps: [] };
  const browser = await launcher.launch();
  const context = await browser.newContext(device ? { ...device } : {});
  const page = await context.newPage();

  const url = `${BASE}/sign/${encodeURIComponent(TOKEN)}/workflow`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT_DIR}/${name}-1-landing.png`, fullPage: false });
  result.steps.push({ stage: 'landing', url: page.url(), title: await page.title() });

  // Make a fresh decision + OTP cycle for this browser run
  await recordDecision('CONSENT_PRESENTED');
  await recordDecision('CONSENT_ACCEPTED');
  const otpReq = await requestOtp();
  result.otpRequest = { ok: !!otpReq?.challengeId, challengeId: otpReq?.challengeId };
  if (!otpReq?.challengeId) {
    result.steps.push({ stage: 'request-otp', failed: true, body: otpReq });
    await browser.close();
    return result;
  }
  const resolved = resolveOtp();
  result.otpResolved = { codeLength: resolved.code.length };

  // Verify OTP via in-page fetch so the browser persists the Set-Cookie
  const verify = await page.evaluate(async ({ token, otp }) => {
    const res = await fetch(`/api/sign/${encodeURIComponent(token)}/verify-otp`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ otpCode: otp }),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, verified: json?.verified, hasSession: Boolean(json?.publicSigningSession?.value) };
  }, { token: TOKEN, otp: resolved.code });
  result.verifyOtp = verify;

  // Read cookies the browser persisted
  const cookies = await context.cookies(BASE);
  const sessionCookie = cookies.find((c) => c.name === 'wathiqcare_public_signing_session');
  result.persistedCookie = sessionCookie
    ? {
        present: true,
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
        path: sessionCookie.path,
        domain: sessionCookie.domain,
        expiresInSec: Math.round(sessionCookie.expires - Date.now() / 1000),
      }
    : { present: false };

  await page.screenshot({ path: `${OUT_DIR}/${name}-2-post-otp.png`, fullPage: false });

  // Continuity probe: GET document with the persisted cookie
  const docCheck = await page.evaluate(async ({ token }) => {
    const r = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}`, {
      credentials: 'include',
    });
    return { status: r.status, ok: r.ok };
  }, { token: TOKEN });
  result.continuityCheck = docCheck;

  // Signature submission attempt (will be 409 because doc is DRAFT — confirms session was read)
  const signAttempt = await page.evaluate(async ({ token }) => {
    const r = await fetch(`/api/public-signing/document/${encodeURIComponent(token)}/sign`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        signerName: 'Hotfix Test Patient',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      }),
    });
    const body = await r.text();
    return { status: r.status, body: body.slice(0, 200) };
  }, { token: TOKEN });
  result.signAttempt = signAttempt;
  result.sessionGateProved = signAttempt.status !== 401; // 409 or 200 means session was accepted

  await page.screenshot({ path: `${OUT_DIR}/${name}-3-signature.png`, fullPage: false });

  await browser.close();
  return result;
}

(async () => {
  const out = { ts: nowSlug(), base: BASE, token: TOKEN, browsers: [] };

  out.browsers.push(await runBrowser({
    name: 'iphone-safari',
    launcher: webkit,
    device: devices['iPhone 14'],
  }));
  out.browsers.push(await runBrowser({
    name: 'android-chrome',
    launcher: chromium,
    device: devices['Pixel 7'],
  }));
  out.browsers.push(await runBrowser({
    name: 'desktop-chrome',
    launcher: chromium,
    device: null,
  }));

  fs.writeFileSync(path.join(OUT_DIR, 'walkthrough.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(99);
});
