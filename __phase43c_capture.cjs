// Phase 43C — authenticated visual approval gap closure capture
// Read-only browser walkthrough against a local production build.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.PHASE43C_EMAIL || 'medicaldirector@wathiqcare.med.sa';
const PASSWORD = process.env.PHASE43C_PASSWORD || 'WathiqCare@2026';
const OUT_DIR = path.join(__dirname, 'docs', 'production-readiness', 'phase43c-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function gotoStable(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (_) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const login = await page.request.post(`${BASE}/api/auth/password/login`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'content-type': 'application/json' },
  });

  if (!login.ok()) {
    console.error('LOGIN FAILED', login.status(), await login.text());
    process.exit(2);
  }

  const shots = [];

  async function shoot(name, url, opts = {}) {
    await gotoStable(page, url);
    if (opts.action) {
      await opts.action(page);
    }
    await page.waitForTimeout(700);
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: opts.fullPage || false });
    const size = fs.statSync(file).size;
    shots.push({ name, url, file: path.relative(__dirname, file).replace(/\\/g, '/'), bytes: size });
    console.log('OK', name, size, 'bytes');
  }

  const clickStep = (label) => async (currentPage) => {
    const button = currentPage
      .locator('button', { has: currentPage.locator(`span:text-is("${label}")`) })
      .first();
    await button.click({ timeout: 5000 });
    await currentPage.waitForTimeout(500);
  };

  await shoot('01_step1_patient', `${BASE}/modules/informed-consents`, { action: clickStep('Patient') });
  await shoot('02_step2_procedure', `${BASE}/modules/informed-consents`, { action: clickStep('Procedure') });
  await shoot('03_step6_pdf_preview', `${BASE}/modules/informed-consents`, { action: clickStep('Preview') });
  await shoot('04_step7_validation', `${BASE}/modules/informed-consents`, { action: clickStep('Validation') });
  await shoot('05_step8_send', `${BASE}/modules/informed-consents`, { action: clickStep('Send') });
  await shoot('06_arabic_mode', `${BASE}/modules/informed-consents?lang=ar`);
  await shoot('07_modules_informed-consents_create', `${BASE}/modules/informed-consents/create`);
  await shoot('08_modules', `${BASE}/modules`);

  const meta = {
    phase: '43C',
    timestamp: new Date().toISOString(),
    base: BASE,
    authenticatedAs: EMAIL,
    shots,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'phase43c-screenshots-metadata.json'),
    JSON.stringify(meta, null, 2),
  );

  console.log('TOTAL', shots.length, 'screenshots');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
