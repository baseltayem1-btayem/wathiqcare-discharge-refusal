/**
 * Full v1.1 visual + flow walkthrough on preview.
 *  - Performs request-otp / verify-otp via /api/sign/<token>/* (cookie-jar) for each locale
 *  - Resolves OTP code by HMAC brute-force against actual preview DB
 *  - Re-uses cookie in a Playwright context to capture the v1.1 PatientLanding
 *
 * Output:
 *  docs/preview/preview-v11-<locale>-<viewport>.png
 *  docs/preview/preview-v11-walkthrough.json
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PREVIEW_BASE = 'https://wathiqcare-discharge-refusal-7pwgp96lg-wathiqcare.vercel.app';
const PROD_BASE = 'https://wathiqcare.online';
const TOKEN = process.env.PREVIEW_TOKEN || 'TlBnb1WT8yRhvozwe9hbpV8UrkRyTCVYuvV_8Kh-5GU';
const MOBILE = process.env.PREVIEW_MOBILE || '966543587772';
const OUT_DIR = path.resolve(__dirname, 'docs', 'preview');

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
];
const LOCALES = ['en', 'ar'];

const COOKIE_NAME = 'wathiqcare_public_signing_session';

function resolveOtp() {
  const out = execFileSync('node', ['__resolve_preview_otp.cjs', TOKEN], { encoding: 'utf8' });
  return JSON.parse(out.trim());
}

async function performOtpDance(locale) {
  // Step 0: education events (best-effort; may 409 if no linked package — ignore)
  for (const ev of ['EDUCATION_PRESENTED', 'EDUCATION_ACKNOWLEDGED']) {
    const r = await fetch(`${PREVIEW_BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}/education`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventType: ev, acknowledgement: ev === 'EDUCATION_ACKNOWLEDGED' ? true : undefined, language: 'bilingual', durationSeconds: 5, scrollCompletion: 100, assetViews: [] }),
    });
    if (!r.ok) console.log(`  [edu-${ev}] ${r.status} (continuing)`);
  }
  // Step 1: decision CONSENT_PRESENTED + CONSENT_ACCEPTED
  for (const ev of ['CONSENT_PRESENTED', 'CONSENT_ACCEPTED']) {
    const r = await fetch(`${PREVIEW_BASE}/api/public-signing/document/${encodeURIComponent(TOKEN)}/decision`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventType: ev }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`decision-${ev} ${r.status}: ${t.slice(0, 220)}`);
    }
  }
  // Step 2: request-otp
  const reqRes = await fetch(`${PREVIEW_BASE}/api/sign/${encodeURIComponent(TOKEN)}/request-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mobileNumber: MOBILE, locale }),
  });
  const reqText = await reqRes.text();
  if (!reqRes.ok) throw new Error(`request-otp ${reqRes.status}: ${reqText.slice(0, 220)}`);

  const otpInfo = resolveOtp();

  const verifyRes = await fetch(`${PREVIEW_BASE}/api/sign/${encodeURIComponent(TOKEN)}/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ otpCode: otpInfo.code }),
  });
  const verifyText = await verifyRes.text();
  if (!verifyRes.ok) throw new Error(`verify-otp ${verifyRes.status}: ${verifyText.slice(0, 220)}`);

  const verifyJson = JSON.parse(verifyText);
  const cookieValue = verifyJson?.publicSigningSession?.value;
  if (!cookieValue) throw new Error(`no publicSigningSession.value in: ${verifyText.slice(0, 300)}`);
  return { cookieValue };
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { generatedAt: new Date().toISOString(), token: TOKEN, base: PREVIEW_BASE, captures: [], productionCheck: null };
  const u = new URL(PREVIEW_BASE);

  for (const loc of LOCALES) {
    let dance;
    try {
      dance = await performOtpDance(loc);
      console.log(`[OTP] ${loc} cookie len=${dance.cookieValue.length}`);
    } catch (e) {
      console.log(`[OTP][ERR] ${loc} ${e.message}`);
      for (const vp of VIEWPORTS) report.captures.push({ locale: loc, viewport: vp.name, error: `OTP: ${e.message}` });
      continue;
    }

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        locale: loc === 'ar' ? 'ar-SA' : 'en-US',
      });
      await ctx.addCookies([{
        name: COOKIE_NAME, value: dance.cookieValue, domain: u.hostname, path: '/',
        httpOnly: true, secure: true, sameSite: 'Lax',
      }]);
      const page = await ctx.newPage();
      const url = `${PREVIEW_BASE}/sign/${TOKEN}/workflow`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        if (loc === 'ar') {
          const toggle = page.locator('button:has-text("العربية"), [data-locale="ar"], [aria-label*="Arabic" i]').first();
          if (await toggle.count()) { await toggle.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(800); }
        }
        await page.waitForTimeout(1500);
        const v11 = await page.locator('[data-ui-refresh="v1.1"]').count();
        const htmlDir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
        const title = await page.title();
        const landingPreview = (await page.locator('main').first().innerText().catch(() => '')).slice(0, 240);
        const file = path.join(OUT_DIR, `preview-v11-${loc}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        report.captures.push({ locale: loc, viewport: vp.name, url, v11Count: v11, htmlDir, title, landingPreview, file, error: null });
        console.log(`[OK] ${loc} ${vp.name} -> v1.1=${v11} dir=${htmlDir}`);
      } catch (e) {
        report.captures.push({ locale: loc, viewport: vp.name, url, error: String(e && e.message || e) });
        console.log(`[ERR] ${loc} ${vp.name} -> ${e.message}`);
      } finally {
        await ctx.close();
      }
    }
  }

  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    const page = await ctx.newPage();
    await page.goto(`${PROD_BASE}/en`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1500);
    const prodV11 = await page.locator('[data-ui-refresh="v1.1"]').count();
    const file = path.join(OUT_DIR, `production-baseline-1280.png`);
    await page.screenshot({ path: file, fullPage: false });
    report.productionCheck = { base: PROD_BASE, v11Count: prodV11, file, pass: prodV11 === 0 };
    console.log(`[PROD] v1.1 count=${prodV11} pass=${prodV11 === 0}`);
    await ctx.close();
  } catch (e) {
    report.productionCheck = { error: String(e && e.message || e) };
  }

  await browser.close();
  const reportFile = path.join(OUT_DIR, 'preview-v11-walkthrough.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportFile}`);
})();
