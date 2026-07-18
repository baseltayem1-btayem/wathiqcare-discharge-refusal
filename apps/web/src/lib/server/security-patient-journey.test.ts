import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { sanitizeLogDetails } from "@/lib/server/runtime-observability";
import { checkPublicSigningOtpRateLimit } from "@/lib/server/public-signing-rate-limit";
import { ApiError } from "@/lib/server/http";
import { evaluateControlledAuthoritativePilot } from "@/lib/server/controlled-production-pilot-governance";
import { getSigningTokenContext } from "@/lib/server/signing-token-context-service";
import { isPreviewOtpInspectionEnabled } from "@/lib/server/module-secure-signing-service";
import { getPilotEmailOverrideConfig } from "@/lib/server/pilot-email-override";
import { resetEnvironmentConfig } from "@/lib/environment/environment";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  resetEnvironmentConfig();
  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetEnvironmentConfig();
  }
}

test("public signing service does not persist raw signing token in audit metadata", () => {
  const sourcePath = path.resolve("src/lib/server/public-signing-service.ts");
  const content = fs.readFileSync(sourcePath, "utf8");

  const metadataBlocks = content.split("metadata:").slice(1);
  for (const block of metadataBlocks) {
    const snippet = block.slice(0, 400);
    assert.ok(
      !/\btoken\s*:\s*args\.token\b/.test(snippet),
      "audit metadata must not store the raw signing token",
    );
  }
});

