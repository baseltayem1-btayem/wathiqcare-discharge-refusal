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

  // Hero section only
  const heroEl = await p1.$('section.hero');
  if (heroEl) {
    await heroEl.screenshot({ path: path.join(dir, 'hero-section.png') });
  }

  // Compute contrast metrics
  const metrics = await p1.evaluate(() => {
    const hero = document.querySelector('section.hero');
    const h1 = document.querySelector('section.hero h1');
    const btn1 = document.querySelector('section.hero a:first-of-type');
    const btn2 = document.querySelector('section.hero a:last-of-type');
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const b1Style = btn1 ? getComputedStyle(btn1) : null;
    const b2Style = btn2 ? getComputedStyle(btn2) : null;
    return {
      heroBackground: heroStyle?.backgroundImage?.substring(0,80),
      h1Color: h1Style?.color,
      h1FontSize: h1Style?.fontSize,
      btn1BgColor: b1Style?.backgroundColor,
      btn1TextColor: b1Style?.color,
      btn2BgColor: b2Style?.backgroundColor,
      btn2TextColor: b2Style?.color,
      btn2Border: b2Style?.border,
    };
  });
  console.log('METRICS:', JSON.stringify(metrics, null, 2));

  await desktop.close();

  // Mobile screenshot (390px)
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await mobile.newPage();
  await p2.goto('https://wathiqcare.online/demo', { waitUntil: 'networkidle', timeout: 30000 });
  await p2.screenshot({ path: path.join(dir, 'hero-mobile.png'), fullPage: false });

  // Check button stacking
  const stackMetrics = await p2.evaluate(() => {
    const actions = document.querySelector('.hero-actions');
    const links = actions ? Array.from(actions.querySelectorAll('a')) : [];
    return links.map(a => {
      const r = a.getBoundingClientRect();
      return { text: a.textContent?.trim().substring(0,30), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
    });
  });
  console.log('BUTTON_STACK:', JSON.stringify(stackMetrics, null, 2));

  await mobile.close();

  await browser.close();
  console.log('SCREENSHOTS_DONE');
})().catch(e => { console.error(e.message); process.exit(1); });
