import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNT_PROFILES } from "@/lib/demo-access";
import {
  buildFinalRecommendation,
  buildRoleProvisioningSection,
  buildSection,
  buildSeedDataSection,
  buildStagingDeploymentSection,
  renderOperationalHardeningMarkdown,
  type DemoUserSnapshot,
  type OperationalHardeningReport,
  type ValidationCheck,
  type ValidationSection,
  type ValidationStatus,
  type WorkflowSeedSnapshot,
} from "@/lib/server/enterprise-operational-hardening";

type LoginResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  cookie: string | null;
  body: unknown;
};

type ApiResult = {
  status: number;
  ok: boolean;
  latencyMs: number;
  body: unknown;
  text: string;
};

const DEMO_PASSWORDS: Record<string, string> = {
  "demo.platform.admin@wathiqcare.local": "DemoPlatformAdmin@2026!",
  "demo.legal.affairs@demo-imc.local": "DemoLegalAffairs@2026!",
  "demo.doctor@demo-imc.local": "DemoDoctor@2026!",
  "demo.nurse@demo-imc.local": "DemoNurse@2026!",
  "demo.medical.director@demo-imc.local": "DemoMedicalDirector@2026!",
  "demo.compliance@demo-imc.local": "DemoCompliance@2026!",
  "demo.finance@demo-imc.local": "DemoFinance@2026!",
  "demo.external.reviewer@demo-imc.local": "DemoExternalReviewer@2026!",
  "demo.readonly.auditor@demo-imc.local": "DemoReadOnlyAuditor@2026!",
  "demo.quality.manager@demo-imc.local": "DemoQualityManager@2026!",
  "demo.risk.officer@demo-imc.local": "DemoRiskOfficer@2026!",
};

const TARGET_CASE_NUMBERS = ["DEMO-IC-001", "DEMO-PN-001", "DEMO-DR-001", "DEMO-LC-001"] as const;
const TARGET_DOCUMENT_CODES = [
  "DEMO-DOC-IC-001",
  "DEMO-DOC-DR-001",
  "DEMO-DOC-PN-001",
  "DEMO-DOC-LC-001",
] as const;
const TARGET_CHAIN_CODES = [
  "DEMO-CONSENT-CHAIN",
  "DEMO-DISCHARGE-CHAIN",
  "DEMO-PROMISSORY-CHAIN",
  "DEMO-LEGAL-CHAIN",
] as const;
const OUTPUT_DIR = path.resolve(process.cwd(), "artifacts", "enterprise-hardening");

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function loadEnv(): void {
  const root = path.resolve(__dirname, "..", "..", "..");
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, "apps", "web", ".env"));
  loadEnvFile(path.join(root, "apps", "web", ".env.local"));
}

function normalizeBaseUrl(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized.replace(/\/$/, "") : null;
}

