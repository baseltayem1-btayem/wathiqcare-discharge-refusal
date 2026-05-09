const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { chromium } = require("playwright");
const bcrypt = require("bcryptjs");
const {
  MembershipRole,
  MembershipStatus,
  PrismaClient,
  UserType,
} = require("@prisma/client");

const BASE_URL = (process.env.VALIDATION_BASE_URL || "http://127.0.0.1:3113").replace(/\/$/, "");
const DEFAULT_PASSWORD = process.env.RELEASE_GATE_PASSWORD || "Admin@Wathiqcare2026!";
const RESET_PASSWORD = process.env.RELEASE_GATE_RESET_PASSWORD || "Reset@Wathiqcare2026!";
const REPORT_PATH = path.resolve(process.cwd(), "artifacts", "release-gate", "final-prod-release-gate.json");
const SESSION_COOKIE_NAME = "wathiqcare_access_token";

const prisma = new PrismaClient();

const roleFixtures = [
  {
    key: "tenantAdmin",
    email: "tenant.admin@wathiqcare.online",
    fullName: "Tenant Admin Release Gate",
    role: "tenant_admin",
    userType: UserType.TENANT_ADMIN,
    membershipRole: MembershipRole.ADMIN,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
  },
  {
    key: "doctor",
    email: "doctor.release@wathiqcare.online",
    fullName: "Doctor Release Gate",
    role: "doctor",
    userType: UserType.TENANT_USER,
    membershipRole: MembershipRole.MEMBER,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
  },
  {
    key: "nurse",
    email: "nurse.release@wathiqcare.online",
    fullName: "Nurse Release Gate",
    role: "nursing",
    userType: UserType.TENANT_USER,
    membershipRole: MembershipRole.MEMBER,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
  },
  {
    key: "legal",
    email: "legal.release@wathiqcare.online",
    fullName: "Legal Release Gate",
    role: "legal_admin",
    userType: UserType.TENANT_ADMIN,
    membershipRole: MembershipRole.ADMIN,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
  },
  {
    key: "medicalDirector",
    email: "medical.director.release@wathiqcare.online",
    fullName: "Medical Director Release Gate",
    role: "medical_director",
    userType: UserType.TENANT_USER,
    membershipRole: MembershipRole.MEMBER,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
  },
  {
    key: "compliance",
    email: "compliance.release@wathiqcare.online",
    fullName: "Compliance Release Gate",
    role: "compliance",
    userType: UserType.TENANT_USER,
    membershipRole: MembershipRole.VIEWER,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/discharge-refusal"],
  },
  {
    key: "finance",
    email: "finance.release@wathiqcare.online",
    fullName: "Finance Release Gate",
    role: "finance_officer",
    userType: UserType.TENANT_USER,
    membershipRole: MembershipRole.ADMIN,
    expectedRedirect: "/modules",
    allowedModules: ["/modules/promissory-notes"],
  },
];

const report = {
  name: "WathiqCare Production Release Gate",
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  steps: [],
  warnings: [],
  browserFindings: [],
  apiFailures: [],
  artifacts: {},
};

const ALL_MODULE_ROUTES = [
  "/modules/informed-consents",
  "/modules/promissory-notes",
  "/modules/discharge-refusal",
];

const MODULE_ROUTE_COVERAGE = {
  "/modules/informed-consents": [
    "/modules/informed-consents",
    "/modules/informed-consents/create",
    "/modules/informed-consents/list",
    "/modules/informed-consents/archive",
  ],
  "/modules/promissory-notes": [
    "/modules/promissory-notes",
    "/modules/promissory-notes/create",
    "/modules/promissory-notes/list",
    "/modules/promissory-notes/archive",
  ],
  "/modules/discharge-refusal": [
    "/modules/discharge-refusal",
    "/modules/discharge-refusal/dashboard",
    "/modules/discharge-refusal/cases",
  ],
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
  loadEnvFile(path.join(root, "apps", "web", ".env"));
  loadEnvFile(path.join(root, "apps", "web", ".env.local"));
}

