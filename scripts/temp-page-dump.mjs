import { chromium } from "playwright";

function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`[temp-page-dump] ERROR: ${name} is required.`);
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
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/wathiqcare_access_token=([^;]+)/);
  if (!match) throw new Error("No cookie");
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
await page.goto(`${BASE_URL}/modules/informed-consents`);
await page.waitForTimeout(5000);
const text = await page.locator("body").innerText();
console.log(text.slice(0, 3000));
await page.screenshot({ path: "pilot-evidence/content-mapping-engine/dump.png", fullPage: true });
await browser.close();
