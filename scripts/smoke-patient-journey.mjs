import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || "https://web-3nts2js60-wathiqcare.vercel.app";
const SMOKE_SECRET = process.env.SMOKE_SECRET || readFileSync(join(__dirname, "..", ".smoke_secret.tmp"), "utf8")
  .replace("SECRET=", "").trim();

async function createSigningLink() {
  const res = await fetch(`${BASE_URL}/api/smoke/create-test-signing-link`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-smoke-secret": SMOKE_SECRET },
    body: JSON.stringify({ locale: "ar" }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`create-test-signing-link failed: ${JSON.stringify(data)}`);
  const url = new URL(data.signingUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 2];
  return { token, signingUrl: `${BASE_URL}/sign/${encodeURIComponent(token)}/workflow` };
}

async function revealOtp(token) {
  const res = await fetch(`${BASE_URL}/api/smoke/reveal-otp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-smoke-secret": SMOKE_SECRET },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`reveal-otp failed: ${JSON.stringify(data)}`);
  return data.code;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-SA" });
  const page = await context.newPage();

  const screenshots = [];
  async function snap(name) {
    const path = join(__dirname, "..", `smoke-${name}.png`);
    await page.screenshot({ path, fullPage: true });
    screenshots.push(path);
  }

  try {
    const { token, signingUrl } = await createSigningLink();
    console.log("Token", token);
    console.log("Opening", signingUrl);
    await page.goto(signingUrl, { waitUntil: "networkidle" });
    await snap("01-review");

    // Proceed to OTP
    await page.getByRole("button", { name: /مراجعة الموافقة|Review Consent/ }).click();
    await page.waitForSelector('input[aria-label^="رقم الجوال"], input[aria-label^="Mobile number"]');
    await snap("02-otp-request");

    // Request OTP
    await page.getByLabel(/رقم الجوال|Mobile number/).fill("+966543587771");
    await page.getByRole("button", { name: /إرسال الرمز|Send Code/ }).click();
    await page.waitForSelector('input[aria-label^="رقم التحقق"], input[aria-label^="OTP digit"]');
    await snap("03-otp-verify");

    // Reveal OTP via smoke harness
    const code = await revealOtp(token);
    console.log("OTP code:", code);

    const inputs = await page.locator('input[aria-label^="رقم التحقق"], input[aria-label^="OTP digit"]').all();
    for (let i = 0; i < 6; i++) {
      await inputs[i].fill(code[i]);
    }
    await page.getByRole("button", { name: /التحقق والمتابعة|Verify and Continue/ }).click();
    await page.waitForSelector('text=/مراجعة شروط الموافقة|Review Consent Terms/');
    await snap("04-acknowledgement");

    // Acknowledge and accept
    await page.locator("button", { hasText: /أؤكد أنني قرأت|I confirm/ }).click();
    await page.getByRole("button", { name: /أوافق على الإجراء|I Accept/ }).click();
    await page.waitForSelector('text=/توقيع الموافقة|Sign Consent/');
    await snap("05-signature");

    // Fill signer name and draw signature
    await page.getByPlaceholder(/أدخل اسمك|Enter full name/).fill("Mohammed Ibrahim Al-Rashidi");
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.hover();
      await page.mouse.down();
      await page.mouse.move(box.x + 10, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2 + 10);
      await page.mouse.up();
    }
    await page.getByRole("button", { name: /تأكيد التوقيع|Confirm Signature/ }).click();
    await page.waitForSelector('text=/تمت|Signing Complete|completed|تم إكمال/');
    await snap("06-completion");

    const finalUrl = page.url();
    const bodyText = await page.locator("body").innerText();
    console.log("Final URL:", finalUrl);
    console.log("Completion text snippet:", bodyText.slice(0, 400));

    if (!bodyText.includes("تم") && !bodyText.includes("completed") && !bodyText.includes("تأكيد")) {
      throw new Error("Completion screen not detected");
    }

    console.log("Smoke test completed successfully");
    console.log("Screenshots:", screenshots.join(", "));
  } catch (error) {
    console.error("Smoke test failed:", error);
    await snap("error");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