async function step(name, fn) {
  const started = performance.now();
  const entry = { name, ok: false, durationMs: null, data: null, error: null };
  report.steps.push(entry);
  try {
    const data = await fn();
    entry.ok = true;
    entry.data = data ?? null;
    entry.durationMs = Math.round(performance.now() - started);
    return data;
  } catch (error) {
    entry.ok = false;
    entry.error = error instanceof Error ? error.message : String(error);
    entry.durationMs = Math.round(performance.now() - started);
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseCookie(setCookie) {
  const raw = ((setCookie || "").split(",")[0] || "").split(";")[0] || "";
  const [name, ...rest] = raw.split("=");
  return { raw, name: name || SESSION_COOKIE_NAME, value: rest.join("=") };
}

async function apiJson(method, url, { body, cookie, redirect = "follow" } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (response.status >= 500) {
    report.apiFailures.push({ method, url, status: response.status, body: json });
  }
  return {
    status: response.status,
    ok: response.ok,
    text,
    json,
    headers: response.headers,
    setCookie: response.headers.get("set-cookie") || null,
  };
}

async function fetchText(url, { cookie, redirect = "follow" } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, { headers, redirect });
  const text = await response.text();
  return {
    status: response.status,
    text,
    headers: response.headers,
    redirected: response.redirected,
    url: response.url,
  };
}

async function login(email, password) {
  const response = await apiJson("POST", `${BASE_URL}/api/auth/password/login`, {
    body: { email, password },
  });
  assert(response.ok, `login failed for ${email}: ${response.status} ${response.text}`);
  const cookie = parseCookie(response.setCookie);
  assert(cookie.raw, `session cookie missing for ${email}`);
  return { response, cookie };
}

async function ensurePasswordResetSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NULL,
      reason TEXT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`);
}

async function createResetToken(userId) {
  await ensurePasswordResetSchema();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used)
    VALUES (${tokenId}, ${userId}, ${tokenHash}, ${expiresAt}, FALSE)
  `;
  return rawToken;
}