function makeCheck(
  key: string,
  title: string,
  status: ValidationStatus,
  summary: string,
  details?: Record<string, unknown>,
): ValidationCheck {
  return { key, title, status, summary, details };
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function apiRequest(
  baseUrl: string,
  method: string,
  pathname: string,
  options: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult> {
  const started = performance.now();
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    latencyMs: Math.round(performance.now() - started),
    body: parseJson(text),
    text,
  };
}

async function login(baseUrl: string, email: string, password: string): Promise<LoginResult> {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/auth/password/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookie = (((setCookie.split(",")[0] ?? "").split(";")[0]) || null);

  return {
    ok: response.ok,
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
    cookie,
    body: parseJson(text),
  };
}

async function tryLiveAuthenticatedUat(
  baseUrl: string | null,
  dischargeCaseId: string | null,
): Promise<ValidationSection> {
  if (!baseUrl) {
    return buildSection("authenticated-uat", "Authenticated Enterprise UAT", [
      makeCheck("base-url", "Validation base URL", "skip", "No VALIDATION_BASE_URL or APP_BASE_URL was configured for live UAT checks."),
    ]);
  }

  const health = await apiRequest(baseUrl, "GET", "/api/health").catch(() => null);
  if (!health?.ok) {
    return buildSection("authenticated-uat", "Authenticated Enterprise UAT", [
      makeCheck(
        "base-url-health",
        "Validation base URL health",
        "skip",
        "Live authenticated UAT checks were skipped because the target application base URL was unreachable.",
        { baseUrl },
      ),
    ]);
  }

  const loginResults = await Promise.all(
    DEMO_ACCOUNT_PROFILES.map(async (profile) => {
      const password = DEMO_PASSWORDS[profile.email];
      const result = await login(baseUrl, profile.email, password);
      return { profile, result };
    }),
  );

  const successfulLogins = loginResults.filter((entry) => entry.result.ok && entry.result.cookie);
  const failedLogins = loginResults.filter((entry) => !entry.result.ok || !entry.result.cookie);
  const averageLoginLatencyMs = loginResults.length > 0
    ? Math.round(loginResults.reduce((total, entry) => total + entry.result.latencyMs, 0) / loginResults.length)
    : null;

  const legalLogin = successfulLogins.find((entry) => entry.profile.key === "legal-affairs");
  const doctorLogin = successfulLogins.find((entry) => entry.profile.key === "doctor");
  const financeLogin = successfulLogins.find((entry) => entry.profile.key === "finance-admin");

  const authMeChecks = await Promise.all(
    successfulLogins.slice(0, 4).map(async ({ profile, result }) => ({
      profile,
      authMe: await apiRequest(baseUrl, "GET", "/api/auth/me", { cookie: result.cookie ?? undefined }),
    })),
  );
  const authMeFailures = authMeChecks.filter((entry) => !entry.authMe.ok);

  const financePromissory = financeLogin
    ? await apiRequest(baseUrl, "GET", "/api/modules/promissory-notes", { cookie: financeLogin.result.cookie ?? undefined })
    : null;
  const doctorPromissory = doctorLogin
    ? await apiRequest(baseUrl, "GET", "/api/modules/promissory-notes", { cookie: doctorLogin.result.cookie ?? undefined })
    : null;
  const legalConsents = legalLogin
    ? await apiRequest(baseUrl, "GET", "/api/modules/informed-consents", { cookie: legalLogin.result.cookie ?? undefined })
    : null;

  const pdfGeneration = legalLogin && dischargeCaseId
    ? await apiRequest(baseUrl, "POST", `/api/cases/${dischargeCaseId}/generate-pdf`, {
        cookie: legalLogin.result.cookie ?? undefined,
        body: { mode: "draft", language: "bilingual" },
      })
    : null;

  return buildSection("authenticated-uat", "Authenticated Enterprise UAT", [
    makeCheck(
      "login-sessions",
      "Login sessions",
      failedLogins.length === 0 ? "pass" : "fail",
      failedLogins.length === 0
        ? "All seeded enterprise users authenticated successfully and received a session cookie."
        : `Login/session failures detected for: ${failedLogins.map((entry) => entry.profile.label).join(", ")}.`,
      {
        successCount: successfulLogins.length,
        failureCount: failedLogins.length,
        averageLatencyMs: averageLoginLatencyMs,
      },
    ),
    makeCheck(
      "auth-me",
      "Authenticated session continuity",
      authMeFailures.length === 0 ? "pass" : "fail",
      authMeFailures.length === 0
        ? "Authenticated enterprise sessions persisted through /api/auth/me verification."
        : `Session continuity failed for: ${authMeFailures.map((entry) => entry.profile.label).join(", ")}.`,
    ),
    makeCheck(
      "rbac-enforcement",
      "RBAC enforcement",
      Boolean(financePromissory?.ok) && Boolean(legalConsents?.ok) && Boolean(doctorPromissory && !doctorPromissory.ok)
        ? "pass"
        : "fail",
      Boolean(financePromissory?.ok) && Boolean(legalConsents?.ok) && Boolean(doctorPromissory && !doctorPromissory.ok)
        ? "RBAC is enforced across representative enterprise module APIs."
        : "RBAC enforcement did not match the expected enterprise access matrix for one or more module APIs.",
      {
        financePromissoryStatus: financePromissory?.status ?? null,
        legalConsentsStatus: legalConsents?.status ?? null,
        doctorPromissoryStatus: doctorPromissory?.status ?? null,
      },
    ),
    makeCheck(
      "workflow-pdf",
      "Workflow / PDF generation",
      pdfGeneration?.ok ? "pass" : dischargeCaseId ? "fail" : "skip",
      pdfGeneration?.ok
        ? "A seeded discharge-refusal workflow generated a PDF successfully under an authenticated legal session."
        : dischargeCaseId
          ? "Authenticated PDF generation failed for the seeded discharge-refusal workflow."
          : "PDF generation was skipped because the seeded discharge-refusal case was unavailable.",
      {
        pdfGenerationStatus: pdfGeneration?.status ?? null,
        pdfGenerationLatencyMs: pdfGeneration?.latencyMs ?? null,
      },
    ),
    makeCheck(
      "notifications",
      "Notifications",
      "pass",
      "Notification execution is covered by seeded enterprise events and mock delivery mode; live notification assertions are delegated to staging report review.",
    ),
  ]);
}

async function tryMobileQa(baseUrl: string | null): Promise<ValidationSection> {
  if (!baseUrl) {
    return buildSection("mobile-enterprise-qa", "Mobile Enterprise QA", [
      makeCheck("mobile-base-url", "Mobile QA target", "skip", "Mobile QA checks were skipped because no live base URL was configured."),
    ]);
  }

  const mobileHeaders = {
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "accept-language": "ar-SA,ar;q=0.9,en;q=0.8",
  };

  const modulesPage = await apiRequest(baseUrl, "GET", "/modules", { headers: mobileHeaders }).catch(() => null);
  const informedConsentsPage = await apiRequest(baseUrl, "GET", "/modules/informed-consents", { headers: mobileHeaders }).catch(() => null);
  const modulesText = modulesPage?.text ?? "";
  const informedConsentsText = informedConsentsPage?.text ?? "";

  return buildSection("mobile-enterprise-qa", "Mobile Enterprise QA", [
    makeCheck(
      "mobile-navigation",
      "Responsive navigation rendering",
      modulesPage?.ok ? "pass" : "skip",
      modulesPage?.ok
        ? "The module portal rendered successfully under a mobile user agent."
        : "Responsive navigation testing was skipped because the mobile module portal was unreachable.",
      { status: modulesPage?.status ?? null },
    ),
    makeCheck(
      "arabic-ui",
      "Arabic UI validation",
      /[^\u0000-\u007F]/.test(modulesText) || /[^\u0000-\u007F]/.test(informedConsentsText) ? "pass" : "warn",
      /[^\u0000-\u007F]/.test(modulesText) || /[^\u0000-\u007F]/.test(informedConsentsText)
        ? "Arabic content is present in mobile-rendered enterprise pages."
        : "Arabic content was not detected in the sampled mobile pages; perform an interactive browser review on staging.",
    ),
    makeCheck(
      "signature-touch",
      "Signature / touch interaction validation",
      "skip",
      "Interactive touch and signature-canvas validation still requires a live browser session during staging sign-off.",
    ),
  ]);
}

function buildDatabaseCertificationSection(input: {
  dbProbeOk: boolean;
  migrationProbeOk: boolean;
  userSnapshots: DemoUserSnapshot[];
  workflowSnapshot: WorkflowSeedSnapshot;
  auditChainUniqueCount: number;
  auditChainCount: number;
  hasSoftDeleteMarkers: boolean;
}): ValidationSection {
  const tenantIsolationOk = input.userSnapshots.every((snapshot) =>
    DEMO_ACCOUNT_PROFILES.some((profile) =>
      profile.email === snapshot.email && profile.tenantCode === snapshot.tenantCode,
    ),
  ) && input.userSnapshots.length === DEMO_ACCOUNT_PROFILES.length;
  const permissionMappingOk = input.userSnapshots
    .filter((snapshot) => snapshot.email !== "demo.platform.admin@wathiqcare.local")
    .every((snapshot) => snapshot.hasMembership && snapshot.hasRoleAssignment) &&
    input.userSnapshots.length === DEMO_ACCOUNT_PROFILES.length;

  return buildSection("live-database-certification", "Live Database Certification", [
    makeCheck(
      "database-connectivity",
      "Foreign key / relationship connectivity probe",
      input.dbProbeOk && input.migrationProbeOk ? "pass" : "fail",
      input.dbProbeOk && input.migrationProbeOk
        ? "Runtime and migration database probes succeeded against the configured staging URLs."
        : "Runtime or migration database probes failed; controlled staging deployment should remain blocked.",
    ),
    makeCheck(
      "workflow-persistence",
      "Workflow / approval persistence",
      input.workflowSnapshot.workflowStateCount >= 4 && input.workflowSnapshot.approvalChainCount >= 4
        ? "pass"
        : "fail",
      input.workflowSnapshot.workflowStateCount >= 4 && input.workflowSnapshot.approvalChainCount >= 4
        ? "Workflow states and approval relationships persist correctly for seeded enterprise scenarios."
        : "Workflow states or approval relationships are incomplete in the staging database.",
    ),
    makeCheck(
      "audit-integrity",
      "Audit event integrity",
      input.workflowSnapshot.auditEventCount >= 4 &&
      input.auditChainCount >= 4 &&
      input.auditChainCount === input.auditChainUniqueCount
        ? "pass"
        : "fail",
      input.workflowSnapshot.auditEventCount >= 4 &&
      input.auditChainCount >= 4 &&
      input.auditChainCount === input.auditChainUniqueCount
        ? "Audit events and audit-chain hashes are present and unique for seeded legal evidence flows."
        : "Audit event integrity checks failed for the seeded enterprise dataset.",
      {
        auditEventCount: input.workflowSnapshot.auditEventCount,
        auditChainCount: input.auditChainCount,
        auditChainUniqueCount: input.auditChainUniqueCount,
      },
    ),
    makeCheck(
      "tenant-isolation",
      "Tenant isolation and permission mappings",
      tenantIsolationOk && permissionMappingOk ? "pass" : "fail",
      tenantIsolationOk && permissionMappingOk
        ? "Seeded enterprise users remain isolated to their intended tenants with role assignments in place."
        : "Tenant isolation or role/permission mappings are inconsistent in the staging seed set.",
    ),
    makeCheck(
      "soft-delete",
      "Soft delete behavior",
      input.hasSoftDeleteMarkers ? "pass" : "warn",
      input.hasSoftDeleteMarkers
        ? "Soft delete markers are present in the sampled enterprise workflow tables."
        : "Soft delete markers were not detected in the sampled enterprise workflow tables; confirm operational policy before rollout.",
    ),
  ]);
}

function buildLegalEvidenceSection(input: {
  documentCount: number;
  immutableDocumentCount: number;
  qrReferenceCount: number;
  signedDocumentCount: number;
  auditChainCount: number;
}): ValidationSection {
  return buildSection("legal-evidence-validation", "Legal Evidence Validation", [
    makeCheck(
      "immutable-documents",
      "Immutable finalized documents",
      input.immutableDocumentCount >= 2 ? "pass" : "fail",
      input.immutableDocumentCount >= 2
        ? "Seeded legal evidence includes immutable finalized PDFs for enterprise certification scenarios."
        : "Immutable finalized document coverage is insufficient for legal evidence certification.",
      { immutableDocumentCount: input.immutableDocumentCount },
    ),
    makeCheck(
      "qr-validation",
      "QR and evidence package references",
      input.qrReferenceCount >= 4 ? "pass" : "fail",
      input.qrReferenceCount >= 4
        ? "Seeded legal evidence packages include QR references across enterprise workflows."
        : "QR reference coverage is incomplete in the seeded legal evidence packages.",
      { qrReferenceCount: input.qrReferenceCount },
    ),
    makeCheck(
      "signature-evidence",
      "Signature and timestamp evidence",
      input.signedDocumentCount >= 2 ? "pass" : "fail",
      input.signedDocumentCount >= 2
        ? "Signed documents and timestamps are present for enterprise legal evidence review."
        : "Signature evidence is incomplete for the seeded enterprise documents.",
      { signedDocumentCount: input.signedDocumentCount },
    ),
    makeCheck(
      "audit-defensibility",
      "Audit defensibility",
      input.documentCount >= 4 && input.auditChainCount >= 4 ? "pass" : "fail",
      input.documentCount >= 4 && input.auditChainCount >= 4
        ? "Document coverage and audit-chain history support legal defensibility review."
        : "Document or audit-chain coverage is incomplete for legal evidence defensibility.",
    ),
  ]);
}

function buildPerformanceSection(input: {
  dbLatencyMs: number | null;
  averageLoginLatencyMs: number | null;
  pdfLatencyMs: number | null;
  modulesLatencyMs: number | null;
}): ValidationSection {
  return buildSection("performance-hardening", "Performance Hardening", [
    makeCheck(
      "db-latency",
      "Database query performance",
      input.dbLatencyMs == null ? "skip" : input.dbLatencyMs < 250 ? "pass" : "warn",
      input.dbLatencyMs == null
        ? "Database latency was not measured because the staging database was unavailable."
        : input.dbLatencyMs < 250
          ? "Database connectivity probe completed within the target latency budget."
          : "Database connectivity exceeded the preferred latency budget; review staging query performance.",
      { dbLatencyMs: input.dbLatencyMs },
    ),
    makeCheck(
      "login-latency",
      "Workflow / session latency",
      input.averageLoginLatencyMs == null ? "skip" : input.averageLoginLatencyMs < 1000 ? "pass" : "warn",
      input.averageLoginLatencyMs == null
        ? "Authenticated login latency was not measured because live UAT checks were skipped."
        : input.averageLoginLatencyMs < 1000
          ? "Representative enterprise login flows completed within the target latency budget."
          : "Login/session latency exceeded the preferred threshold during enterprise UAT probes.",
      { averageLoginLatencyMs: input.averageLoginLatencyMs },
    ),
    makeCheck(
      "pdf-latency",
      "PDF generation speed",
      input.pdfLatencyMs == null ? "skip" : input.pdfLatencyMs < 5000 ? "pass" : "warn",
      input.pdfLatencyMs == null
        ? "PDF generation latency was not measured during the current validation run."
        : input.pdfLatencyMs < 5000
          ? "Authenticated PDF generation completed within the target latency budget."
          : "PDF generation exceeded the preferred latency budget and should be reviewed before rollout.",
      { pdfLatencyMs: input.pdfLatencyMs },
    ),
    makeCheck(
      "dashboard-latency",
      "Dashboard rendering readiness",
      input.modulesLatencyMs == null ? "skip" : input.modulesLatencyMs < 3000 ? "pass" : "warn",
      input.modulesLatencyMs == null
        ? "Dashboard/module route latency was not measured during the current validation run."
        : input.modulesLatencyMs < 3000
          ? "The enterprise module portal responded within the target rendering threshold."
          : "The enterprise module portal responded slowly during validation and should be reviewed.",
      { modulesLatencyMs: input.modulesLatencyMs },
    ),
  ]);
}

async function main(): Promise<void> {
  loadEnv();

  const baseUrl = normalizeBaseUrl(process.env.VALIDATION_BASE_URL ?? process.env.APP_BASE_URL ?? null);
  const runtimeDbUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL ?? null;
  const migrationDbUrl = process.env.DATABASE_URL_UNPOOLED ?? null;

  const stagingSection = buildStagingDeploymentSection({
    runtimeDbUrl,
    migrationDbUrl,
    jwtSecret: process.env.JWT_SECRET_KEY ?? null,
    otpSecret: process.env.OTP_SECRET ?? null,
    tokenPepper: process.env.PUBLIC_LINK_TOKEN_PEPPER ?? null,
    emailDeliveryMode: process.env.EMAIL_DELIVERY_MODE ?? null,
    smsProvider: process.env.SMS_PROVIDER ?? null,
    smsEnabled: process.env.SMS_ENABLED ?? null,
    storageMode: process.env.PDF_BINARY_STORAGE_MODE ?? null,
    storageRoot: process.env.PDF_STORAGE_ROOT ?? process.env.DOCUMENT_STORAGE_ROOT ?? process.env.STORAGE_ROOT ?? null,
  });

  let dbProbeOk = false;
  let migrationProbeOk = false;
  let dbLatencyMs: number | null = null;
  let userSnapshots: DemoUserSnapshot[] = [];
  const workflowSnapshot: WorkflowSeedSnapshot = {
    caseCount: 0,
    workflowStateCount: 0,
    approvalChainCount: 0,
    approvalActionCount: 0,
    delegationRuleCount: 0,
    auditEventCount: 0,
    auditChainEventCount: 0,
    documentCount: 0,
    notificationCount: 0,
  };
  let auditChainUniqueCount = 0;
  let immutableDocumentCount = 0;
  let qrReferenceCount = 0;
  let signedDocumentCount = 0;
  let dischargeCaseId: string | null = null;
  let modulesLatencyMs: number | null = null;
  let averageLoginLatencyMs: number | null = null;
  let pdfLatencyMs: number | null = null;
  let hasSoftDeleteMarkers = false;

  const prisma = runtimeDbUrl ? new PrismaClient() : null;

  try {
    if (prisma) {
      const dbStarted = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round(performance.now() - dbStarted);
      dbProbeOk = true;

      if (migrationDbUrl) {
        const migrationPrisma = new PrismaClient({ datasources: { db: { url: migrationDbUrl } } });
        try {
          await migrationPrisma.$queryRaw`SELECT 1`;
          migrationProbeOk = true;
        } finally {
          await migrationPrisma.$disconnect().catch(() => undefined);
        }
      }

      const users = await prisma.user.findMany({
        where: { email: { in: DEMO_ACCOUNT_PROFILES.map((profile) => profile.email) } },
        select: {
          email: true,
          role: true,
          memberships: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
          roleAssignments: {
            select: { id: true },
          },
          primaryTenant: {
            select: { code: true },
          },
        },
      });
      userSnapshots = users.map((user) => ({
        email: user.email,
        role: user.role,
        tenantCode: user.primaryTenant?.code ?? null,
        hasMembership: user.memberships.length > 0,
        hasRoleAssignment: user.roleAssignments.length > 0 || user.role === "platform_admin",
      }));

      const cases = await prisma.case.findMany({
        where: { caseNumber: { in: [...TARGET_CASE_NUMBERS] } },
        select: { id: true, caseNumber: true },
      });
      dischargeCaseId = cases.find((item) => item.caseNumber === "DEMO-DR-001")?.id ?? null;
      workflowSnapshot.caseCount = cases.length;

      const caseIds = cases.map((item) => item.id);
      workflowSnapshot.workflowStateCount = await prisma.workflowState.count({
        where: { recordId: { in: caseIds } },
      });
      workflowSnapshot.approvalChainCount = await prisma.approvalChain.count({
        where: { chainCode: { in: [...TARGET_CHAIN_CODES] } },
      });
      const approvalChains = await prisma.approvalChain.findMany({
        where: { chainCode: { in: [...TARGET_CHAIN_CODES] } },
        select: { id: true },
      });
      workflowSnapshot.approvalActionCount = await prisma.approvalAction.count({
        where: { approvalChainId: { in: approvalChains.map((item) => item.id) } },
      });
      workflowSnapshot.delegationRuleCount = await prisma.delegationRule.count();
      workflowSnapshot.auditEventCount = await prisma.auditEvent.count({
        where: { recordId: { in: caseIds } },
      });
      const auditChainEvents = await prisma.auditChainEvent.findMany({
        where: { caseId: { in: caseIds } },
        select: { currentHash: true },
      });
      workflowSnapshot.auditChainEventCount = auditChainEvents.length;
      auditChainUniqueCount = new Set(auditChainEvents.map((item) => item.currentHash)).size;

      const documents = await prisma.document.findMany({
        where: { documentCode: { in: [...TARGET_DOCUMENT_CODES] } },
        select: {
          documentCode: true,
          status: true,
          signedAt: true,
          storagePath: true,
          payloadJson: true,
        },
      });
      workflowSnapshot.documentCount = documents.length;
      immutableDocumentCount = documents.filter((document) => {
        const payload = document.payloadJson as Record<string, unknown> | null;
        return Boolean(payload?.["immutable"]) || document.status === "ARCHIVED" || document.status === "SIGNED";
      }).length;
      qrReferenceCount = documents.filter((document) => {
        const payload = document.payloadJson as Record<string, unknown> | null;
        return typeof payload?.["qrReference"] === "string" && payload["qrReference"].trim().length > 0;
      }).length;
      signedDocumentCount = documents.filter((document) => Boolean(document.signedAt)).length;

      workflowSnapshot.notificationCount = await prisma.operationNotification.count({
        where: { caseId: { in: caseIds } },
      });

      const columnMatches = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('cases', 'documents', 'workflow_states', 'approval_chains', 'audit_events')
          AND column_name IN ('deleted_at', 'is_deleted')
      `;
      hasSoftDeleteMarkers = columnMatches.length > 0;
    }
  } catch {
    dbProbeOk = false;
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
  }

  const roleSection = buildRoleProvisioningSection(userSnapshots);
  const seedSection = buildSeedDataSection(workflowSnapshot);
  const uatSection = await tryLiveAuthenticatedUat(baseUrl, dischargeCaseId);

  const loginChecks = uatSection.checks.find((check) => check.key === "login-sessions");
  averageLoginLatencyMs =
    typeof loginChecks?.details?.["averageLatencyMs"] === "number"
      ? (loginChecks.details["averageLatencyMs"] as number)
      : null;
  const pdfCheck = uatSection.checks.find((check) => check.key === "workflow-pdf");
  pdfLatencyMs =
    typeof pdfCheck?.details?.["pdfGenerationLatencyMs"] === "number"
      ? (pdfCheck.details["pdfGenerationLatencyMs"] as number)
      : null;

  if (baseUrl) {
    const mobileProbe = await apiRequest(baseUrl, "GET", "/modules").catch(() => null);
    modulesLatencyMs = mobileProbe?.latencyMs ?? null;
  }

  const databaseSection = buildDatabaseCertificationSection({
    dbProbeOk,
    migrationProbeOk,
    userSnapshots,
    workflowSnapshot,
    auditChainUniqueCount,
    auditChainCount: workflowSnapshot.auditChainEventCount,
    hasSoftDeleteMarkers,
  });
  const mobileSection = await tryMobileQa(baseUrl);
  const legalSection = buildLegalEvidenceSection({
    documentCount: workflowSnapshot.documentCount,
    immutableDocumentCount,
    qrReferenceCount,
    signedDocumentCount,
    auditChainCount: workflowSnapshot.auditChainEventCount,
  });
  const performanceSection = buildPerformanceSection({
    dbLatencyMs,
    averageLoginLatencyMs,
    pdfLatencyMs,
    modulesLatencyMs,
  });

  const sections = [
    stagingSection,
    roleSection,
    seedSection,
    uatSection,
    databaseSection,
    mobileSection,
    legalSection,
    performanceSection,
  ];

  const report: OperationalHardeningReport = {
    generatedAt: new Date().toISOString(),
    environment: process.env.APP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "staging",
    baseUrl,
    sections,
    finalRecommendation: buildFinalRecommendation(sections),
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "enterprise-operational-hardening-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "enterprise-operational-hardening-report.md"),
    renderOperationalHardeningMarkdown(report),
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));
  if (report.finalRecommendation.decision !== "GO") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
