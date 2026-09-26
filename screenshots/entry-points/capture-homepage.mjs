import { chromium, devices } from 'playwright';
import path from 'node:path';

const baseUrl = 'http://localhost:3010';
const outDir = path.resolve(process.cwd(), 'screenshots/entry-points');

const configs = [
  { name: 'local-home-en', path: '/', locale: 'en-US' },
  { name: 'local-home-ar', path: '/', locale: 'ar-SA' },
];

const browser = await chromium.launch({ headless: true });

for (const config of configs) {
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    locale: config.locale,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  const url = `${baseUrl}${config.path}`;
  console.log(`Capturing ${config.name}: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);
    const filePath = path.join(outDir, `${config.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  saved: ${filePath}`);
    if (consoleErrors.length) console.log(`  console errors:\n    ${consoleErrors.join('\n    ')}`);
  } catch (err) {
    console.error(`  error: ${err.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

await browser.close();
