import { chromium } from "playwright";

function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`[debug-cme-screenshot] ERROR: ${name} is required.`);
  }
  return value;
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL || "cme.test@wathiqcare.med.sa";
const PASSWORD = requireEnv("TEST_PASSWORD");

async function loginCookie() {
  const res = await fetch(`${BASE_URL}/api/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/wathiqcare_access_token=([^;]+)/);
  return {
    name: "wathiqcare_access_token",
    value: match[1],
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  };
}

const cookie = await loginCookie();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([cookie]);
const page = await context.newPage();

page.on("request", (req) => {
  if (req.url().includes("content-mapping")) console.log("REQ", req.method(), req.url());
});
page.on("response", async (res) => {
  if (res.url().includes("content-mapping")) {
    const body = await res.text().catch(() => "");
    console.log("RES", res.status(), res.url(), body.slice(0, 200));
  }
});

await page.goto(`${BASE_URL}/modules/informed-consents`);
await page.waitForSelector('text=Issue Consent', { timeout: 20000 });
await page.getByRole('button', { name: /Procedure/i }).first().click();
await page.waitForSelector('text=Procedure Name', { timeout: 10000 });
await page.waitForResponse(
  (res) => res.url().includes("/content-mapping/feature-flag"),
  { timeout: 15000 },
);
await page.waitForTimeout(800);
console.log("feature-flag seen; filling procedure");
await page.getByLabel("Procedure Name").fill("Abdominal Aortic Aneurysm");
console.log("input value after fill:", await page.getByLabel("Procedure Name").inputValue());
await page.waitForTimeout(3000);
console.log("network done");
await page.screenshot({ path: "pilot-evidence/content-mapping-engine/debug.png", fullPage: true });
await browser.close();
