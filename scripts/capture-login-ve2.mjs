import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const BASELINE_DIR = path.resolve('qa-screenshots/login-ve1');
const CURRENT_DIR = path.resolve('qa-screenshots/login-ve2');

const shots = [
  { name: 'login-desktop-en', lang: 'en', dir: 'ltr', viewport: { width: 1280, height: 900 } },
  { name: 'login-desktop-ar', lang: 'ar', dir: 'rtl', viewport: { width: 1280, height: 900 } },
  { name: 'login-mobile-en', lang: 'en', dir: 'ltr', viewport: { width: 390, height: 844 } },
  { name: 'login-mobile-ar', lang: 'ar', dir: 'rtl', viewport: { width: 390, height: 844 } },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function comparePng(a, b, threshold = 30) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const diff = new PNG({ width, height });
  let diffCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxA = (a.width * y + x) << 2;
      const idxB = (b.width * y + x) << 2;
      const r1 = a.data[idxA];
      const g1 = a.data[idxA + 1];
      const b1 = a.data[idxA + 2];
      const a1 = a.data[idxA + 3];
      const r2 = b.data[idxB];
      const g2 = b.data[idxB + 1];
      const b2 = b.data[idxB + 2];
      const a2 = b.data[idxB + 3];
      const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2);
      const idxD = (width * y + x) << 2;
      if (dist > threshold) {
        diffCount++;
        diff.data[idxD] = 255;
        diff.data[idxD + 1] = 0;
        diff.data[idxD + 2] = 0;
        diff.data[idxD + 3] = 255;
      } else {
        diff.data[idxD] = r1;
        diff.data[idxD + 1] = g1;
        diff.data[idxD + 2] = b1;
        diff.data[idxD + 3] = a1;
      }
    }
  }
  const totalPixels = width * height;
  return {
    dimensionsMatch: a.width === b.width && a.height === b.height,
    diffCount,
    totalPixels,
    mismatchPercent: (diffCount / totalPixels) * 100,
    diffPng: diff,
  };
}

async function main() {
  ensureDir(CURRENT_DIR);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const shot of shots) {
    const context = await browser.newContext({ viewport: shot.viewport });
    const page = await context.newPage();
    const url = new URL('/login', BASE_URL).toString();

    await context.addCookies([
      { name: 'wathiqcare_lang', value: shot.lang, domain: new URL(BASE_URL).hostname, path: '/', sameSite: 'Lax' },
    ]);

    let status = null;
    let title = '';
    let error = null;
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      status = resp.status();
      await page.evaluate(({ lang }) => {
        window.localStorage.setItem('wathiqcare_lang', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      }, { lang: shot.lang });
      // Force a small re-render window for client-side locale swap.
      await page.waitForTimeout(300);
      title = await page.title();
      const screenshotPath = path.join(CURRENT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.push({ ...shot, url, status, title, screenshot: screenshotPath });
      console.log(`OK ${shot.name} -> ${status} "${title}"`);
    } catch (e) {
      error = e.message;
      results.push({ ...shot, url, status, title, error });
      console.log(`ERR ${shot.name}: ${error}`);
    } finally {
      await page.close();
      await context.close();
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(CURRENT_DIR, 'results.json'), JSON.stringify(results, null, 2));

  console.log('\n--- Comparison against VE-1 baseline ---');
  let allPass = true;
  for (const shot of shots) {
    const baselinePath = path.join(BASELINE_DIR, `${shot.name}.png`);
    const currentPath = path.join(CURRENT_DIR, `${shot.name}.png`);
    if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) {
      console.log(`${shot.name}: MISSING baseline or current`);
      allPass = false;
      continue;
    }
    const baseline = readPng(baselinePath);
    const current = readPng(currentPath);
    const cmp = comparePng(baseline, current, 30);
    const diffPath = path.join(CURRENT_DIR, `${shot.name}-diff.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(cmp.diffPng));
    const dimensionNote = cmp.dimensionsMatch
      ? ""
      : ` (dimensions differ: baseline=${baseline.width}x${baseline.height} current=${current.width}x${current.height}, compared on overlapping area)`;
    const pass = cmp.mismatchPercent < 15;
    console.log(
      `${shot.name}: ${cmp.mismatchPercent.toFixed(3)}% mismatch (${cmp.diffCount} pixels) ${
        pass ? "PASS" : "FAIL"
      }${dimensionNote}`
    );
    if (!pass) allPass = false;
  }

  if (allPass) {
    console.log('\nAll screenshots match VE-1 baseline within tolerance.');
    process.exit(0);
  } else {
    console.log('\nScreenshot comparison detected differences.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
