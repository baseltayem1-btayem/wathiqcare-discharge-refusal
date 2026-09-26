#!/usr/bin/env node
/**
 * WathiqCare Production Patient Journey Release
 * Environment readiness validator.
 *
 * Validates the presence (not values) of required production environment
 * variables. Outputs only READY / MISSING / INVALID per exact variable name.
 * Never prints secrets.
 *
 * Usage: node scripts/production-readiness-check.mjs
 */

const CHECKS = [
  {
    group: "Database",
    items: ["DATABASE_URL"],
  },
  {
    group: "Application URL",
    items: ["NEXT_PUBLIC_CANONICAL_PRODUCTION_URL", "APP_BASE_URL"],
    mode: "any",
  },
  {
    group: "SMS Provider",
    items: ["SMS_PROXY_URL", "SMS_PROXY_SECRET", "SMS_PROXY_SENDER_NAME"],
  },
  {
    group: "Email Provider",
    items: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "RESEND_API_KEY"],
    mode: "smtp-or-resend",
  },
  {
    group: "Token Hashing / Encryption",
    items: ["SIGNING_TOKEN_SECRET", "PUBLIC_SIGNING_OTP_PEPPER"],
  },
  {
    group: "OTP Configuration",
    items: ["SIGNING_LINK_EXPIRY_MINUTES"],
  },
  {
    group: "Object Storage",
    items: ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"],
  },
];

const PLACEHOLDER_PATTERNS = [
  /^YOUR_/i,
  /^CHANGE_ME$/i,
  /^placeholder$/i,
  /^example$/i,
  /^test$/i,
  /^xxx+$/i,
  /^\*+$/,
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function getRawValue(name) {
  const value = process.env[name];
  if (value === undefined || value === null) return undefined;
  return value.trim();
}

function isPresent(name) {
  const value = getRawValue(name);
  return value !== undefined && value.length > 0;
}

function isValidPositiveInteger(name) {
  const value = getRawValue(name);
  if (!value) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidHttpsUrl(name) {
  const value = getRawValue(name);
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSecret(name, minLength = 32) {
  const value = getRawValue(name);
  if (!value) return false;
  if (value.length < minLength) return false;
  return !isPlaceholder(value);
}

function resolveItemStatus(name) {
  if (!isPresent(name)) return "MISSING";

  if (name === "SIGNING_TOKEN_SECRET" || name === "PUBLIC_SIGNING_OTP_PEPPER") {
    return isValidSecret(name) ? "READY" : "INVALID";
  }

  if (name === "SIGNING_LINK_EXPIRY_MINUTES") {
    return isValidPositiveInteger(name) ? "READY" : "INVALID";
  }

  if (name === "S3_ENDPOINT") {
    return isValidHttpsUrl(name) ? "READY" : "INVALID";
  }

  const value = getRawValue(name);
  if (isPlaceholder(value)) return "INVALID";

  return "READY";
}

function evaluateGroup(group) {
  const results = group.items.map((name) => ({
    name,
    status: resolveItemStatus(name),
  }));

  let groupReady = false;

  if (group.mode === "any") {
    groupReady = results.some((r) => r.status === "READY");
  } else if (group.mode === "smtp-or-resend") {
    const hasSmtpCore = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER"].every(
      (name) => results.find((r) => r.name === name)?.status === "READY",
    );
    const hasSmtpPass = results.find((r) => r.name === "SMTP_PASS")?.status === "READY";
    const hasResend = results.find((r) => r.name === "RESEND_API_KEY")?.status === "READY";
    groupReady = hasSmtpCore && (hasSmtpPass || hasResend);
  } else {
    groupReady = results.every((r) => r.status === "READY");
  }

  return { label: group.group, ready: groupReady, items: results };
}

function main() {
  const evaluated = CHECKS.map(evaluateGroup);
  const allReady = evaluated.every((g) => g.ready);

  console.log("WATHIQCARE PRODUCTION READINESS CHECK");
  console.log("======================================");
  for (const group of evaluated) {
    console.log(`\n[${group.ready ? "READY" : "BLOCKED"}] ${group.label}`);
    for (const item of group.items) {
      console.log(`  ${item.name}: ${item.status}`);
    }
  }

  console.log("\n--------------------------------------");
  console.log(`OVERALL: ${allReady ? "READY FOR PRODUCTION DEPLOYMENT" : "BLOCKED - SEE MISSING/INVALID ITEMS ABOVE"}`);

  process.exit(allReady ? 0 : 1);
}

main();
