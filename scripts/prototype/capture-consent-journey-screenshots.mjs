#!/usr/bin/env node
/**
 * Capture Consent Journey state screenshots using Playwright.
 *
 * Usage:
 *   node scripts/prototype/capture-consent-journey-screenshots.mjs
 *
 * The script expects the dev server at http://localhost:3000.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PROTOTYPE_BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "prototype-v2", "screenshots");

async function isServerUp(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  if (!(await isServerUp(BASE_URL))) {
    console.error(`Server not reachable at ${BASE_URL}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Selection state.
    await page.goto(`${BASE_URL}/prototype/consent-journey`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Consent Journey", { timeout: 15000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "consent-journey-01-selection.png"),
      fullPage: true,
    });

    // Example: Education + Consent.
    await page.click("text=Example: Education + Consent");
    await page.waitForSelector("text=Patient Education Material", { timeout: 15000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "consent-journey-02-education.png"),
      fullPage: true,
    });

    await page.click("text=Patient has reviewed the education material");
    await page.click("text=Continue to Consent Preview");
    await page.waitForSelector("text=Consent Form Preview", { timeout: 15000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "consent-journey-03-preview.png"),
      fullPage: true,
    });

    await page.click("text=Physician confirms the consent form is correct");
    await page.click("text=Mark Ready for Signature");
    await page.waitForSelector("text=Ready for Signature", { timeout: 15000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "consent-journey-04-ready.png"),
      fullPage: true,
    });

    // Example: Consent Only.
    await page.click("text=Reset");
    await page.waitForSelector("text=Select a Procedure", { timeout: 15000 });
    await page.click("text=Example: Consent Only");
    await page.waitForSelector("text=Consent Form Preview", { timeout: 15000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "consent-journey-05-consent-only.png"),
      fullPage: true,
    });

    console.log("\nConsent Journey screenshots saved to:", SCREENSHOTS_DIR);
  } catch (err) {
    console.error("Screenshot capture failed:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
