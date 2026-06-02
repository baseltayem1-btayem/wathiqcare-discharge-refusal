// Phase 40G — clean main-based UI-only branch visual smoke (read-only, no mutations)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const PASSWORD = 'WathiqCare@2026';
const OUT_DIR = path.join(__dirname, 'docs', 'production-readiness', 'phase40g-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PATIENT_TOKEN_CANDIDATES = [
  'xYonm4RoYnXH9u3CDNGxFB6lPB131oRS5md2zWkP-Ko',
  'FQiasUsNY7AvjauI8Ou2ggLPRoPaRFILNc8tAZOC7Bk',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const login = await page.request.post(`${BASE}/api/auth/password/login`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'content-type': 'application/json' },
  });
  if (!login.ok()) { console.error('LOGIN FAILED', login.status(), await login.text()); process.exit(2); }
  console.log('login ok', login.status());

  const shots = [];
  async function shoot(name, url, opts = {}) {
    const resp = await page.goto(url, { waitUntil: 'networkidle' });
    if (opts.action) { await opts.action(page); }
    await page.waitForTimeout(500);
    const file = path.join(OUT_DIR, name + '.png');
    await page.screenshot({ path: file, fullPage: opts.fullPage || false });
    const size = fs.statSync(file).size;
    shots.push({ name, url, status: resp ? resp.status() : null, file: path.relative(__dirname, file).replace(/\\/g, '/'), bytes: size });
    console.log('OK', name, size, 'bytes', resp ? resp.status() : '');
  }

  const clickStep = (label) => async (p) => {
    const btn = p.locator('button', { has: p.locator(`span:text-is("${label}")`) }).first();
    await btn.click({ timeout: 5000 });
    await p.waitForTimeout(400);
  };

  await shoot('01_modules_informed-consents_default_landing', `${BASE}/modules/informed-consents`);
  await shoot('02_step1_patient', `${BASE}/modules/informed-consents`, { action: clickStep('Patient') });
  await shoot('03_step2_procedure', `${BASE}/modules/informed-consents`, { action: clickStep('Procedure') });
  await shoot('04_step7_validation', `${BASE}/modules/informed-consents`, { action: clickStep('Validation') });
  await shoot('05_step8_send', `${BASE}/modules/informed-consents`, { action: clickStep('Send') });
  await shoot('06_arabic_mode', `${BASE}/modules/informed-consents?lang=ar`);
  await shoot('07_modules_informed-consents_create', `${BASE}/modules/informed-consents/create`);
  await shoot('08_modules', `${BASE}/modules`);

  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonCtx.newPage();
  const tokenResults = [];
  for (const t of PATIENT_TOKEN_CANDIDATES) {
    const url = `${BASE}/sign/${t}/workflow`;
    try {
      const r = await anonPage.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      const status = r ? r.status() : null;
      const file = path.join(OUT_DIR, `09_patient_workflow_${t.slice(0, 8)}.png`);
      await anonPage.screenshot({ path: file });
      const bytes = fs.statSync(file).size;
      const bodyText = await anonPage.locator('body').innerText().catch(() => '');
      tokenResults.push({ token: t, status, bytes, bodySnippet: bodyText.slice(0, 300), file: path.relative(__dirname, file).replace(/\\/g, '/') });
      shots.push({ name: `09_patient_workflow_${t.slice(0, 8)}`, url, status, file: path.relative(__dirname, file).replace(/\\/g, '/'), bytes });
      console.log('PATIENT', t.slice(0, 8), status, bytes, 'bytes');
    } catch (e) {
      tokenResults.push({ token: t, error: String(e).slice(0, 200) });
      console.log('PATIENT ERR', t.slice(0, 8), e.message);
    }
  }
  await anonCtx.close();

  let healthJson = null;
  try {
    const r = await page.request.get(`${BASE}/api/health/runtime`);
    const text = await r.text();
    healthJson = { status: r.status(), body: text };
    fs.writeFileSync(path.join(OUT_DIR, 'health-runtime.json'), text);
    console.log('HEALTH', r.status(), text.length, 'bytes');
  } catch (e) {
    healthJson = { error: String(e).slice(0, 200) };
  }

  const meta = {
    phase: '40G',
    timestamp: new Date().toISOString(),
    base: BASE,
    authenticatedAs: EMAIL,
    physicianShots: shots.filter(s => !s.name.startsWith('09_')),
    patientJourneyAttempts: tokenResults,
    apiSmoke: { 'GET /api/health/runtime': healthJson },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'phase40g-screenshots-metadata.json'), JSON.stringify(meta, null, 2));
  console.log('TOTAL', shots.length, 'screenshots');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
