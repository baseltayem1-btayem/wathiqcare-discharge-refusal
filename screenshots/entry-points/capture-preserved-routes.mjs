import { chromium, devices } from 'playwright';
import path from 'node:path';

const baseUrl = 'http://localhost:3010';
const outDir = path.resolve(process.cwd(), 'screenshots/entry-points');

const routes = [
  { name: 'local-login', path: '/login', waitFor: 3000 },
  { name: 'local-modules', path: '/modules', waitFor: 3000 },
  { name: 'local-approved-forms', path: '/modules/informed-consents/forms', waitFor: 3000 },
];

const browser = await chromium.launch({ headless: true });

for (const route of routes) {
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    locale: 'en-US',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  const url = `${baseUrl}${route.path}`;
  console.log(`Capturing ${route.name}: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(route.waitFor || 2000);
    const finalUrl = page.url();
    const filePath = path.join(outDir, `${route.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  saved: ${filePath} (final: ${finalUrl})`);
    if (consoleErrors.length) console.log(`  console errors:\n    ${consoleErrors.join('\n    ')}`);
  } catch (err) {
    console.error(`  error: ${err.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

await browser.close();
