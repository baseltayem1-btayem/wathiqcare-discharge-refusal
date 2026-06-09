const { chromium } = require("playwright");

(async () => {
  const base = "https://wathiqcare.online";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1600, height: 1000 },
  });

  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${base}/modules/informed-consents?uiuxSmoke=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });

  const bodyText = await page.locator("body").innerText({ timeout: 30000 });

  const forbidden = [
    "DEMO_CASE_ID is not defined",
    "Case not found",
    "caseId and templateId are required",
    "Consent document not found",
    "This page is temporarily unavailable",
    "language is not defined",
    "toggleLanguage is not defined",
    "Languages is not defined",
  ];

  for (const item of forbidden) {
    if (bodyText.includes(item)) throw new Error(`${item} still visible`);
    if (errors.some((e) => e.includes(item))) {
      throw new Error(`${item} still in console: ${errors.join(" | ")}`);
    }
  }

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      windowWidth: window.innerWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      bodyWidth: body.scrollWidth,
      rootWidth: root.scrollWidth,
    };
  });

  if (overflow.documentWidth > overflow.windowWidth + 12) {
    throw new Error(`Horizontal overflow detected: ${JSON.stringify(overflow)}`);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1000);

  const overflow1366 = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      windowWidth: window.innerWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      bodyWidth: body.scrollWidth,
      rootWidth: root.scrollWidth,
    };
  });

  if (overflow1366.documentWidth > overflow1366.windowWidth + 12) {
    throw new Error(`Horizontal overflow detected at 1366: ${JSON.stringify(overflow1366)}`);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);

  const overflow1024 = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      windowWidth: window.innerWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      bodyWidth: body.scrollWidth,
      rootWidth: root.scrollWidth,
    };
  });

  if (overflow1024.documentWidth > overflow1024.windowWidth + 12) {
    throw new Error(`Horizontal overflow detected at 1024: ${JSON.stringify(overflow1024)}`);
  }

  await browser.close();
  console.log("BROWSER_PRODUCTION_PASS_INFORMED_CONSENTS_UIUX_NO_HORIZONTAL_OVERFLOW");
})();
