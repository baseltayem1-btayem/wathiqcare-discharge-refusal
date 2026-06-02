/* Phase 43B visual smoke capture
 * Saves screenshots under docs/production-readiness/phase43b-screenshots/
 * Headless chromium 1440x900.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve(__dirname, 'docs/production-readiness/phase43b-screenshots');
const EMAIL = 'dr.ahmed@wathiqcare.med.sa';
const PASSWORD = 'WathiqCare@2026';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function snap(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`captured ${name}`);
}

async function gotoStable(page, url, name) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`networkidle timeout for ${url}, falling back to domcontentloaded`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.waitForTimeout(800);
  await snap(page, name);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('#email').first().fill(EMAIL);
  await page.locator('#password').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
}

async function clickStep(page, stepKey) {
  await page.evaluate((key) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(b => (b.getAttribute('data-step') === key) || b.textContent?.toLowerCase().includes(key));
    if (target) target.click();
  }, stepKey);
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();

  // 1. Public landing (updated, English root)
  await gotoStable(page, `${BASE}/`, '01-landing-root-english');

  // 2. /en route via [lang]
  await gotoStable(page, `${BASE}/en`, '02-landing-en-lang');

  // 3. /ar route (existing AR landing preserved)
  await gotoStable(page, `${BASE}/ar`, '03-landing-ar-preserved');

  // 4. /request-demo (preserved)
  await gotoStable(page, `${BASE}/request-demo`, '04-request-demo');

  // 5. login + protected routes
  await login(page);
  await gotoStable(page, `${BASE}/modules`, '05-modules');
  await gotoStable(page, `${BASE}/modules/informed-consents`, '06-modules-informed-consents-step1-patient');

  // Try clicking each step in the stepper to capture
  const stepKeys = [
    { key: 'procedure',   label: '07-step2-procedure' },
    { key: 'anesthesia',  label: '08-step3-anesthesia' },
    { key: 'disclosures', label: '09-step4-disclosures' },
    { key: 'education',   label: '10-step5-education' },
    { key: 'preview',     label: '11-step6-preview-pdf-prep' },
    { key: 'validation',  label: '12-step7-readiness-validation' },
    { key: 'send',        label: '13-step8-secure-link-prep' },
  ];
  for (const s of stepKeys) {
    // attempt click via stepper button with data-step or text
    await page.evaluate((key) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => {
        const ds = b.getAttribute('data-step');
        if (ds === key) return true;
        const t = (b.textContent || '').trim().toLowerCase();
        return t === key || t.startsWith(key);
      });
      if (target) target.click();
    }, s.key);
    await page.waitForTimeout(700);
    await snap(page, s.label);
  }

  // 14. /modules/informed-consents/create
  await gotoStable(page, `${BASE}/modules/informed-consents/create`, '14-modules-informed-consents-create');

  // 15. /sign/[token]/workflow presence check (no real token; expect token-required gate)
  await gotoStable(page, `${BASE}/sign/PHASE43B-TOKEN-PROBE/workflow`, '15-sign-workflow-token-gate');

  await browser.close();
  console.log('done');
})().catch(e => {
  console.error('capture failed', e);
  process.exit(2);
});
