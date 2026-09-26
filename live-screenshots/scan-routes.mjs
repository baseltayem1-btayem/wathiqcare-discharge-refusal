import { chromium } from 'playwright';

const routes = [
  '/',
  '/modules',
  '/modules/informed-consents',
  '/modules/informed-consents/forms',
  '/login',
  '/request-demo',
  '/sign/dummy-token/workflow',
];

const base = 'https://wathiqcare.online';
const forbidden = [
  'Production Preview',
  'Demo Patient',
  'MRN-000001',
  'ENC-2026-0001',
  'Draft/Pending/Blocked',
  'Draft',
  'Pending',
  'Blocked',
  'workspace shell',
  'mock patient',
  'sample patient',
  'IMC Informed Consent Workspace',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const route of routes) {
    const page = await context.newPage();
    try {
      const resp = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45000 });
      const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      const found = forbidden.filter(f => text.toLowerCase().includes(f.toLowerCase()));
      console.log(`\n===== ${route} (status ${resp.status()}) =====`);
      console.log('Title:', await page.title());
      console.log('Forbidden hits:', found.length ? found.join(', ') : 'NONE');
      const relevant = text.split('\n').map(l => l.trim()).filter(l => l.length > 2).slice(0, 15).join(' | ');
      console.log('Text preview:', relevant.slice(0, 300));
    } catch (e) {
      console.log(`\n===== ${route} ERROR =====`);
      console.log(e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
})();
