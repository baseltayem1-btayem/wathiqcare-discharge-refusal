import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'https://wathiqcare.online';
const outDir = process.cwd();

const routes = [
  { name: '01-homepage', path: '/', auth: false },
  { name: '02-login', path: '/login', auth: false },
  { name: '03-modules', path: '/modules', auth: false },
  { name: '04-doctor-workspace', path: '/modules/informed-consents', auth: true },
  { name: '05-approved-forms', path: '/modules/informed-consents/forms', auth: true },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['Desktop Chrome'],
  locale: 'en-US',
});

for (const route of routes) {
  const page = await context.newPage();
  const url = `${baseUrl}${route.path}`;
  console.log(`Capturing ${route.name}: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    const filePath = path.join(outDir, `${route.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  saved: ${filePath} (final: ${finalUrl})`);
  } catch (err) {
    console.error(`  error capturing ${route.name}: ${err.message}`);
    try {
      const filePath = path.join(outDir, `${route.name}-error.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`  saved error screenshot: ${filePath}`);
    } catch {}
  } finally {
    await page.close();
  }
}

await browser.close();
