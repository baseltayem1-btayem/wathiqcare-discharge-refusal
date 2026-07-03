import assert from "node:assert/strict";
import test from "node:test";

import { redactValue, sanitizeLogDetails, getRuntimeCorrelationId } from "./runtime-observability";

test("redactValue removes PHI string values", () => {
  assert.equal(redactValue("patientName", "Ahmad Al-Rashid"), "[REDACTED]");
  assert.equal(redactValue("mrn", "123456"), "[REDACTED]");
  assert.equal(redactValue("nationalId", "1234567890"), "[REDACTED]");
  assert.equal(redactValue("diagnosis", "Appendicitis"), "[REDACTED]");
  assert.equal(redactValue("clinicalNotes", "Patient reports pain"), "[REDACTED]");
});

test("redactValue masks emails and phones", () => {
  assert.match(redactValue("email", "ahmad@example.com") as string, /ah\*\*\*\*@ex\*\*\*\*\.com/);
  assert.equal(redactValue("mobile", "+966501234567"), "966****67");
  assert.equal(redactValue("phoneNumber", "0501234567"), "050****67");
});

test("redactValue redacts secrets", () => {
  assert.equal(redactValue("apiKey", "super-secret"), "[REDACTED]");
  assert.equal(redactValue("password", "hunter2"), "[REDACTED]");
  assert.equal(redactValue("otp", "123456"), "[REDACTED]");
  assert.equal(redactValue("signatureDataUrl", "data:image/png;base64,ABC"), "[REDACTED]");
  assert.equal(redactValue("authorization", "Bearer token"), "[REDACTED]");
});

test("redactValue hashes user and tenant identifiers", () => {
  const userHash = redactValue("user_id", "user-123") as string;
  assert.ok(userHash.startsWith("u_"));
  assert.equal(userHash.length, 18);

  const tenantHash = redactValue("tenant_id", "tenant-456") as string;
  assert.ok(tenantHash.startsWith("t_"));
  assert.equal(tenantHash.length, 18);
});

test("sanitizeLogDetails redacts nested PHI", () => {
  const safe = sanitizeLogDetails({
    action: "finalize",
    patient: { fullName: "Ahmad", mrn: "123" },
    metadata: { otp: "123456" },
  });

  assert.equal((safe as Record<string, unknown>).action, "finalize");
  const patient = ((safe as Record<string, unknown>).patient as Record<string, unknown>);
  assert.equal(patient.fullName, "[REDACTED]");
  assert.equal(patient.mrn, "[REDACTED]");
  const metadata = ((safe as Record<string, unknown>).metadata as Record<string, unknown>);
  assert.equal(metadata.otp, "[REDACTED]");
});

test("getRuntimeCorrelationId falls back from x-correlation-id", () => {
  const request = {
    headers: new Map([
      ["x-correlation-id", "corr-123"],
    ]),
    get(name: string) {
      return this.headers.get(name);
    },
  } as any as import("next/server").NextRequest;

  assert.equal(getRuntimeCorrelationId(request), "corr-123");
});

test("getRuntimeCorrelationId prefers x-runtime-correlation-id", () => {
  const request = {
    headers: new Map([
      ["x-runtime-correlation-id", "runtime-123"],
      ["x-correlation-id", "corr-123"],
    ]),
    get(name: string) {
      return this.headers.get(name);
    },
  } as any as import("next/server").NextRequest;

  assert.equal(getRuntimeCorrelationId(request), "runtime-123");
});
