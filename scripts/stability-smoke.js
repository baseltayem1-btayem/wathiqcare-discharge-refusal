const { chromium } = require("playwright");

async function checkPublicRoutes(context) {
  const routes = [
    "https://wathiqcare.online/",
    "https://wathiqcare.online/en",
    "https://wathiqcare.online/ar",
    "https://wathiqcare.online/en/login",
    "https://wathiqcare.online/ar/login",
    "https://wathiqcare.online/auth/password-reset",
    "https://wathiqcare.online/en/request-demo",
    "https://wathiqcare.online/ar/request-demo",
  ];

  const findings = [];

  for (const url of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const failedFetches = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(String(err));
    });

    page.on("response", (resp) => {
      const responseUrl = resp.url();
      if (responseUrl.includes("wathiqcare.online") && resp.status() >= 400) {
        failedFetches.push(`${resp.status()} ${responseUrl}`);
      }
    });

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.reload({ waitUntil: "networkidle", timeout: 45000 });
    } catch (err) {
      consoleErrors.push(`NAVIGATION_ERROR ${String(err)}`);
    }

    if (consoleErrors.length || failedFetches.length) {
      findings.push({
        route: url,
        consoleErrors,
        failedFetches,
      });
    }

    await page.close();
  }

  return findings;
}

async function checkDashboardAuthFlow(context) {
  const findings = [];
  const page = await context.newPage();
  const consoleErrors = [];
  const failedFetches = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(String(err));
  });

  page.on("response", (resp) => {
    const responseUrl = resp.url();
    if (responseUrl.includes("wathiqcare.online") && resp.status() >= 400) {
      failedFetches.push(`${resp.status()} ${responseUrl}`);
    }
  });

  await page.goto("https://wathiqcare.online/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(7000);
  const unauthUrl = page.url();
  if (!unauthUrl.includes("/login")) {
    findings.push({
      route: "dashboard-gate",
      issue: `Expected redirect to login for unauthenticated access, got ${unauthUrl}`,
    });
  }

  await page.goto("https://wathiqcare.online/en/login", { waitUntil: "domcontentloaded", timeout: 45000 });

  await page.getByRole("button", { name: /^Password$/i }).click();
  await page.locator('input[type="email"]').first().fill("admin@wathiqcare.online");
  await page.locator('input[type="password"]').first().fill("WCare@2026");

  await Promise.all([
    page.waitForURL(/wathiqcare\.online\/platform/, { timeout: 45000 }),
    page.getByRole("button", { name: /Sign in|تسجيل الدخول/i }).last().click(),
  ]);

  await page.goto("https://wathiqcare.online/platform", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);
  const dashboardUrl = page.url();

  await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);
  const dashboardReloadUrl = page.url();

  if (!dashboardUrl.includes("/platform")) {
    findings.push({
      route: "dashboard-auth",
      issue: `Expected authenticated platform access, got ${dashboardUrl}`,
    });
  }

  if (!dashboardReloadUrl.includes("/platform")) {
    findings.push({
      route: "dashboard-refresh",
      issue: `Expected platform page to remain stable on refresh, got ${dashboardReloadUrl}`,
    });
  }

  if (consoleErrors.length) {
    findings.push({ route: "dashboard-console", issue: consoleErrors.slice(0, 8) });
  }

  const coreFailedFetches = failedFetches.filter((x) => x.includes("/api/"));
  if (coreFailedFetches.length) {
    findings.push({ route: "dashboard-fetch", issue: coreFailedFetches.slice(0, 12) });
  }

  await page.close();

  return findings;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const findings = [];

  findings.push(...(await checkPublicRoutes(context)));
  findings.push(...(await checkDashboardAuthFlow(context)));

  await browser.close();

  if (findings.length === 0) {
    console.log("STABILITY_SMOKE_OK");
    process.exit(0);
  }

  console.log("STABILITY_SMOKE_ISSUES");
  for (const finding of findings) {
    console.log(JSON.stringify(finding));
  }
  process.exit(2);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
