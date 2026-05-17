import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") process.env[key] = value;
  }
}

function loadEnv() {
  const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
    ? path.resolve(process.cwd(), "..", "..")
    : process.cwd();
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
  loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));
}

const PILOT_USERS = [
  { email: "dr.ahmed@wathiqcare.med.sa", role: "doctor", label: "Pilot Physician", password: "WathiqCare@2026" },
  { email: "medicaldirector@wathiqcare.med.sa", role: "medical_director", label: "Medical Director", password: "WathiqCare@2026" },
  { email: "nursingsupervisor@wathiqcare.med.sa", role: "nursing", label: "Nursing Supervisor", password: "WathiqCare@2026" },
  { email: "legalreviewer@wathiqcare.med.sa", role: "legal_admin", label: "Legal Reviewer", password: "WathiqCare@2026" },
  { email: "compliance@wathiqcare.med.sa", role: "compliance", label: "Compliance Reviewer", password: "WathiqCare@2026" },
];

const PILOT_MRNS = [
  "IMC-2026-02000",
  "IMC-2026-02001",
  "IMC-2026-02002",
  "IMC-2026-02003",
  "IMC-2026-02004",
  "IMC-2026-02005",
  "IMC-2026-02010",
  "IMC-2026-02015",
  "IMC-2026-02020",
  "IMC-2026-02024",
];

async function loginProbe(baseUrl, email, password, rememberMe = false, lang = "en") {
  const response = await fetch(`${baseUrl}/api/auth/password/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept-language": lang,
    },
    body: JSON.stringify({ email, password, rememberMe }),
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: -1, json: async () => ({ error: message }), headers: { get: () => null } };
  });

  const payload = await response.json().catch(() => null);
  return {
    status: response.status ?? -1,
    ok: !!response.ok,
    redirectTo: payload?.redirectTo ?? null,
    hasSessionCookie: Boolean(response.headers?.get?.("set-cookie")),
    raw: payload,
  };
}

async function main() {
  loadEnv();
  const baseUrl = process.env.PILOT_VALIDATION_BASE_URL || "https://wathiqcare.online";
  const skipNetwork = process.env.PILOT_SKIP_NETWORK === "1";

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    checks: {
      users: [],
      mrns: [],
      authentication: [],
    },
    summary: {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
    },
  };

  const artifactsDir = path.join(process.cwd(), "artifacts", "pilot-validation");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  const resolvedDbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (!resolvedDbUrl) {
    report.summary.totalChecks = 0;
    report.summary.blocked = 1;
    report.blocker =
      "No database URL found. Set DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING to run validation.";
    const outJson = path.join(artifactsDir, `pilot-validation-${ts}.json`);
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
    console.log(`[pilot-validation] Report written: ${outJson}`);
    console.error(
      "[pilot-validation] BLOCKED: No database URL is configured. " +
        "Checked: DATABASE_URL, DATABASE_URL_POOLED, DATABASE_URL_UNPOOLED, " +
        "POSTGRES_PRISMA_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING.",
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolvedDbUrl;
  }

  const prisma = new PrismaClient();
  try {
    for (const user of PILOT_USERS) {
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: {
          id: true,
          tenantId: true,
          role: true,
          status: true,
          isActive: true,
          emailVerified: true,
          hashedPassword: true,
        },
      });

      const dbCheck = {
        email: user.email,
        label: user.label,
        expectedRole: user.role,
        exists: Boolean(dbUser),
        roleMatch: dbUser?.role === user.role,
        active: dbUser?.isActive === true && String(dbUser?.status || "").toLowerCase() === "active",
        emailVerified: dbUser?.emailVerified === true,
        passwordHashPresent: typeof dbUser?.hashedPassword === "string" && dbUser.hashedPassword.length > 20,
        status: "FAIL",
      };

      const tenantDomainAllowed = dbUser
        ? await prisma.tenantAllowedDomain.findFirst({
            where: {
              tenantId: dbUser.tenantId,
              domain: "wathiqcare.med.sa",
              isActive: true,
            },
            select: { id: true },
          })
        : null;

      dbCheck.domainAllowed = Boolean(tenantDomainAllowed);
      dbCheck.status =
        dbCheck.exists &&
        dbCheck.roleMatch &&
        dbCheck.active &&
        dbCheck.emailVerified &&
        dbCheck.passwordHashPresent &&
        dbCheck.domainAllowed
          ? "PASS"
          : "FAIL";

      report.checks.users.push(dbCheck);

      if (skipNetwork) {
        report.checks.authentication.push({
          email: user.email,
          status: "BLOCKED",
          reason: "PILOT_SKIP_NETWORK=1",
        });
      } else {
        const loginEn = await loginProbe(baseUrl, user.email, user.password, false, "en");
        const loginAr = await loginProbe(baseUrl, user.email, user.password, false, "ar");
        const rememberMe = await loginProbe(baseUrl, user.email, user.password, true, "en");
        const authStatus =
          loginEn.ok &&
          loginAr.ok &&
          rememberMe.ok &&
          (loginEn.redirectTo === "/modules" || loginEn.redirectTo === "/dashboard");

        report.checks.authentication.push({
          email: user.email,
          loginEnStatus: loginEn.status,
          loginArStatus: loginAr.status,
          rememberMeStatus: rememberMe.status,
          redirectTo: loginEn.redirectTo,
          hasSessionCookie: loginEn.hasSessionCookie || rememberMe.hasSessionCookie,
          status: authStatus ? "PASS" : "FAIL",
        });
      }
    }

    const cases = await prisma.case.findMany({
      where: { medicalRecordNo: { in: PILOT_MRNS } },
      select: {
        id: true,
        medicalRecordNo: true,
        patientName: true,
        status: true,
        metadata: true,
      },
    });

    const byMrn = new Map(cases.map((item) => [item.medicalRecordNo, item]));
    for (const mrn of PILOT_MRNS) {
      const match = byMrn.get(mrn);
      const patientName = match?.patientName || "";
      const hasArabic = /[\u0600-\u06FF]/.test(patientName);
      const hasEnglish = /[A-Za-z]/.test(patientName);

      report.checks.mrns.push({
        mrn,
        exists: Boolean(match),
        caseId: match?.id || null,
        patientName,
        bilingualName: hasArabic && hasEnglish,
        status: match && hasArabic && hasEnglish ? "PASS" : "FAIL",
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  const flattened = [
    ...report.checks.users.map((i) => i.status),
    ...report.checks.authentication.map((i) => i.status),
    ...report.checks.mrns.map((i) => i.status),
  ];

  report.summary.totalChecks = flattened.length;
  report.summary.passed = flattened.filter((s) => s === "PASS").length;
  report.summary.failed = flattened.filter((s) => s === "FAIL").length;
  report.summary.blocked = flattened.filter((s) => s === "BLOCKED").length;

  const outJson = path.join(artifactsDir, `pilot-validation-${ts}.json`);
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");

  console.log(`[pilot-validation] Report written: ${outJson}`);
  console.log(
    `[pilot-validation] Summary: PASS=${report.summary.passed}, FAIL=${report.summary.failed}, BLOCKED=${report.summary.blocked}, TOTAL=${report.summary.totalChecks}`,
  );

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[pilot-validation] Failed:", error);
  process.exit(1);
});
