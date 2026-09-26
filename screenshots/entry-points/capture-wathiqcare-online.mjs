import { chromium, devices } from 'playwright';
import path from 'node:path';

const baseUrl = 'https://wathiqcare.online';
const outDir = path.resolve(process.cwd(), 'screenshots/entry-points');

const routes = [
  { path: '/', name: 'home' },
  { path: '/request-demo', name: 'request-demo' },
  { path: '/login', name: 'login' },
  { path: '/modules', name: 'modules' },
  { path: '/modules/informed-consents', name: 'informed-consents' },
  { path: '/modules/informed-consents/forms', name: 'informed-consents-forms' },
];

const locales = [
  { code: 'en-US', label: 'en' },
  { code: 'ar-SA', label: 'ar' },
];

const browser = await chromium.launch({ headless: true });

for (const route of routes) {
  for (const locale of locales) {
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      locale: locale.code,
    });
    if (locale.label === 'ar') {
      await context.addCookies([
        { name: 'wathiqcare_lang', value: 'ar', domain: 'wathiqcare.online', path: '/' },
      ]);
    }
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    const url = `${baseUrl}${route.path}`;
    const shotName = `online-${route.name}-${locale.label}`;
    console.log(`Capturing ${shotName}: ${url}`);
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2500);
      const finalUrl = page.url();
      const filePath = path.join(outDir, `${shotName}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`  status: ${response?.status()} | final: ${finalUrl} | saved: ${filePath}`);
      if (consoleErrors.length) console.log(`  console errors:\n    ${consoleErrors.join('\n    ')}`);
    } catch (err) {
      console.error(`  error: ${err.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }
}

await browser.close();
