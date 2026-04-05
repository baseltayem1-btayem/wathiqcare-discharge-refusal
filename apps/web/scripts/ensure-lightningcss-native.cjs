#!/usr/bin/env node

const { execSync } = require("node:child_process");
const checkOnly = process.argv.includes("--check-only");

function detectLinuxFlavor() {
  const getReport = process.report && typeof process.report.getReport === "function"
    ? process.report.getReport
    : null;

  if (!getReport) {
    return "gnu";
  }

  try {
    const report = getReport();
    const glibcVersion = report?.header?.glibcVersionRuntime;
    return glibcVersion ? "gnu" : "musl";
  } catch {
    return "gnu";
  }
}

function resolvePackageForRuntime() {
  if (process.platform !== "linux") {
    return null;
  }

  const flavor = detectLinuxFlavor();

  if (process.arch === "x64") {
    return flavor === "musl"
      ? "lightningcss-linux-x64-musl"
      : "lightningcss-linux-x64-gnu";
  }

  if (process.arch === "arm64") {
    return flavor === "musl"
      ? "lightningcss-linux-arm64-musl"
      : "lightningcss-linux-arm64-gnu";
  }

  return null;
}

function ensurePackage(packageName, version) {
  if (!packageName) {
    console.log("[ensure-lightningcss-native] Non-Linux or unsupported arch. Skipping.");
    return;
  }

  try {
    require.resolve(packageName);
    console.log(`[ensure-lightningcss-native] ${packageName} already installed.`);
    return;
  } catch {
    if (checkOnly) {
      console.error(`[ensure-lightningcss-native] Missing required native package: ${packageName}`);
      process.exitCode = 1;
      return;
    }

    // Install below.
  }

  const target = `${packageName}@${version}`;
  console.log(`[ensure-lightningcss-native] Installing ${target}...`);
  execSync(`npm install --no-save ${target}`, {
    stdio: "inherit",
    env: process.env,
  });
}

const pkg = resolvePackageForRuntime();
const version = process.env.LIGHTNINGCSS_NATIVE_VERSION || "1.32.0";

ensurePackage(pkg, version);
