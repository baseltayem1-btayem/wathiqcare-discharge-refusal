import { chromium } from "@playwright/test";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node smoke-patient-journey.mjs <signing-url>");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error" || text.toLowerCase().includes("error")) {
    errors.push({ type: msg.type(), text });
  }
  console.log(`[${msg.type()}] ${text}`);
});
page.on("pageerror", (err) => {
  errors.push({ type: "pageerror", text: err.message });
  console.error("PAGEERROR:", err.message);
});
page.on("response", async (resp) => {
  if (!resp.ok() && resp.url().includes("/api/")) {
    let body = "";
    try {
      body = await resp.text();
    } catch {
      /* ignore */
    }
    console.error("API ERROR", resp.status(), resp.url(), body.slice(0, 200));
  }
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const screenshotPath = "patient-journey-smoke.png";

// Step 1: Review request
await page.locator("text=وصل إليك طلب موافقة طبية").waitFor();
await page.locator("text=مراجعة الطلب").first().waitFor();
console.log("Step 1 rendered");

// Proceed to OTP
await page.locator("button:has-text('مراجعة الموافقة')").click();
await page.locator("text=التحقق من هويتك").waitFor();
console.log("Step 2 OTP rendered");

// Request OTP
await page.locator("input[aria-label='رقم الجوال']").fill("+966543587771");
await page.locator("button:has-text('إرسال الرمز')").click();

// Wait for the verify state to appear
await page.locator("text=أدخل الرمز المرسل إلى جوالك").waitFor({ timeout: 15000 });
console.log("OTP requested and verify UI shown");

await page.screenshot({ path: screenshotPath, fullPage: true });
console.log("Screenshot:", screenshotPath);

await browser.close();

if (errors.length > 0) {
  console.error("ERRORS FOUND:", errors.length);
  process.exit(1);
}
console.log("Smoke test passed up to OTP request.");
