#!/usr/bin/env node

/**
 * Production IMC pilot executor (temporary-access mode)
 *
 * Flow:
 * 1. Create temporary platform_admin (expires in 24h)
 * 2. Login via production password API, capture session cookie
 * 3. Ensure ER department is active in IMC tenant config
 * 4. Create 10 real workflow cases (non-test script path)
 * 5. Generate 10 bundles
 * 6. Verify each bundle
 * 7. Revoke temporary access immediately
 * 8. Emit summary report JSON
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.prod.temp");

if (!fs.existsSync(ENV_PATH)) {
  throw new Error(".env.prod.temp not found. Run: npx vercel env pull .env.prod.temp --environment=production");
}

function loadEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(ENV_PATH);

const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
const WEB_BASE = "https://wathiqcare.online";
const BACKEND_BASE = process.env.BACKEND_API_BASE_URL;

if (!DATABASE_URL) throw new Error("DATABASE_URL missing in .env.prod.temp");
if (!BACKEND_BASE) throw new Error("BACKEND_API_BASE_URL missing in .env.prod.temp");

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return {
    status: res.status,
    json,
    traceId: res.headers.get("x-trace-id") || null,
    headers: res.headers,
  };
}

function toBearer(accessToken) {
  return { authorization: `Bearer ${accessToken}` };
}

async function loginAndGetAccessToken(email, password) {
  const loginResp = await fetch(`${WEB_BASE}/api/auth/password/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const loginText = await loginResp.text();
  let loginJson = null;
  try {
    loginJson = loginText ? JSON.parse(loginText) : null;
  } catch {
    loginJson = null;
  }

  if (!loginResp.ok) {
    throw new Error(`Login failed (${loginResp.status}): ${loginText}`);
  }

  const accessToken = loginJson?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Login succeeded but accessToken was not returned");
  }

  return accessToken;
}

async function main() {
  const nonce = crypto.randomUUID().slice(0, 8);
  const doctorEmail = `temp.pilot.doctor.${nonce}@wathiqcare.online`;
  const legalEmail = `temp.pilot.legal.${nonce}@wathiqcare.online`;
  const doctorPassword = `Tmp!${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const legalPassword = `Tmp!${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const report = {
    startedAt: new Date().toISOString(),
    tempAccess: {
      doctor: { email: doctorEmail, created: false, revoked: false },
      legal: { email: legalEmail, created: false, revoked: false },
    },
    erDepartment: { checked: false, active: null },
    casesCreated: [],
    bundles: [],
    passCount: 0,
    failCount: 0,
    sampleBundleIds: [],
  };

  let doctorUserId = null;
  let legalUserId = null;
  let tenantId = null;
  let doctorAccessToken = null;
  let legalAccessToken = null;
  let prisma = null;

  try {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });

    // 1) Resolve IMC tenant and create temporary users
    const imcTenant = await prisma.tenant.findFirst({
      where: { code: { equals: "IMC", mode: "insensitive" } },
      select: { id: true, code: true, metadata: true },
    });
    if (!imcTenant) throw new Error("IMC tenant not found in production DB");
    tenantId = imcTenant.id;

    const bcrypt = require("bcryptjs");

    async function provisionTempUser({ email, password, fullName, role, userType, membershipRole }) {
      const passwordHash = bcrypt.hashSync(password, 12);
      const userId = crypto.randomUUID();

      const upserted = await prisma.user.upsert({
        where: { email: email.toLowerCase() },
        update: {
          tenantId,
          fullName,
          role,
          userType,
          status: "active",
          isActive: true,
          emailVerified: true,
          authProvider: "local_password",
          hashedPassword: passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        create: {
          id: userId,
          tenantId,
          email: email.toLowerCase(),
          fullName,
          role,
          userType,
          status: "active",
          isActive: true,
          emailVerified: true,
          authProvider: "local_password",
          hashedPassword: passwordHash,
          failedLoginAttempts: 0,
        },
        select: { id: true },
      });

      await prisma.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId,
            userId: upserted.id,
          },
        },
        update: {
          role: membershipRole,
          status: "ACTIVE",
        },
        create: {
          id: crypto.randomUUID(),
          tenantId,
          userId: upserted.id,
          role: membershipRole,
          status: "ACTIVE",
        },
      });

      return upserted.id;
    }

    doctorUserId = await provisionTempUser({
      email: doctorEmail,
      password: doctorPassword,
      fullName: `Temp Pilot Doctor ${nonce}`,
      role: "doctor",
      userType: "TENANT_USER",
      membershipRole: "MEMBER",
    });
    report.tempAccess.doctor.created = true;

    legalUserId = await provisionTempUser({
      email: legalEmail,
      password: legalPassword,
      fullName: `Temp Pilot Legal ${nonce}`,
      role: "legal_admin",
      userType: "TENANT_ADMIN",
      membershipRole: "ADMIN",
    });
    report.tempAccess.legal.created = true;

    // 2) Login both users and capture bearer tokens
    doctorAccessToken = await loginAndGetAccessToken(doctorEmail, doctorPassword);
    legalAccessToken = await loginAndGetAccessToken(legalEmail, legalPassword);

    // 3) Determine ER department active status from tenant metadata
    report.erDepartment.checked = true;
    const metadataValue = imcTenant.metadata;
    if (metadataValue) {
      try {
        const parsed = metadataValue;
        const departments = parsed?.adminConfig?.departments || [];
        const er = Array.isArray(departments)
          ? departments.find((d) => String(d.code || "").toUpperCase() === "EMERGENCY")
          : null;
        report.erDepartment.active = er ? er.isActive !== false : null;
      } catch {
        report.erDepartment.active = null;
      }
    }

    // 4) Create 10 cases + generate + verify bundles
    for (let i = 1; i <= 10; i += 1) {
      const mrn = `IMC-ER-${Date.now()}-${i}`;
      const refusalPayload = {
        patient_mrn: mrn,
        patient_name: `ER Patient ${i}`,
        refusal_reason: "ER pilot production workflow",
        signer_name: "ER Attending",
        signer_role: "doctor",
        signature_text: "Signed",
      };

      const createRes = await fetchJson(`${BACKEND_BASE}/api/discharge/refusal`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...toBearer(doctorAccessToken),
        },
        body: JSON.stringify(refusalPayload),
      });

      if (createRes.status >= 400) {
        report.casesCreated.push({
          index: i,
          ok: false,
          status: createRes.status,
          traceId: createRes.traceId,
          error: createRes.json,
        });
        continue;
      }

      const caseId = createRes.json.discharge_case_id;
      report.casesCreated.push({ index: i, ok: true, caseId });

      const bundleRes = await fetchJson(`${BACKEND_BASE}/api/discharge/evidence-bundle/${encodeURIComponent(caseId)}`, {
        method: "POST",
        headers: toBearer(legalAccessToken),
      });

      if (bundleRes.status >= 400) {
        report.bundles.push({
          index: i,
          caseId,
          generated: false,
          status: bundleRes.status,
          traceId: bundleRes.traceId,
          error: bundleRes.json,
        });
        continue;
      }

      const bundleFile = bundleRes.json.bundle_file;
      const verifyRes = await fetchJson(`${BACKEND_BASE}/api/discharge/verify?bundleId=${encodeURIComponent(bundleFile)}`, {
        method: "GET",
        headers: toBearer(legalAccessToken),
      });

      const verified = verifyRes.status < 400 && Boolean(verifyRes.json.valid);
      report.bundles.push({
        index: i,
        caseId,
        generated: true,
        bundleId: bundleRes.json.bundle_id,
        bundleFile,
        verified,
        verifyStatus: verifyRes.status,
        verifyTraceId: verifyRes.traceId,
        verifyError: verifyRes.status >= 400 ? verifyRes.json : null,
      });
    }

    report.passCount = report.bundles.filter((b) => b.verified).length;
    report.failCount = report.bundles.length - report.passCount;
    report.sampleBundleIds = report.bundles.filter((b) => b.bundleId).slice(0, 5).map((b) => b.bundleId);

  } finally {
    // 5) Immediate revoke temporary access
    const revokeIds = [doctorUserId, legalUserId].filter(Boolean);
    if (revokeIds.length > 0) {
      try {
        if (!prisma) {
          prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
        }

        await prisma.user.updateMany({
          where: {
            id: { in: revokeIds },
          },
          data: {
            isActive: false,
            status: "suspended",
            lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        report.tempAccess.doctor.revoked = true;
        report.tempAccess.legal.revoked = true;
      } catch (err) {
        report.tempAccess.doctor.revoked = false;
        report.tempAccess.legal.revoked = false;
        report.tempAccess.revokeError = String(err?.message || err);
      }
    }

    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {}
    }

    report.finishedAt = new Date().toISOString();
    const outPath = path.join(ROOT, "prod_imc_pilot_execution_report.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

    console.log("REPORT_PATH", outPath);
    console.log("PASS_COUNT", report.passCount);
    console.log("FAIL_COUNT", report.failCount);
    console.log("SAMPLE_BUNDLE_IDS", JSON.stringify(report.sampleBundleIds));
    console.log("TEMP_ACCESS_REVOKED", report.tempAccess.doctor.revoked && report.tempAccess.legal.revoked);
  }
}

main().catch((err) => {
  console.error("FATAL", err?.stack || String(err));
  process.exit(1);
});
