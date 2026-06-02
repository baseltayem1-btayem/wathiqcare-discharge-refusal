const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const URLS = [
  'https://wathiqcare.online',
  'https://wathiqcare.online/request-demo',
  'https://wathiqcare.online/login',
  'https://wathiqcare.online/modules',
  'https://wathiqcare.online/modules/informed-consents',
  'https://wathiqcare.online/modules/promissory-notes',
  'https://wathiqcare.online/api/health',
  'https://wathiqcare.online/api/health/runtime',
];

function slugFromUrl(url) {
  const u = new URL(url);
  const p = u.pathname === '/' ? 'root' : u.pathname.replace(/^\//, '').replace(/\//g, '__');
  return `${u.hostname}__${p}`;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function run() {
  const ts = nowStamp();
  const outDir = path.join('docs', 'production-readiness', 'phase35b-live-evidence', ts);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

  const metadata = {
    capturedAtUtc: new Date().toISOString(),
    outputDir: outDir,
    checks: [],
  };

  for (const url of URLS) {
    const page = await context.newPage();
    const startedAt = new Date().toISOString();
    let status = null;
    let finalUrl = url;
    let contentType = null;
    let title = null;
    let h1 = null;
    let visibleIdentity = null;
    let bodyTextSnippet = null;
    let error = null;

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      status = response ? response.status() : null;
      finalUrl = page.url();
      contentType = response ? response.headers()['content-type'] || null : null;
      await page.waitForTimeout(1000);

      title = await page.title();
      h1 = await page.locator('h1').first().textContent().catch(() => null);
      visibleIdentity = await page
        .locator('h1, h2, [data-testid], [aria-label], nav, header, main')
        .first()
        .textContent()
        .catch(() => null);
      bodyTextSnippet = await page
        .locator('body')
        .innerText()
        .then((t) => (t || '').replace(/\s+/g, ' ').slice(0, 400))
        .catch(() => null);

      const shotPath = path.join(outDir, `${slugFromUrl(url)}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      metadata.checks.push({
        startedAt,
        capturedAt: new Date().toISOString(),
        url,
        finalUrl,
        status,
        contentType,
        screenshotPath: shotPath.replace(/\\/g, '/'),
        title,
        h1: h1 ? h1.trim() : null,
        visibleIdentity: visibleIdentity ? visibleIdentity.replace(/\s+/g, ' ').trim().slice(0, 240) : null,
        bodyTextSnippet,
      });
    } catch (e) {
      error = String(e && e.message ? e.message : e);
      metadata.checks.push({
        startedAt,
        capturedAt: new Date().toISOString(),
        url,
        finalUrl,
        status,
        contentType,
        screenshotPath: null,
        title,
        h1,
        visibleIdentity,
        bodyTextSnippet,
        error,
      });
    } finally {
      await page.close();
    }
  }

  const metaPath = path.join(outDir, 'phase35b-live-evidence-metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`Evidence captured: ${outDir}`);
  console.log(`Metadata: ${metaPath.replace(/\\/g, '/')}`);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
