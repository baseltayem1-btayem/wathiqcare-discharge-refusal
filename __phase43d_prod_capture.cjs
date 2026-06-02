const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://wathiqcare.online';
const EMAIL = process.env.PHASE43D_EMAIL || 'medicaldirector@wathiqcare.med.sa';
const PASSWORD = process.env.PHASE43D_PASSWORD || 'WathiqCare@2026';
const OUT_DIR = path.join(__dirname, 'docs', 'production-readiness', 'phase43d-production-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function gotoStable(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (_) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const shots = [];

  async function shoot(name, url, opts = {}) {
    await gotoStable(page, url);
    if (opts.action) {
      await opts.action(page);
    }
    await page.waitForTimeout(900);
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: opts.fullPage || false });
    const size = fs.statSync(file).size;
    shots.push({ name, url, file: path.relative(__dirname, file).replace(/\\/g, '/'), bytes: size });
    console.log('OK', name, size);
  }

  const login = await page.request.post(`${BASE}/api/auth/password/login`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'content-type': 'application/json' },
  });

  if (!login.ok()) {
    console.error('LOGIN FAILED', login.status(), await login.text());
    process.exit(2);
  }

  const clickStep = (label) => async (currentPage) => {
    const button = currentPage
      .locator('button', { has: currentPage.locator(`span:text-is("${label}")`) })
      .first();
    await button.click({ timeout: 8000 });
    await currentPage.waitForTimeout(700);
  };

  await shoot('01_landing', `${BASE}/`, { fullPage: true });
  await shoot('02_landing_en', `${BASE}/en`, { fullPage: true });
  await shoot('03_landing_ar', `${BASE}/ar`, { fullPage: true });
  await shoot('04_request_demo', `${BASE}/request-demo`, { fullPage: true });
  await shoot('05_step1_patient', `${BASE}/modules/informed-consents`, { action: clickStep('Patient') });
  await shoot('06_step2_procedure', `${BASE}/modules/informed-consents`, { action: clickStep('Procedure') });
  await shoot('07_step6_pdf_preview', `${BASE}/modules/informed-consents`, { action: clickStep('Preview') });
  await shoot('08_step7_validation', `${BASE}/modules/informed-consents`, { action: clickStep('Validation') });
  await shoot('09_step8_send', `${BASE}/modules/informed-consents`, { action: clickStep('Send') });
  await shoot('10_arabic_mode', `${BASE}/modules/informed-consents?lang=ar`);
  await shoot('11_modules_informed-consents_create', `${BASE}/modules/informed-consents/create`);
  await shoot('12_modules', `${BASE}/modules`);
  await shoot('13_sign_workflow_token_gate', `${BASE}/sign/PHASE43D-TOKEN-PROBE/workflow`);

  const meta = {
    phase: '43D',
    timestamp: new Date().toISOString(),
    base: BASE,
    authenticatedAs: EMAIL,
    shots,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'phase43d-production-screenshots-metadata.json'), JSON.stringify(meta, null, 2));
  console.log('TOTAL', shots.length);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
