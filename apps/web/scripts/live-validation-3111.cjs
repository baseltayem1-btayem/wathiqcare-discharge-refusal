const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { PrismaClient } = require("@prisma/client");

const baseUrl = process.env.VALIDATION_BASE_URL || "http://localhost:3111";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const root = path.resolve(__dirname, "..", "..", "..");
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, "apps", "web", ".env.local"));
}

async function apiJson(method, url, body, cookie) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  const resp = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: resp.status,
    text,
    json,
    setCookie: resp.headers.get("set-cookie") || null,
  };
}

async function loginProbe() {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(`${baseUrl}/api/auth/password/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@wathiqcare.online",
        password: "Admin@Wathiqcare2026!",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { status: resp.status, ms: Math.round(performance.now() - started), timeout: false };
  } catch (error) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      status: -1,
      ms: Math.round(performance.now() - started),
      timeout: /timeout|timed out|abort/i.test(msg),
    };
  }
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();

  try {
    const singleStart = performance.now();
    const singleLogin = await apiJson("POST", `${baseUrl}/api/auth/password/login`, {
      email: "admin@wathiqcare.online",
      password: "Admin@Wathiqcare2026!",
    });
    const singleLoginMs = Math.round(performance.now() - singleStart);

    const probes = await Promise.all(Array.from({ length: 100 }, () => loginProbe()));
    const successCount = probes.filter((p) => p.status >= 200 && p.status < 300).length;
    const failureCount = probes.length - successCount;

    const statusHistogram = {};
    for (const probe of probes) {
      const key = String(probe.status);
      statusHistogram[key] = (statusHistogram[key] || 0) + 1;
    }

    const times = probes.map((p) => p.ms).sort((a, b) => a - b);
    const avgMs = times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100 : null;
    const p95Ms = times.length ? times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] : null;
    const maxMs = times.length ? times[times.length - 1] : null;
    const timeoutsOrHangs = probes.filter((p) => p.timeout).length;

    const health = await apiJson("GET", `${baseUrl}/api/health`);

    const admin = await prisma.user.findUnique({
      where: { email: "admin@wathiqcare.online" },
      select: { id: true, tenantId: true },
    });

    if (!admin) {
      throw new Error("admin not found");
    }

    const now = new Date();
    const incomplete = await prisma.case.create({
      data: {
        tenantId: admin.tenantId,
        caseNumber: `STRICT-${Date.now()}`,
        caseType: "GENERAL",
        title: "Strict validation incomplete",
        status: "OPEN",
        workflowType: "discharge-refusal",
        patientName: "Strict Missing",
        patientIdNumber: `SM-${Date.now()}`,
        medicalRecordNo: `MRN-SM-${Date.now()}`,
        roomNumber: "10A",
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
        metadata: {
          workflow: { attending_physician: "Dr Missing", refusal_started_at: now.toISOString() },
          presentation: { risks_explained: true },
        },
      },
    });

    const complete = await prisma.case.create({
      data: {
        tenantId: admin.tenantId,
        caseNumber: `VALID-${Date.now()}`,
        caseType: "GENERAL",
        title: "Valid PDF complete",
        status: "OPEN",
        workflowType: "discharge-refusal",
        patientName: "Valid Patient",
        patientIdNumber: `VP-${Date.now()}`,
        medicalRecordNo: `MRN-VP-${Date.now()}`,
        roomNumber: "11B",
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
        metadata: {
          workflow: {
            attending_physician: "Dr Valid",
            refusal_started_at: now.toISOString(),
            diagnosis: "General condition with advised admission",
            discharge_decision_at: now.toISOString(),
          },
          presentation: { risks_explained: true },
          signature: { outcome: "refused" },
          witness: { witness_name: "Witness Valid" },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: admin.tenantId,
        userId: admin.id,
        entityType: "case",
        entityId: complete.id,
        action: "summary_recorded",
        details: "Diagnosis and decision documented",
        caseId: complete.id,
        metadataJson: {
          diagnosis: "General condition",
          decision: "Refused",
        },
      },
    });

    if (singleLogin.status < 200 || singleLogin.status >= 300) {
      throw new Error(`suite login failed ${singleLogin.status}: ${singleLogin.text}`);
    }

    const cookie = ((singleLogin.setCookie || "").split(",")[0] || "").split(";")[0];

    const strict = await apiJson("POST", `${baseUrl}/api/cases/${incomplete.id}/generate-pdf`, {
      mode: "draft",
      language: "en",
    }, cookie);

    const strictMissing = Array.isArray(strict.json?.missingRequired)
      ? strict.json.missingRequired
      : [];

    const v1Start = performance.now();
    const v1 = await apiJson("POST", `${baseUrl}/api/cases/${complete.id}/generate-pdf`, {
      mode: "draft",
      language: "en",
    }, cookie);
    const v1DurationMs = Math.round(performance.now() - v1Start);

    const v1Version = v1.json?.report?.version ?? null;
    const latest = await apiJson("GET", `${baseUrl}/api/cases/${complete.id}/pdf`, undefined, cookie);
    const versions = await apiJson("GET", `${baseUrl}/api/cases/${complete.id}/pdf/versions`, undefined, cookie);

    const regenDurations = [];
    for (let i = 0; i < 3; i += 1) {
      const started = performance.now();
      const regen = await apiJson("POST", `${baseUrl}/api/cases/${complete.id}/generate-pdf`, {
        mode: "draft",
        language: "en",
        regenerate: true,
      }, cookie);
      if (regen.status >= 200 && regen.status < 300) {
        regenDurations.push(Math.round(performance.now() - started));
      }
    }

    const regenAvgMs = regenDurations.length
      ? Math.round((regenDurations.reduce((a, b) => a + b, 0) / regenDurations.length) * 100) / 100
      : null;

    const passFail = {
      dbHealthy: health.status >= 200 && health.status < 300,
      loginZeroFailures: failureCount === 0,
      loginUnder1sAvg: avgMs !== null && avgMs < 1000,
      strictPdfValidationBlocks: strict.status === 400 && strictMissing.length > 0,
      versionStableNoForcedRegenerate:
        v1.status >= 200 &&
        v1.status < 300 &&
        latest.json?.forceRegenerateRequired === false &&
        latest.json?.latest?.version === v1Version &&
        latest.json?.latestValid?.version === v1Version,
      pdfUnder3sAvg: regenAvgMs !== null && regenAvgMs < 3000,
    };

    console.log(JSON.stringify({
      server: { baseUrl },
      singleLogin: { status: singleLogin.status, latencyMs: singleLoginMs },
      loginLoad: {
        total: probes.length,
        successCount,
        failureCount,
        statusHistogram,
        avgMs,
        p95Ms,
        maxMs,
        timeoutsOrHangs,
      },
      health,
      strictPdfValidation: {
        caseId: incomplete.id,
        status: strict.status,
        missingRequired: strictMissing,
      },
      validPdfFlow: {
        caseId: complete.id,
        v1Status: v1.status,
        v1DurationMs,
        v1Version,
        latest,
        versions,
      },
      pdfRegenerateTimings: {
        durationsMs: regenDurations,
        avgMs: regenAvgMs,
      },
      passFail,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({ blocker: message, baseUrl }));
    process.exit(2);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main();
