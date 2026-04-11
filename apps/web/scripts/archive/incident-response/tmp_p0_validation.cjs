const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const BASE_URL = (process.env.WATHIQ_BASE_URL || "https://wathiqcare.online").replace(/\/$/, "");
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "wathiqcare_access_token";
const JWT_SECRET = (process.env.JWT_SECRET_KEY || "").trim();
const JWT_ISSUER = (process.env.JWT_ISSUER || "wathiqcare").trim() || "wathiqcare";

if (!JWT_SECRET) {
  console.error("FAIL: JWT_SECRET_KEY is not configured");
  process.exit(1);
}

const prisma = new PrismaClient();

function signJwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(JSON.stringify({ ...claims, iss: JWT_ISSUER, exp })).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function callApi({ method = "GET", path, token, body, expectStatus }) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers = {
    Cookie: `${AUTH_COOKIE}=${token}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (expectStatus && response.status !== expectStatus) {
    throw new Error(`Expected ${expectStatus} for ${method} ${path}, got ${response.status}. Body=${text.slice(0, 300)}`);
  }

  return { status: response.status, text, json };
}

async function callPage(path, token) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `${AUTH_COOKIE}=${token}`,
    },
    redirect: "manual",
  });

  const html = await response.text();
  if (response.status >= 500) {
    throw new Error(`Page ${path} returned ${response.status}`);
  }
  if (!html || html.trim().length < 50) {
    throw new Error(`Page ${path} returned blank/too-small body`);
  }
  const lowered = html.toLowerCase();
  if (lowered.includes("internal server error") || lowered.includes("application error")) {
    throw new Error(`Page ${path} rendered server error text`);
  }

  return response.status;
}

(async () => {
  const suffix = Date.now().toString(36);
  const tenantCode = `P0-${suffix}`.toUpperCase();
  const tenantName = `P0 Validation ${suffix}`;
  const ownerEmail = `owner.${suffix}@wathiqcare.med.sa`;

  const checks = [];

  try {
    const platformUser = await prisma.user.findFirst({
      where: {
        OR: [{ userType: "PLATFORM_ADMIN" }, { role: "platform_admin" }, { role: "platform_superadmin" }],
      },
      include: { primaryTenant: true },
    });

    if (!platformUser) {
      throw new Error("No platform admin user found in DB");
    }

    const platformToken = signJwt({
      sub: platformUser.id,
      email: platformUser.email,
      role: platformUser.role,
      user_type: "platform_admin",
      tenant_id: platformUser.tenantId || undefined,
      tenant_code: platformUser.primaryTenant?.code || undefined,
      platform_role: "platform_admin",
    });

    await callApi({ method: "GET", path: "/api/auth/me", token: platformToken, expectStatus: 200 });
    checks.push("session/auth/me for platform admin");

    await callApi({ method: "GET", path: "/api/admin/setup/status", token: platformToken, expectStatus: 200 });
    checks.push("admin setup status API");

    await callApi({ method: "GET", path: "/api/tenants?limit=20", token: platformToken, expectStatus: 200 });
    await callApi({ method: "GET", path: "/api/subscription/summary", token: platformToken, expectStatus: 200 });
    await callApi({ method: "GET", path: "/api/billing/invoices?limit=10", token: platformToken, expectStatus: 200 });
    checks.push("admin APIs without 500");

    const createdTenantRes = await callApi({
      method: "POST",
      path: "/api/tenants",
      token: platformToken,
      expectStatus: 201,
      body: {
        name: tenantName,
        code: tenantCode,
        billingEmail: `billing.${suffix}@wathiqcare.med.sa`,
        initialOwner: {
          email: ownerEmail,
          fullName: `Owner ${suffix}`,
          role: "tenant_admin",
        },
        subscription: {
          planCode: "PROFESSIONAL",
          billingInterval: "MONTHLY",
          status: "ACTIVE",
          seatLimit: 12,
        },
      },
    });

    const createdTenantId = createdTenantRes?.json?.id;
    if (!createdTenantId) {
      throw new Error("Tenant was created but response missing tenant id");
    }
    checks.push("tenant creation success");

    await callApi({
      method: "PATCH",
      path: `/api/tenants/${createdTenantId}/subscription`,
      token: platformToken,
      expectStatus: 200,
      body: {
        planCode: "PROFESSIONAL",
        billingInterval: "MONTHLY",
        status: "ACTIVE",
        seatLimit: 15,
      },
    });
    checks.push("subscription update success");

    const ownerUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
      include: { primaryTenant: true },
    });

    if (!ownerUser) {
      throw new Error("Initial owner user was not created");
    }

    const tenantToken = signJwt({
      sub: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
      user_type: "tenant_admin",
      tenant_id: createdTenantId,
      tenant_code: ownerUser.primaryTenant?.code || tenantCode,
      platform_role: null,
    });

    for (let i = 0; i < 5; i += 1) {
      await callApi({ method: "GET", path: "/api/auth/me", token: tenantToken, expectStatus: 200 });
      await callApi({ method: "GET", path: "/api/operations/dashboard", token: tenantToken, expectStatus: 200 });
    }
    checks.push("dashboard/session stability loop (no forced logout)");

    const caseRes = await callApi({
      method: "POST",
      path: "/api/cases",
      token: tenantToken,
      expectStatus: 201,
      body: {
        caseNumber: `P0-CASE-${suffix}`,
        caseType: "GENERAL",
        status: "OPEN",
        workflowType: "discharge_refusal",
        title: `P0 workflow ${suffix}`,
        patientName: "P0 Patient",
        patientIdNumber: `900${suffix.slice(-6).padStart(6, "0")}`,
        medicalRecordNo: `MRN-${suffix}`,
        roomNumber: "P0-101",
        metadata: { p0_validation: true },
      },
    });

    const caseId = caseRes?.json?.id;
    if (!caseId) {
      throw new Error("Case creation succeeded but case id is missing");
    }

    const secureRes = await callApi({
      method: "POST",
      path: `/api/discharge/cases/${caseId}/secure-link`,
      token: tenantToken,
      expectStatus: 200,
      body: {
        recipient_email: ownerEmail,
      },
    });

    const secureUrl = secureRes?.json?.url;
    if (!secureUrl || typeof secureUrl !== "string") {
      throw new Error("Secure link url missing from response");
    }

    await callApi({
      method: "GET",
      path: `/api/discharge/cases/${caseId}/secure-link/diagnostics`,
      token: tenantToken,
      expectStatus: 200,
    });

    const publicToken = secureUrl.split("/").pop();
    if (!publicToken) {
      throw new Error("Could not parse secure-link token");
    }

    await callApi({
      method: "POST",
      path: `/api/discharge/secure/${publicToken}/decision`,
      token: tenantToken,
      expectStatus: 200,
      body: {
        decision: "refuse",
        typed_name: `P0 ${suffix}`,
        refusal_acknowledged: true,
      },
    });

    await callApi({ method: "GET", path: `/api/cases/${caseId}/documents`, token: tenantToken, expectStatus: 200 });
    await callApi({ method: "GET", path: `/api/cases/${caseId}/audit-log`, token: tenantToken, expectStatus: 200 });
    checks.push("workflow end-to-end from case creation to public decision and artifacts");

    const tenantPages = ["/dashboard", "/cases", "/cases/new", "/operations"];
    for (const path of tenantPages) {
      await callPage(path, tenantToken);
    }

    const adminPages = ["/platform", "/platform/tenants", "/platform/users", "/platform/health"];
    for (const path of adminPages) {
      await callPage(path, platformToken);
    }
    checks.push("core pages open and no blank/error screen indicators");

    console.log("VALIDATION_PASS");
    for (const item of checks) {
      console.log(`PASS: ${item}`);
    }
    console.log(`CREATED_TENANT_ID=${createdTenantId}`);
    console.log(`CREATED_CASE_ID=${caseId}`);
  } catch (error) {
    console.error("VALIDATION_FAIL");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