test("runtime observability redacts tokens, OTP codes, and phone numbers", () => {
  const sanitized = sanitizeLogDetails({
    accessToken: "secret-jwt-value",
    otpCode: "123456",
    mobileNumber: "+966501234567",
    patientName: "Ahmad Smith",
    diagnosis: "appendicitis",
    request: {
      headers: {
        authorization: "Bearer secret",
        cookie: "session=secret",
      },
    },
  });

  assert.equal(sanitized.accessToken, "[REDACTED]");
  assert.equal(sanitized.otpCode, "[REDACTED]");
  assert.ok(
    typeof sanitized.mobileNumber === "string" &&
      !sanitized.mobileNumber.includes("501234567"),
    "mobile number must be masked in logs",
  );
  assert.equal(sanitized.patientName, "[REDACTED]");
  assert.equal(sanitized.diagnosis, "[REDACTED]");
  assert.equal((sanitized.request as Record<string, unknown>).headers.authorization, "[REDACTED]");
  assert.equal((sanitized.request as Record<string, unknown>).headers.cookie, "[REDACTED]");
});

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createFakePrisma(counts: {
  tokenCount: number;
  ipCount: number;
}) {
  return {
    $queryRaw: async (...args: unknown[]) => {
      const [first, ...rest] = args;
      const values = Array.isArray(first) ? rest : ((first as Record<string, unknown>).values as unknown[]) ?? [];
      const tokenHash = hashToken("test-token");
      if (values.some((value) => value === tokenHash)) {
        return [{ count: BigInt(counts.tokenCount) }];
      }
      if (values.some((value) => value === "203.0.113.1")) {
        return [{ count: BigInt(counts.ipCount) }];
      }
      return [{ count: BigInt(0) }];
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

function fakeRequest(ip: string): import("next/server").NextRequest {
  return {
    headers: new Map([["x-forwarded-for", ip]]) as unknown as Headers,
  } as unknown as import("next/server").NextRequest;
}

test("public signing OTP rate limit allows requests under the threshold", async () => {
  const fakePrisma = createFakePrisma({ tokenCount: 2, ipCount: 5 });

  await assert.doesNotReject(
    checkPublicSigningOtpRateLimit({
      token: "test-token",
      request: fakeRequest("203.0.113.1"),
      prisma: fakePrisma,
    }),
  );
});

test("public signing OTP rate limit rejects requests over the token threshold", async () => {
  const fakePrisma = createFakePrisma({ tokenCount: 10, ipCount: 0 });

  await assert.rejects(
    checkPublicSigningOtpRateLimit({ token: "test-token", request: undefined, prisma: fakePrisma }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 429 &&
      /too many otp requests/i.test(error.message),
  );
});

test("public signing OTP rate limit rejects requests over the IP threshold", async () => {
  const fakePrisma = createFakePrisma({ tokenCount: 0, ipCount: 25 });

  await assert.rejects(
    checkPublicSigningOtpRateLimit({
      token: "test-token",
      request: fakeRequest("203.0.113.1"),
      prisma: fakePrisma,
    }),
    (error: unknown) => error instanceof ApiError && error.status === 429,
  );
});

test("controlled production pilot governance does not block production when enabled", () => {
  withEnv(
    {
      NODE_ENV: "production",
      APP_ENV: "production",
      FEATURE_CONTROLLED_PRODUCTION_PILOT_ENABLED: "true",
      FEATURE_AUTHORITATIVE_UNIFIED_RUNTIME_PILOT: "true",
      FEATURE_AUTHORITATIVE_PILOT_ALLOW_PRODUCTION: "true",
      FEATURE_AUTHORITATIVE_PILOT_ROLLBACK_KILL_SWITCH: "false",
      FEATURE_AUTHORITATIVE_PHYSICIAN_RUNTIME: "true",
      FEATURE_AUTHORITATIVE_PATIENT_RUNTIME: "true",
      AUTHORITATIVE_PILOT_ALLOWED_PHYSICIANS: "DR-001",
    },
    () => {
      const snapshot = evaluateControlledAuthoritativePilot({
        flow: "patient_runtime",
        physicianId: "DR-001",
        specialty: "GI",
        procedure: "colonoscopy",
      });
      assert.equal(snapshot.productionAllowed, true);
      assert.equal(snapshot.active, true);
      assert.equal(snapshot.reasons.length, 0);
    },
  );
});

test("controlled production pilot governance disables production when productionAllowed is false", () => {
  withEnv(
    {
      NODE_ENV: "production",
      APP_ENV: "production",
      FEATURE_CONTROLLED_PRODUCTION_PILOT_ENABLED: "true",
      FEATURE_AUTHORITATIVE_UNIFIED_RUNTIME_PILOT: "true",
      FEATURE_AUTHORITATIVE_PILOT_ALLOW_PRODUCTION: "false",
      FEATURE_AUTHORITATIVE_PILOT_ROLLBACK_KILL_SWITCH: "false",
      FEATURE_AUTHORITATIVE_PATIENT_RUNTIME: "true",
      AUTHORITATIVE_PILOT_ALLOWED_PHYSICIANS: "DR-001",
    },
    () => {
      const snapshot = evaluateControlledAuthoritativePilot({
        flow: "patient_runtime",
        physicianId: "DR-001",
      });
      assert.equal(snapshot.productionAllowed, false);
      assert.ok(snapshot.reasons.some((reason) => reason === "production_not_allowed"));
      assert.equal(snapshot.active, false);
    },
  );
});

test("public signing token context returns generic error for invalid tokens", async () => {
  await assert.rejects(
    getSigningTokenContext(""),
    (error: unknown) =>
      error instanceof Error &&
      /invalid or expired signing token/i.test((error as Error).message),
  );
});

test("preview OTP inspection is disabled in production", () => {
  const originalVercel = process.env.VERCEL_ENV;
  const originalPilot = process.env.ENABLE_IMC_PILOT_PATIENTS;

  try {
    process.env.VERCEL_ENV = "production";
    process.env.ENABLE_IMC_PILOT_PATIENTS = "true";
    assert.equal(isPreviewOtpInspectionEnabled(), false);
  } finally {
    process.env.VERCEL_ENV = originalVercel;
    if (originalPilot === undefined) {
      delete process.env.ENABLE_IMC_PILOT_PATIENTS;
    } else {
      process.env.ENABLE_IMC_PILOT_PATIENTS = originalPilot;
    }
  }
});

test("pilot OTP email override is disabled in production by default", () => {
  withEnv(
    {
      APP_ENV: "production",
      PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED: undefined,
    },
    () => {
      const config = getPilotEmailOverrideConfig();
      assert.equal(config.enabled, false);
      assert.equal(config.environment, "production");
    },
  );
});

test("legacy acknowledgment start route does not leak raw OTP or stub mode", () => {
  const routePath = path.resolve(
    "..",
    "..",
    "frontend/app/api/discharge/cases/[caseId]/acknowledgment/start/route.ts",
  );
  const content = fs.readFileSync(routePath, "utf8");
  assert.ok(
    !content.includes("otp_debug_code"),
    "acknowledgment start route must not expose otp_debug_code",
  );
  assert.ok(
    !content.includes("stub_mode"),
    "acknowledgment start route must not enable stub_mode",
  );
  assert.ok(
    !/generateOtp\s*\(/.test(content),
    "acknowledgment start route must not generate local OTP without an SMS provider",
  );
});