async function ensureRoleUsers() {
  await ensurePasswordResetSchema();

  const tenant = await prisma.tenant.findUnique({
    where: { code: "wathiqcare" },
    select: { id: true },
  });
  assert(tenant, "wathiqcare tenant not found");
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const ensured = {};
  for (const fixture of roleFixtures) {
    const user = await prisma.user.upsert({
      where: { email: fixture.email },
      update: {
        tenantId: tenant.id,
        fullName: fixture.fullName,
        role: fixture.role,
        userType: fixture.userType,
        status: "active",
        isActive: true,
        emailVerified: true,
        authProvider: "local_password",
        hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastPasswordChangedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        email: fixture.email,
        fullName: fixture.fullName,
        role: fixture.role,
        userType: fixture.userType,
        status: "active",
        isActive: true,
        emailVerified: true,
        authProvider: "local_password",
        hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastPasswordChangedAt: new Date(),
      },
      select: { id: true, email: true },
    });

    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {
        role: fixture.membershipRole,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: fixture.membershipRole,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = FALSE,
          session_revoked_at = NULL
      WHERE id = ${user.id}
    `;

    ensured[fixture.key] = { ...fixture, id: user.id, tenantId: tenant.id };
  }

  return ensured;
}

async function clearForcedResetState(email) {
  await ensurePasswordResetSchema();

  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
    WHERE email = ${String(email).toLowerCase()}
  `;
}

function buildCompleteCasePayload() {
  const now = new Date().toISOString();
  return {
    caseType: "DISCHARGE_REFUSAL",
    workflowType: "discharge-refusal",
    title: "Production release gate discharge refusal case",
    patientName: "Ahmed Release Gate / أحمد بوابة الإصدار",
    patientIdNumber: `RG-${Date.now()}`,
    medicalRecordNo: `MRN-RG-${Date.now()}`,
    roomNumber: "12B",
    metadata: {
      patient_mobile: "0551234567",
      patient_id_number: `RG-${Date.now()}`,
      room_number: "12B",
      insurance_coverage_status: "Covered with documented patient liability acknowledgment",
      financial_responsibility: "Patient accepted financial responsibility acknowledgment",
      workflow: {
        attending_physician: "Dr Release Physician",
        refusal_started_at: now,
        discharge_decision_at: now,
        patient_decision: "refuse",
        refusal_reason: "Patient requested discharge against advice after risks were explained.",
        discussion_summary: "Risks of deterioration and need for urgent return were explained in Arabic and English.",
        diagnosis: "Acute chest pain under medical observation",
      },
      signature: {
        patient_decision: "refuse",
        signer_name: "Ahmed Release Gate",
        signature: "patient-signature-release-gate",
        outcome: "refused",
      },
      witnesses: [
        {
          full_name: "Dr Clinical Witness",
          role: "doctor",
          role_category: "clinical",
          id_number: "DOC12345",
          mobile_number: "+966551111111",
          attestation_confirmed: true,
          attested_at: now,
          signature_hash: "clinical-witness-signature",
          signature_type: "DIGITAL_SIGNATURE",
          verification_status: "VERIFIED",
          identity_hash: "clinical-witness-hash",
          updated_at: now,
        },
        {
          full_name: "Admin Non Clinical Witness",
          role: "administrator",
          role_category: "non_clinical",
          id_number: "ADM12345",
          mobile_number: "+966552222222",
          attestation_confirmed: true,
          attested_at: now,
          signature_hash: "non-clinical-witness-signature",
          signature_type: "DIGITAL_SIGNATURE",
          verification_status: "VERIFIED",
          identity_hash: "non-clinical-witness-hash",
          updated_at: now,
        },
      ],
      staff_name: "Release Gate Operator",
      official_stamp: "WathiqCare Release Gate",
    },
  };
}

async function captureBrowserFindings(label, url, cookie, options = {}) {
  const browser = await chromium.launch({ headless: true });
  const findings = [];
  const context = await browser.newContext({
    viewport: options.viewport,
    isMobile: Boolean(options.isMobile),
    userAgent: options.userAgent,
  });
  if (cookie?.value) {
    await context.addCookies([
      {
        name: cookie.name || SESSION_COOKIE_NAME,
        value: cookie.value,
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }

  const page = await context.newPage();
  page.on("console", (msg) => {
    const consoleType = msg.type();
    const text = msg.text();
    const isGenericMissingResource404 = /Failed to load resource: the server responded with a status of 404 \(\)/i.test(text);
    const shouldCapture =
      (consoleType === "error" && !isGenericMissingResource404) ||
      (consoleType !== "info" && /hydration|unhandled/i.test(text)) ||
      ((consoleType === "warning" || consoleType === "warn") && /react/i.test(text));

    if (shouldCapture) {
      findings.push({ source: label, type: `console:${consoleType}`, text });
    }
  });
  page.on("pageerror", (error) => {
    findings.push({ source: label, type: "pageerror", text: String(error) });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(BASE_URL)) {
      findings.push({ source: label, type: "response", text: `${response.status()} ${response.url()}` });
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.reload({ waitUntil: "networkidle", timeout: 45000 });

  await context.close();
  await browser.close();

  report.browserFindings.push(...findings);
  return findings;
}

async function assertMobileLayout(label, url, cookie) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  if (cookie?.value) {
    await context.addCookies([
      {
        name: cookie.name || SESSION_COOKIE_NAME,
        value: cookie.value,
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body?.scrollWidth ?? 0,
  }));
  await context.close();
  await browser.close();
  assert(
    metrics.scrollWidth <= metrics.innerWidth + 4 && metrics.bodyScrollWidth <= metrics.innerWidth + 4,
    `mobile overflow detected for ${label}: ${JSON.stringify(metrics)}`,
  );
  return metrics;
}

async function main() {
  loadEnv();
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

  try {
    await clearForcedResetState("admin@wathiqcare.online");

    await step("Landing page branding and bilingual rendering", async () => {
      const englishLanding = await fetchText(`${BASE_URL}/en`);
      assert(englishLanding.status === 200, `english landing failed: ${englishLanding.status}`);
      assert(
        englishLanding.text.includes("Integrated Medico-Legal Engineering Platform for Healthcare Compliance Automation"),
        "english landing branding missing",
      );
      assert(englishLanding.text.includes("Informed Consents"), "english landing modules missing");

      const arabicLanding = await fetchText(`${BASE_URL}/ar`);
      assert(arabicLanding.status === 200, `arabic landing failed: ${arabicLanding.status}`);
      assert(arabicLanding.text.includes("منصة هندسة طبية قانونية متكاملة لأتمتة الامتثال الصحي"), "arabic landing branding missing");
      assert(arabicLanding.text.includes("الموافقات المستنيرة"), "arabic landing modules missing");

      const englishLogin = await fetchText(`${BASE_URL}/en/login`);
      const arabicLogin = await fetchText(`${BASE_URL}/ar/login`);
      assert(englishLogin.status === 200 && arabicLogin.status === 200, "localized login pages unavailable");
      return {
        englishLanding: true,
        arabicLanding: true,
        englishLogin: true,
        arabicLogin: true,
      };
    });

    const platform = await step("Platform login", async () => {
      const loginResult = await login("admin@wathiqcare.online", DEFAULT_PASSWORD);
      assert(loginResult.response.json?.redirectTo === "/modules", `expected /modules redirect, got ${loginResult.response.text}`);
      return { redirectTo: loginResult.response.json?.redirectTo, cookie: loginResult.cookie };
    });

    await step("Public login page stability", async () => {
      const findings = await captureBrowserFindings("login", `${BASE_URL}/login`);
      assert(findings.length === 0, `browser findings on login: ${JSON.stringify(findings)}`);
      return { checked: "/login" };
    });

    const users = await step("Ensure tenant role users", async () => ensureRoleUsers());

    const roleSessions = await step("Role module routing and RBAC", async () => {
      const sessions = {};
      for (const fixture of roleFixtures) {
        const session = await login(fixture.email, DEFAULT_PASSWORD);
        assert(
          session.response.json?.redirectTo === fixture.expectedRedirect,
          `expected ${fixture.expectedRedirect} for ${fixture.email}, got ${session.response.text}`,
        );
        const pageResponse = await fetchText(`${BASE_URL}${fixture.expectedRedirect}`, { cookie: session.cookie.raw });
        assert(pageResponse.status === 200, `module portal failed for ${fixture.email}: ${pageResponse.status}`);
        for (const allowedRoute of fixture.allowedModules) {
          for (const route of MODULE_ROUTE_COVERAGE[allowedRoute]) {
            const routeResponse = await fetchText(`${BASE_URL}${route}`, { cookie: session.cookie.raw });
            assert(routeResponse.status === 200, `allowed route failed for ${fixture.email}: ${route} => ${routeResponse.status}`);
          }
        }
        for (const forbiddenRoute of ALL_MODULE_ROUTES.filter((route) => !fixture.allowedModules.includes(route))) {
          const deniedResponse = await fetchText(`${BASE_URL}${forbiddenRoute}`, {
            cookie: session.cookie.raw,
            redirect: "manual",
          });
          assert(
            deniedResponse.status >= 300 && deniedResponse.status < 400,
            `forbidden route did not redirect for ${fixture.email}: ${forbiddenRoute} => ${deniedResponse.status}`,
          );
          assert(
            /\/modules$/.test(deniedResponse.headers.get("location") || ""),
            `forbidden route redirect target mismatch for ${fixture.email}: ${forbiddenRoute} => ${deniedResponse.headers.get("location")}`,
          );
        }
        sessions[fixture.key] = {
          cookie: session.cookie.raw,
          redirectTo: fixture.expectedRedirect,
          email: fixture.email,
          allowedModules: fixture.allowedModules,
        };
      }
      const platformPortal = await fetchText(`${BASE_URL}/modules`, { cookie: platform.cookie.raw });
      assert(platformPortal.status === 200, `platform module portal failed: ${platformPortal.status}`);
      for (const route of ALL_MODULE_ROUTES) {
        const routeResponse = await fetchText(`${BASE_URL}${route}`, { cookie: platform.cookie.raw });
        assert(routeResponse.status === 200, `platform route failed: ${route} => ${routeResponse.status}`);
      }
      return sessions;
    });

    await step("Mobile responsiveness", async () => {
      const loginMetrics = await assertMobileLayout("login-mobile", `${BASE_URL}/en/login`);
      const portalMetrics = await assertMobileLayout("modules-mobile", `${BASE_URL}/modules`, platform.cookie);
      return { login: loginMetrics, modules: portalMetrics };
    });

    const caseFlow = await step("Case creation and workspace interaction", async () => {
      const createResponse = await apiJson("POST", `${BASE_URL}/api/cases`, {
        cookie: roleSessions.tenantAdmin.cookie,
        body: buildCompleteCasePayload(),
      });
      assert(createResponse.status === 201, `case creation failed: ${createResponse.status} ${createResponse.text}`);
      const caseId = createResponse.json?.id;
      assert(caseId, "case id missing from create response");

      const readResponse = await apiJson("GET", `${BASE_URL}/api/cases/${caseId}`, {
        cookie: roleSessions.tenantAdmin.cookie,
      });
      assert(readResponse.status === 200, `case read failed: ${readResponse.status}`);

      const workspacePage = await apiJson("GET", `${BASE_URL}/cases/${caseId}/workspace-v2`, {
        cookie: roleSessions.tenantAdmin.cookie,
      });
      assert(workspacePage.status === 200, `workspace page failed: ${workspacePage.status}`);

      const findings = await captureBrowserFindings(
        "workspace",
        `${BASE_URL}/cases/${caseId}/workspace-v2`,
        parseCookie(roleSessions.tenantAdmin.cookie),
      );
      assert(findings.length === 0, `browser findings on workspace: ${JSON.stringify(findings)}`);

      return { caseId };
    });

    const otpFlow = await step("OTP lifecycle", async () => {
      const startResponse = await apiJson(
        "POST",
        `${BASE_URL}/api/discharge/cases/${caseFlow.caseId}/acknowledgment/start`,
        {
          cookie: roleSessions.tenantAdmin.cookie,
          body: {
            document_type: "discharge_refusal_form",
            method: "TABLET_SIGNATURE",
            payload: {
              patient_name: "Ahmed Release Gate",
              phone_number: "+966553333333",
            },
          },
        },
      );
      assert(startResponse.status === 200, `ack start failed: ${startResponse.status} ${startResponse.text}`);
      const sessionId = startResponse.json?.session_id;
      const otpCode = startResponse.json?.provider_result?.otp_debug_code;
      assert(sessionId && otpCode, `otp session incomplete: ${startResponse.text}`);

      const wrongResponse = await apiJson(
        "POST",
        `${BASE_URL}/api/discharge/cases/${caseFlow.caseId}/acknowledgment/${sessionId}/verify`,
        {
          cookie: roleSessions.tenantAdmin.cookie,
          body: { payload: { signature_payload: "sig", otp_code: "000000" } },
        },
      );
      assert(wrongResponse.status === 200 && wrongResponse.json?.verified === false, `wrong otp did not fail safely: ${wrongResponse.text}`);

      const verifyResponse = await apiJson(
        "POST",
        `${BASE_URL}/api/discharge/cases/${caseFlow.caseId}/acknowledgment/${sessionId}/verify`,
        {
          cookie: roleSessions.tenantAdmin.cookie,
          body: { payload: { signature_payload: "sig", otp_code: otpCode, device: "release-gate" } },
        },
      );
      assert(verifyResponse.status === 200 && verifyResponse.json?.verified === true, `otp verify failed: ${verifyResponse.text}`);
      return { sessionId };
    });

    const secureFlow = await step("Secure link and public refusal flow", async () => {
      const linkResponse = await apiJson("POST", `${BASE_URL}/api/discharge/cases/${caseFlow.caseId}/secure-link`, {
        cookie: roleSessions.tenantAdmin.cookie,
        body: { recipient_email: "family@example.com" },
      });
      assert(linkResponse.status === 200, `secure link create failed: ${linkResponse.status} ${linkResponse.text}`);
      const secureUrl = linkResponse.json?.url;
      assert(secureUrl, `secure link url missing: ${linkResponse.text}`);
      const publicFindings = await captureBrowserFindings("public-secure", secureUrl);
      assert(publicFindings.length === 0, `browser findings on secure page: ${JSON.stringify(publicFindings)}`);

      const token = String(secureUrl).split("/secure/")[1];
      const publicGet = await apiJson("GET", `${BASE_URL}/api/discharge/secure/${token}`);
      assert(publicGet.status === 200, `secure public fetch failed: ${publicGet.status}`);

      const publicDecision = await apiJson("POST", `${BASE_URL}/api/discharge/secure/${token}/decision`, {
        body: {
          decision: "refuse",
          typed_name: "ولي الأمر أحمد",
          refusal_acknowledged: true,
          signature_data: "release-gate-signature",
        },
      });
      assert(publicDecision.status === 200, `secure public decision failed: ${publicDecision.status} ${publicDecision.text}`);
      return { secureUrl };
    });

    const auditChecks = await step("Signature and audit persistence", async () => {
      const auditLog = await prisma.auditLog.findMany({
        where: { caseId: caseFlow.caseId },
        select: { action: true },
        orderBy: { createdAt: "asc" },
      });
      const auditChain = await prisma.auditChainEvent.findMany({
        where: { caseId: caseFlow.caseId },
        select: { eventType: true },
        orderBy: { createdAt: "asc" },
      });
      const signatureRecord = await prisma.dischargeRefusalCase.findFirst({
        where: { caseId: caseFlow.caseId },
        select: { signatureMethod: true, signatureTimestamp: true, signatureHash: true },
      });

      const auditActions = auditLog.map((entry) => entry.action);
      const chainEvents = auditChain.map((entry) => entry.eventType);
      const requiredActions = [
        "secure_link_created",
        "public_secure_refusal_submitted",
        "public_secure_patient_acknowledged",
        "public_secure_signature_submitted",
        "public_secure_decision_recorded",
        "acknowledgment_verified",
      ];
      const requiredEvents = [
        "SECURE_LINK_CREATED",
        "PUBLIC_SECURE_REFUSAL_SUBMITTED",
        "PUBLIC_SECURE_PATIENT_ACKNOWLEDGED",
        "PUBLIC_SECURE_SIGNATURE_SUBMITTED",
        "PUBLIC_SECURE_DECISION_RECORDED",
      ];

      assert(requiredActions.every((action) => auditActions.includes(action)), `missing audit actions: ${JSON.stringify(auditActions)}`);
      assert(requiredEvents.every((event) => chainEvents.includes(event)), `missing audit chain events: ${JSON.stringify(chainEvents)}`);
      assert(signatureRecord?.signatureHash, "signature record not persisted");

      return { auditActions, chainEvents, signatureMethod: signatureRecord?.signatureMethod || null };
    });

    const pdfFlow = await step("Arabic and English PDF generation and download", async () => {
      const english = await apiJson("POST", `${BASE_URL}/api/cases/${caseFlow.caseId}/generate-pdf`, {
        cookie: roleSessions.tenantAdmin.cookie,
        body: { mode: "final", language: "en" },
      });
      assert(english.status === 201, `english pdf generation failed: ${english.status} ${english.text}`);
      const englishVersion = english.json?.report?.version;
      assert(englishVersion, "english pdf version missing");

      const arabic = await apiJson("POST", `${BASE_URL}/api/cases/${caseFlow.caseId}/generate-pdf`, {
        cookie: roleSessions.tenantAdmin.cookie,
        body: { mode: "final", language: "ar", regenerate: true },
      });
      assert(arabic.status === 201, `arabic pdf generation failed: ${arabic.status} ${arabic.text}`);
      const arabicVersion = arabic.json?.report?.version;
      assert(arabicVersion, "arabic pdf version missing");

      const englishDownload = await fetch(`${BASE_URL}/api/cases/${caseFlow.caseId}/pdf/${englishVersion}/download`, {
        headers: { cookie: roleSessions.tenantAdmin.cookie },
      });
      assert(englishDownload.status === 200, `english download failed: ${englishDownload.status}`);
      const englishBuffer = Buffer.from(await englishDownload.arrayBuffer());
      assert(englishBuffer.byteLength > 0, "english pdf download empty");

      const arabicDownload = await fetch(`${BASE_URL}/api/cases/${caseFlow.caseId}/pdf/${arabicVersion}/download`, {
        headers: { cookie: roleSessions.tenantAdmin.cookie },
      });
      assert(arabicDownload.status === 200, `arabic download failed: ${arabicDownload.status}`);
      const arabicBuffer = Buffer.from(await arabicDownload.arrayBuffer());
      assert(arabicBuffer.byteLength > 0, "arabic pdf download empty");

      return {
        englishVersion,
        arabicVersion,
        englishBytes: englishBuffer.byteLength,
        arabicBytes: arabicBuffer.byteLength,
      };
    });

    const legalPackage = await step("Legal package generation and download metadata", async () => {
      const response = await apiJson("POST", `${BASE_URL}/api/cases/${caseFlow.caseId}/legal-package/generate`, {
        cookie: roleSessions.tenantAdmin.cookie,
      });
      assert(response.status === 200, `legal package generation failed: ${response.status} ${response.text}`);
      assert(response.json?.package_status === "GENERATED", `unexpected legal package status: ${response.text}`);
      assert(Array.isArray(response.json?.documents) && response.json.documents.length === 6, `unexpected legal package documents: ${response.text}`);

      const metadata = await apiJson("GET", `${BASE_URL}/api/cases/${caseFlow.caseId}/legal-package`, {
        cookie: roleSessions.tenantAdmin.cookie,
      });
      assert(metadata.status === 200, `legal package metadata failed: ${metadata.status}`);
      return { packageStatus: response.json?.package_status, documents: response.json?.documents?.length || 0 };
    });

    await step("Forced password reset", async () => {
      const forceReset = await apiJson("POST", `${BASE_URL}/api/platform/users/force-password-reset-all`, {
        cookie: platform.cookie.raw,
        body: {
          reason: "Production release gate validation",
          includeInactiveUsers: false,
          clearPasswordHashes: false,
        },
      });
      assert(forceReset.status === 200, `force reset failed: ${forceReset.status} ${forceReset.text}`);

      const flaggedLogin = await apiJson("POST", `${BASE_URL}/api/auth/password/login`, {
        body: { email: roleFixtures[1].email, password: DEFAULT_PASSWORD },
      });
      assert(flaggedLogin.status === 200, `forced reset login did not return success envelope: ${flaggedLogin.status} ${flaggedLogin.text}`);
      assert(flaggedLogin.json?.mustChangePassword === true, `mustChangePassword not set: ${flaggedLogin.text}`);
      const firstLoginCookie = parseCookie(flaggedLogin.setCookie);
      const firstLoginPage = await fetchText(`${BASE_URL}/first-login`, { cookie: firstLoginCookie.raw });
      assert(firstLoginPage.status === 200, `first login page failed: ${firstLoginPage.status}`);
      assert(/Set Your Password|تغيير كلمة المرور الأولي/.test(firstLoginPage.text), "first login page copy missing");

      const resetToken = await createResetToken(users.doctor.id);
      const confirmReset = await apiJson("POST", `${BASE_URL}/api/auth/password/reset-confirm`, {
        body: { token: resetToken, password: RESET_PASSWORD },
      });
      assert(confirmReset.status === 200, `reset confirm failed: ${confirmReset.status} ${confirmReset.text}`);

      const postResetLogin = await login(roleFixtures[1].email, RESET_PASSWORD);
      assert(postResetLogin.response.json?.redirectTo === roleFixtures[1].expectedRedirect, `post reset redirect mismatch: ${postResetLogin.response.text}`);
      return {
        processed: forceReset.json?.processed || null,
        emailFailed: forceReset.json?.emailFailed || 0,
        firstLoginPage: true,
      };
    });

    await step("Logout and session cleanup", async () => {
      const logoutTenant = await apiJson("POST", `${BASE_URL}/api/auth/logout`, {
        cookie: roleSessions.tenantAdmin.cookie,
      });
      assert(logoutTenant.status === 200, `tenant logout failed: ${logoutTenant.status}`);

      const afterLogout = await apiJson("GET", `${BASE_URL}/api/cases?limit=1`);
      assert(afterLogout.status === 401 || afterLogout.status === 403, `expected auth failure after logout, got ${afterLogout.status}`);

      const logoutPlatform = await apiJson("POST", `${BASE_URL}/api/auth/logout`, {
        cookie: platform.cookie.raw,
      });
      assert(logoutPlatform.status === 200, `platform logout failed: ${logoutPlatform.status}`);
      return { tenantLogout: true, platformLogout: true };
    });

    report.artifacts = {
      caseId: caseFlow.caseId,
      secureUrl: secureFlow.secureUrl,
      otpSessionId: otpFlow.sessionId,
      audit: auditChecks,
      pdf: pdfFlow,
      legalPackage,
    };
    report.finishedAt = new Date().toISOString();
    report.success = true;
    report.summary = "Production-like release gate passed";
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.success = false;
    report.summary = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    throw error;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ reportPath: REPORT_PATH, success: report.success, summary: report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
