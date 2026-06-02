// Phase 40D — authenticated localhost screenshot capture
// Read-only browser walkthrough. No code edits, no API mutations.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const PASSWORD = 'WathiqCare@2026';
const OUT_DIR = path.join(__dirname, 'docs', 'production-readiness', 'phase40d-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // login via API to set cookie
  const login = await page.request.post(`${BASE}/api/auth/password/login`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'content-type': 'application/json' },
  });
  if (!login.ok()) { console.error('LOGIN FAILED', login.status(), await login.text()); process.exit(2); }
  console.log('login ok', login.status());

  const shots = [];
  async function shoot(name, url, opts = {}) {
    await page.goto(url, { waitUntil: 'networkidle' });
    if (opts.action) { await opts.action(page); }
    await page.waitForTimeout(500);
    const file = path.join(OUT_DIR, name + '.png');
    await page.screenshot({ path: file, fullPage: opts.fullPage || false });
    const size = fs.statSync(file).size;
    shots.push({ name, url, file: path.relative(__dirname, file).replace(/\\/g, '/'), bytes: size });
    console.log('OK', name, size, 'bytes');
  }

  // 1. /modules/informed-consents — should now land on Consent Builder Step 1
  await shoot('01_modules_informed-consents_default_landing', `${BASE}/modules/informed-consents`);

  const clickStep = (label) => async (p) => {
    // Stepper button labels are inside a plain <span> with exact text equal to step.label.
    // Sidebar nav uses different labels ("Patient Search", "Consent Builder", etc.) so exact match is unambiguous.
    const btn = p.locator('button', { has: p.locator(`span:text-is("${label}")`) }).first();
    await btn.click({ timeout: 5000 });
    await p.waitForTimeout(400);
  };

  // 2. Step 1 Patient (default, but re-click for evidence)
  await shoot('02_step1_patient', `${BASE}/modules/informed-consents`, { action: clickStep('Patient') });
  // 3. Step 2 Procedure
  await shoot('03_step2_procedure', `${BASE}/modules/informed-consents`, { action: clickStep('Procedure') });
  // 4. Step 7 Validation
  await shoot('04_step7_validation', `${BASE}/modules/informed-consents`, { action: clickStep('Validation') });
  // 5. Step 8 Send
  await shoot('05_step8_send', `${BASE}/modules/informed-consents`, { action: clickStep('Send') });

  // 6. Arabic mode (lang=ar)
  await shoot('06_arabic_mode', `${BASE}/modules/informed-consents?lang=ar`);

  // 7. /modules/informed-consents/create (preserved legacy stepper)
  await shoot('07_modules_informed-consents_create', `${BASE}/modules/informed-consents/create`);

  // 8. /modules
  await shoot('08_modules', `${BASE}/modules`);

  const meta = {
    phase: '40D',
    timestamp: new Date().toISOString(),
    base: BASE,
    authenticatedAs: EMAIL,
    shots,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'phase40d-screenshots-metadata.json'), JSON.stringify(meta, null, 2));
  console.log('TOTAL', shots.length, 'screenshots');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
