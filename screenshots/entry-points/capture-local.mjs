import { chromium, devices } from 'playwright';
import path from 'node:path';

const baseUrl = 'http://localhost:3002';
const outDir = path.resolve(process.cwd(), 'screenshots/entry-points');

const routes = [
  { name: 'homepage-local', path: '/', waitFor: 3000 },
  { name: 'white-landing-en-local', path: '/preview/white-landing/en', waitFor: 3000 },
  { name: 'white-landing-ar-local', path: '/preview/white-landing/ar', waitFor: 3000 },
];

const browser = await chromium.launch({ headless: true });

for (const route of routes) {
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    locale: route.name.includes('ar') ? 'ar-SA' : 'en-US',
  });
  const page = await context.newPage();
  const url = `${baseUrl}${route.path}`;
  console.log(`Capturing ${route.name}: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(route.waitFor || 2000);
    const finalUrl = page.url();
    const filePath = path.join(outDir, `${route.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  saved: ${filePath} (final: ${finalUrl})`);
  } catch (err) {
    console.error(`  error: ${err.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

await browser.close();
