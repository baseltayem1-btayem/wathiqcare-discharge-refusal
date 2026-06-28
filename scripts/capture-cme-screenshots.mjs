import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`[capture-cme-screenshots] ERROR: ${name} is required.`);
  }
  return value;
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL || "cme.test@wathiqcare.med.sa";
const PASSWORD = requireEnv("TEST_PASSWORD");
const OUT_DIR = process.env.OUT_DIR || "pilot-evidence/content-mapping-engine";

const SCENARIO = process.env.SCENARIO || "flag-off";

async function loginCookie() {
  const res = await fetch(`${BASE_URL}/api/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/wathiqcare_access_token=([^;]+)/);
  if (!match) {
    throw new Error("No access token cookie returned");
  }
  return {
    name: "wathiqcare_access_token",
    value: match[1],
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  };
}

async function main() {
  const cookie = await loginCookie();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([cookie]);
  const page = await context.newPage();

  const networkLog = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/content-mapping/")) {
      networkLog.push({ type: "request", method: req.method(), url });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/content-mapping/")) {
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      networkLog.push({ type: "response", status: res.status(), url, body });
    }
  });

  await page.goto(`${BASE_URL}/modules/informed-consents`);
  // Wait for the workflow shell to render.
  await page.waitForSelector('text=Issue Consent', { timeout: 20000 });

  const scenario = SCENARIO;
  let procedure = "";
  let waitForResolve = false;

  if (scenario === "edu-consent") {
    procedure = "Abdominal Aortic Aneurysm";
    waitForResolve = true;
  } else if (scenario === "consent-only") {
    procedure = "Allergen Immunotherapy";
    waitForResolve = true;
  } else if (scenario === "not-found") {
    procedure = "Unknown Procedure XYZ";
    waitForResolve = true;
  }



  // Open the Procedure step so the procedure field is visible.
  await page.getByRole('button', { name: /Procedure/i }).first().click();
  await page.waitForSelector('text=Procedure Name', { timeout: 10000 });

  // Wait for the feature-flag handshake before typing so the resolver effect is armed.
  await page.waitForResponse(
    (res) => res.url().includes("/content-mapping/feature-flag"),
    { timeout: 15000 },
  );
  // Give the React state update time to apply the feature flag value.
  await page.waitForTimeout(600);

  if (procedure) {
    const resolvePromise = waitForResolve
      ? page.waitForResponse(
          (res) => res.url().includes("/content-mapping/resolve"),
          { timeout: 15000 },
        )
      : Promise.resolve();
    await page.getByLabel("Procedure Name").fill(procedure);
    await resolvePromise;
    // Allow UI to settle after state update.
    await page.waitForTimeout(800);
  }

  if (scenario === "edu-consent") {
    // Move to Education step to show material loaded.
    await page.getByRole('button', { name: /Education/i }).first().click();
    await page.waitForTimeout(600);
  } else {
    // For all other scenarios, open the Template step so the IMC Approved Library card is visible.
    await page.getByRole('button', { name: /Template/i }).first().click();
    await page.waitForTimeout(600);
  }

  const screenshotPath = join(OUT_DIR, `${scenario}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const networkPath = join(OUT_DIR, `${scenario}-network.json`);
  writeFileSync(networkPath, JSON.stringify(networkLog, null, 2));

  await browser.close();
  console.log(`Captured ${screenshotPath} and ${networkPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
