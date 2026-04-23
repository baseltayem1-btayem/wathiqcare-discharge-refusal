const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = 'C:\\work\\wathiqcare-discharge-refusal-main\\qa-screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Desktop screenshot
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await desktop.newPage();
  await p1.goto('https://wathiqcare.online/demo', { waitUntil: 'networkidle', timeout: 30000 });
  await p1.screenshot({ path: path.join(dir, 'hero-desktop.png'), fullPage: false });

  const heroEl = await p1.$('section.hero');
  if (heroEl) await heroEl.screenshot({ path: path.join(dir, 'hero-section.png') });

  const metrics = await p1.evaluate(() => {
    const hero = document.querySelector('section.hero');
    const h1 = document.querySelector('section.hero h1');
    const links = Array.from(document.querySelectorAll('section.hero a'));
    return {
      heroHasBg: !!hero,
      h1Color: h1 ? getComputedStyle(h1).color : null,
      h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
      buttons: links.map(a => {
        const s = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        return { text: a.textContent?.trim().substring(0,40), bg: s.backgroundColor, color: s.color, w: Math.round(r.width), y: Math.round(r.y) };
      })
    };
  });
  console.log('DESKTOP_METRICS:', JSON.stringify(metrics, null, 2));
  await desktop.close();

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await mobile.newPage();
  await p2.goto('https://wathiqcare.online/demo', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.screenshot({ path: path.join(dir, 'hero-mobile.png'), fullPage: false });

  const stackCheck = await p2.evaluate(() => {
    const links = Array.from(document.querySelectorAll('section.hero a'));
    return links.map(a => {
      const r = a.getBoundingClientRect();
      return { text: a.textContent?.trim().substring(0,40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
    });
  });
  console.log('MOBILE_BUTTONS:', JSON.stringify(stackCheck, null, 2));
  await mobile.close();

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
