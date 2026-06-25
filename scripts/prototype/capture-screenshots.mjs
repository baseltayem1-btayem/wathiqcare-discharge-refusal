#!/usr/bin/env node
/**
 * Capture prototype V2 screenshots using Playwright.
 *
 * Usage:
 *   node scripts/prototype/capture-screenshots.mjs
 *
 * The script expects the dev server at http://localhost:3000. If it is not
 * reachable, the script will start `npm run dev -w apps/web` automatically and
 * shut it down on completion.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE_URL = process.env.PROTOTYPE_BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "prototype-v2", "screenshots");

const shots = [
  { route: "/prototype", file: "prototype-hub.png", waitForText: "24-Hour Acceleration" },
  { route: "/prototype/approved-forms-v2", file: "approved-forms-v2.png", waitForText: "Approved Forms V2" },
  { route: "/prototype/procedure-mapping-engine", file: "procedure-mapping-engine.png", waitForText: "Procedure Mapping Engine" },
  { route: "/prototype/doctor-workspace-v2", file: "doctor-workspace-v2.png", waitForText: "Doctor Workspace V2" },
  { route: "/prototype/content-mapping-service", file: "content-mapping-service.png", waitForText: "Content Mapping Service" },
  { route: "/prototype/consent-journey", file: "consent-journey.png", waitForText: "Consent Journey" },
];

async function isServerUp(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log("Starting dev server: npm run dev -w apps/web");
    const proc = spawn("npm", ["run", "dev", "-w", "apps/web"], {
      stdio: "pipe",
      shell: true,
      cwd: process.cwd(),
    });

    let started = false;
    const check = setInterval(async () => {
      if (await isServerUp(BASE_URL)) {
        clearInterval(check);
        started = true;
        console.log("Dev server ready.");
        resolve(proc);
      }
    }, 1500);

    setTimeout(() => {
      if (!started) {
        clearInterval(check);
        reject(new Error("Dev server did not start within 60 seconds"));
      }
    }, 60000);
  });
}

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    if (await isServerUp(BASE_URL)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  let serverProc = null;
  const serverAlreadyUp = await isServerUp(BASE_URL);
  if (!serverAlreadyUp) {
    serverProc = await startDevServer();
  } else {
    console.log("Dev server already running.");
  }

  const ready = await waitForServer();
  if (!ready) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    for (const shot of shots) {
      const url = `${BASE_URL}${shot.route}`;
      console.log(`Capturing ${shot.route} -> ${shot.file}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector(`text=${shot.waitForText}`, { timeout: 15000 });
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, shot.file),
        fullPage: true,
      });
    }
    console.log("\nScreenshots saved to:", SCREENSHOTS_DIR);
  } catch (err) {
    console.error("Screenshot capture failed:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (serverProc && !serverAlreadyUp) {
      console.log("Stopping dev server.");
      serverProc.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
