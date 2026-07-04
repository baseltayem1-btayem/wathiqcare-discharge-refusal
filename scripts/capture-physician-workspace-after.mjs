import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const OUT_DIR = path.resolve('qa-screenshots/physician-workspace-ve3/after');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function capture(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`Captured ${name}`);
}

async function main() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const url = `${BASE_URL}/prototype/clinical-workspace-2`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('text=Patient & Encounter', { timeout: 10000 });

  // 1. Initial empty workspace
  await capture(page, '01-initial');

  // 2. Select patient
  await page.fill('input[placeholder*="Search patient"]', 'Ahmad Hassan');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Ahmad Hassan/ }).click();
  await page.waitForTimeout(300);
  await capture(page, '02-patient-selected');

  // 3. Select procedure
  await page.getByRole('button', { name: /Laparoscopic appendectomy/ }).click();
  await page.waitForTimeout(500);
  await capture(page, '03-procedure-selected');

  // 4. Approve draft (no alerts for Ahmad)
  await page.getByRole('button', { name: 'Approve draft' }).click();
  await page.waitForTimeout(300);
  await capture(page, '04-draft-approved');

  // 5. Open send modal
  await page.getByRole('button', { name: 'Send to patient' }).click();
  await page.waitForTimeout(300);
  await capture(page, '05-send-modal');

  // 6. Send and view timeline
  await page.getByRole('button', { name: 'Confirm send' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'View timeline' }).click();
  await page.waitForTimeout(300);
  await capture(page, '06-timeline');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
