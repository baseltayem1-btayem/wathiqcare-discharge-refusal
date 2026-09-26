import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const repoRoot = resolve(process.cwd(), "..", "..");
const htmlPath = resolve(repoRoot, "pilot-evidence", "sprint3-ui-preview.html");
const screenshotPath = resolve(repoRoot, "pilot-evidence", "sprint3-ui-preview.png");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle" });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();
  console.log(`Screenshot saved to ${screenshotPath}`);
})();
