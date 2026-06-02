const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugFromUrl(input) {
  const u = new URL(input);
  const pathname = u.pathname === '/' ? 'root' : u.pathname.replace(/^\//, '').replace(/\//g, '__');
  const query = u.search ? `__q_${u.search.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` : '';
  return `${u.hostname}__${pathname}${query}`;
}

function resolveConfig() {
  const phase = process.env.PHASE || 'phase35c';
  const stage = process.env.STAGE || 'unknown-stage';
  const baseUrl = process.env.BASE_URL || 'https://wathiqcare.online';
  const rawUrls = process.env.URLS || '/modules/informed-consents,/modules/informed-consents?lang=ar,/modules/informed-consents?lang=en';
  const urls = rawUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (u.startsWith('http://') || u.startsWith('https://') ? u : `${baseUrl}${u}`));

  return { phase, stage, baseUrl, urls };
}

async function run() {
  const { phase, stage, baseUrl, urls } = resolveConfig();
  const ts = nowStamp();
  const outDir = path.join('docs', 'production-readiness', `${phase}-evidence`, `${ts}-${stage}`);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

  const metadata = {
    capturedAtUtc: new Date().toISOString(),
    phase,
    stage,
    baseUrl,
    outputDir: outDir.replace(/\\/g, '/'),
    checks: [],
  };

  for (const url of urls) {
    const page = await context.newPage();
    const startedAt = new Date().toISOString();

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1500);

      const status = response ? response.status() : null;
      const finalUrl = page.url();
      const contentType = response ? response.headers()['content-type'] || null : null;
      const title = await page.title();
      const h1 = (await page.locator('h1').first().textContent().catch(() => null)) || null;
      const hasApprovedTestId = await page
        .locator('[data-testid="approved-informed-consents-module"]')
        .count()
        .then((n) => n > 0)
        .catch(() => false);
      const releaseSurface = await page
        .locator('[data-release-surface="approved-informed-consents"]')
        .count()
        .then((n) => n > 0)
        .catch(() => false);
      const bodyTextSnippet = await page
        .locator('body')
        .innerText()
        .then((t) => (t || '').replace(/\s+/g, ' ').slice(0, 400))
        .catch(() => null);

      const screenshotPath = path.join(outDir, `${slugFromUrl(url)}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      metadata.checks.push({
        startedAt,
        capturedAt: new Date().toISOString(),
        url,
        finalUrl,
        status,
        contentType,
        title,
        h1: h1 ? h1.trim() : null,
        hasApprovedTestId,
        hasApprovedReleaseSurface: releaseSurface,
        bodyTextSnippet,
        screenshotPath: screenshotPath.replace(/\\/g, '/'),
      });
    } catch (error) {
      metadata.checks.push({
        startedAt,
        capturedAt: new Date().toISOString(),
        url,
        error: String(error && error.message ? error.message : error),
      });
    } finally {
      await page.close();
    }
  }

  const metaPath = path.join(outDir, `${phase}-${stage}-metadata.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`Evidence captured: ${outDir.replace(/\\/g, '/')}`);
  console.log(`Metadata: ${metaPath.replace(/\\/g, '/')}`);

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
