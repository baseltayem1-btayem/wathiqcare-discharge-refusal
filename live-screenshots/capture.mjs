import { chromium } from 'playwright';
import fs from 'fs';

const routes = [
  '/',
  '/modules',
  '/modules/informed-consents',
  '/modules/informed-consents/forms',
  '/login',
  '/request-demo',
];

const base = 'https://wathiqcare.online';
const outDir = 'live-screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const results = [];
  for (const route of routes) {
    const page = await context.newPage();
    const url = base + route;
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      const title = await page.title();
      const screenshot = `${outDir}/${route.replace(/\//g, '_') || 'root'}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      results.push({ route, url, status: resp.status(), title, screenshot, textPreview: text.slice(0, 500) });
      console.log(`OK ${route} -> ${resp.status()} "${title}"`);
    } catch (e) {
      results.push({ route, url, error: e.message });
      console.log(`ERR ${route}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
  fs.writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
})();
