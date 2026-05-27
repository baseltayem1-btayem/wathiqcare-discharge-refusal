const { chromium, webkit, devices } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'https://wathiqcare.online';
const TOKEN = process.argv[2];
if (!TOKEN) { console.error('TOKEN required'); process.exit(1); }
const OUT = 'docs/production/ui-refresh-reenable';
fs.mkdirSync(OUT, { recursive: true });

async function checkMarker(page) {
  const counts = await page.evaluate(() => ({
    marker: document.querySelectorAll('[data-ui-refresh="v1.1"]').length,
    landing: document.querySelectorAll('.patient-landing-v11').length,
    surface: Array.from(document.querySelectorAll('[data-ui-surface]')).map((e) => e.getAttribute('data-ui-surface')),
    htmlDir: document.documentElement.getAttribute('dir'),
    htmlLang: document.documentElement.getAttribute('lang'),
  }));
  return counts;
}

async function runOne(name, launcher, device, viewport, locale) {
  const browser = await launcher.launch();
  const ctx = await browser.newContext({
    ...(device || {}),
    ...(viewport ? { viewport } : {}),
    ...(locale ? { locale } : {}),
  });
  const page = await ctx.newPage();
  const url = `${BASE}/sign/${encodeURIComponent(TOKEN)}/workflow${locale === 'ar-SA' ? '?lang=ar' : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // wait for doc data to render
  try {
    await page.waitForSelector('[data-ui-refresh="v1.1"], header, [aria-label="Workflow progress"]', { timeout: 20000 });
  } catch {}
  await page.waitForTimeout(2500);
  const m = await checkMarker(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await browser.close();
  return { name, url, viewport, locale, marker: m };
}

(async () => {
  const out = { ts: new Date().toISOString(), base: BASE, token: TOKEN, captures: [] };

  // Workflow page across browsers / locales / viewports
  out.captures.push(await runOne('workflow-safari-iphone14-en', webkit, devices['iPhone 14'], null, 'en-US'));
  out.captures.push(await runOne('workflow-safari-iphone14-ar', webkit, devices['iPhone 14'], null, 'ar-SA'));
  out.captures.push(await runOne('workflow-android-pixel7-en', chromium, devices['Pixel 7'], null, 'en-US'));
  out.captures.push(await runOne('workflow-android-pixel7-ar', chromium, devices['Pixel 7'], null, 'ar-SA'));
  out.captures.push(await runOne('workflow-desktop-1280-en', chromium, null, { width: 1280, height: 800 }, 'en-US'));
  out.captures.push(await runOne('workflow-desktop-1280-ar', chromium, null, { width: 1280, height: 800 }, 'ar-SA'));

  // Negative checks: homepage + dashboards must NOT have marker
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  for (const path of ['/', '/dashboards']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const m = await checkMarker(page);
    await page.screenshot({ path: `${OUT}/negative${path === '/' ? '-home' : '-dashboards'}.png`, fullPage: false });
    out.captures.push({ name: `negative${path === '/' ? '-home' : '-dashboards'}`, url: `${BASE}${path}`, marker: m });
  }
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'reenable-walkthrough.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(99); });
