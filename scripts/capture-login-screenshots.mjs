import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'login-ve1');

const shots = [
  { name: 'login-desktop-en', route: '/login', lang: 'en', viewport: { width: 1280, height: 900 } },
  { name: 'login-desktop-ar', route: '/login', lang: 'ar', viewport: { width: 1280, height: 900 } },
  { name: 'login-mobile-en', route: '/login', lang: 'en', viewport: { width: 390, height: 844 } },
  { name: 'login-mobile-ar', route: '/login', lang: 'ar', viewport: { width: 390, height: 844 } },
];

function cookieForLang(lang) {
  return {
    name: 'wathiqcare_lang',
    value: lang,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      locale: shot.lang === 'ar' ? 'ar-SA' : 'en-US',
      timezoneId: shot.lang === 'ar' ? 'Asia/Riyadh' : 'America/New_York',
    });
    await context.addCookies([cookieForLang(shot.lang)]);

    const page = await context.newPage();

    const url = `${BASE_URL}${shot.route}`;
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('form', { timeout: 10000 });
      // Allow fonts and any layout animations to settle.
      await page.waitForTimeout(500);

      const screenshotPath = path.join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const title = await page.title();
      const dir = await page.evaluate(() => document.documentElement.dir);
      results.push({
        name: shot.name,
        route: shot.route,
        lang: shot.lang,
        dir,
        viewport: shot.viewport,
        status: resp.status(),
        title,
        screenshot: screenshotPath,
      });
      console.log(`✓ ${shot.name}: ${resp.status()} "${title}" dir=${dir} -> ${screenshotPath}`);
    } catch (error) {
      results.push({ name: shot.name, route: shot.route, lang: shot.lang, error: error.message });
      console.error(`✗ ${shot.name}: ${error.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
})();
