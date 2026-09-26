import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import {
  buildConsentDocumentFingerprint,
  createConsentDocument,
  findReusableConsentDocument,
  selectReusableConsentDocument,
  type CreateConsentDocumentPayload,
  type ReusableConsentDocumentMatch,
} from "@/lib/server/consent-document-create-service";
import type { AuthContext } from "@/lib/server/auth";
import {
  createConsentDocument as apiCreateConsentDocument,
  sendSecureSigningLinkForDocument,
} from "@/components/informed-consents/production-workspace/lib/api";

const AUTH: AuthContext = {
  tenant_id: "tenant-1",
  sub: "physician-1",
  email: "physician@wathiqcare.local",
  role: "PHYSICIAN",
} as unknown as AuthContext;

function candidate(overrides: Partial<ReusableConsentDocumentMatch> = {}): ReusableConsentDocumentMatch {
  return {
    id: "doc-1",
    consentReference: "IC-1",
    status: "READY_FOR_SIGNATURE",
    patientName: "Patient One",
    mrn: "MRN-1",
    plannedProcedure: "Appendectomy",
    ...overrides,
  };
}

test("selectReusableConsentDocument matches the same procedure (normalized) and takes the newest candidate first", () => {
  const candidates = [
    candidate({ id: "doc-new", consentReference: "IC-NEW", plannedProcedure: " Appendectomy " }),
    candidate({ id: "doc-old", consentReference: "IC-OLD", plannedProcedure: "appendectomy" }),
  ];

  const matched = selectReusableConsentDocument(candidates, { plannedProcedure: "appendectomy" });
  assert.ok(matched);
  assert.equal(matched.id, "doc-new");
});

test("selectReusableConsentDocument refuses a different procedure", () => {
  const candidates = [candidate({ plannedProcedure: "Cholecystectomy" })];
  const matched = selectReusableConsentDocument(candidates, { plannedProcedure: "Appendectomy" });
  assert.equal(matched, null);
});

test("selectReusableConsentDocument falls back to the newest candidate when no procedure intent is given", () => {
  const candidates = [
    candidate({ id: "doc-old" }),
    candidate({ id: "doc-new" }),
  ];
  const matched = selectReusableConsentDocument(candidates, {});
  assert.ok(matched);
  assert.equal(matched.id, "doc-old");
});

test("findReusableConsentDocument scopes by tenant/case, excludes VOID and ARCHIVED, and requires a form identity", async () => {
  const capturedWheres: unknown[] = [];
  const fakeClient = {
    consentDocument: {
      findMany: async (args: { where: unknown }) => {
        capturedWheres.push(args.where);
        return [candidate()];
      },
    },
  };

  const matched = await findReusableConsentDocument(fakeClient as unknown as PrismaClient, {
    tenantId: "tenant-1",
    caseId: "case-1",
    intent: {
      approvedConsentFormId: "form-1",
      assemblyTemplateId: "tmpl-1",
      plannedProcedure: "Appendectomy",
    },
  });

  assert.ok(matched);
  assert.equal(matched.id, "doc-1");
  assert.equal(capturedWheres.length, 1);

  const where = capturedWheres[0] as {
    tenantId: string;
    caseId: string;
    status: { notIn: string[] };
    OR: unknown[];
  };
  assert.equal(where.tenantId, "tenant-1");
  assert.equal(where.caseId, "case-1");
  assert.deepEqual(where.status.notIn.sort(), ["ARCHIVED", "VOID"]);
  assert.equal(where.OR.length, 3);

  const noIdentity = await findReusableConsentDocument(fakeClient as unknown as PrismaClient, {
    tenantId: "tenant-1",
    caseId: "case-1",
    intent: {},
  });
  assert.equal(noIdentity, null);
  assert.equal(capturedWheres.length, 1);
});

test("duplicate create attempt returns the existing document instead of creating a new one", async () => {
  const payload: CreateConsentDocumentPayload = {
    caseId: "case-1",
    templateId: "tmpl-1",
    templateVersionId: "ver-1",
    language: "bilingual",
    physicianName: "Dr. One",
    plannedProcedure: "Appendectomy",
    idempotencyKey: "test-key-1",
    initialStatus: "READY_FOR_SIGNATURE" as never,
  };

  const fingerprint = buildConsentDocumentFingerprint(payload, "ver-1");

  let createCalls = 0;
  let transactionCalls = 0;
  const fakeClient = {
    case: {
      findFirst: async () => ({
        id: "case-1",
        caseNumber: "CASE-1",
        patientName: "Patient One",
        patientIdNumber: null,
        medicalRecordNo: "MRN-1",
        metadata: {},
      }),
    },
    consentTemplate: {
      findFirst: async () => ({
        id: "tmpl-1",
        templateCode: "SURGICAL_PROCEDURE_CONSENT",
        specialty: "General Surgery",
        department: "Surgery",
        riskLevel: "MEDIUM",
        requiresWitness: false,
        requiresInterpreter: false,
        currentVersionId: "ver-1",
        metadata: {},
      }),
    },
    consentTemplateVersion: {
      findFirst: async () => ({
        id: "ver-1",
        versionLabel: "1.0",
        versionNumber: 1,
        status: "APPROVED",
        approvedByUserId: "governor-1",
        approvedAt: new Date("2026-01-01T00:00:00.000Z"),
        effectiveFrom: null,
        effectiveTo: null,
      }),
    },
    consentDocument: {
      findFirst: async (args: { where: { idempotencyKey?: string; id?: string } }) => {
        if (args.where.idempotencyKey) {
          return { id: "doc-existing", idempotencyFingerprint: fingerprint };
        }
        return {
          id: "doc-existing",
          consentReference: "IC-EXISTING",
          status: "READY_FOR_SIGNATURE",
          patientName: "Patient One",
          mrn: "MRN-1",
          plannedProcedure: "Appendectomy",
          case: {},
          template: {},
          templateVersion: {},
          sections: [],
          signatures: [],
          auditEvents: [],
        };
      },
      create: async () => {
        createCalls += 1;
        throw new Error("create must not be called for a duplicate intent");
      },
    },
    $transaction: async () => {
      transactionCalls += 1;
      throw new Error("transaction must not run for a duplicate intent");
    },
  };

  const document = await createConsentDocument(AUTH, payload, undefined, fakeClient as unknown as PrismaClient);

  assert.equal(document.id, "doc-existing");
  assert.equal(document.consentReference, "IC-EXISTING");
  assert.equal(document.status, "READY_FOR_SIGNATURE");
  assert.equal(createCalls, 0);
  assert.equal(transactionCalls, 0);
});

test("send flow continues to secure-signing when the existing document is reused", async () => {
  const requests: Array<{ url: string; body?: Record<string, unknown> }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    const url = String(input);
    const parsedBody = init?.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    requests.push({ url, body: parsedBody });

    if (url === "/api/modules/informed-consents/documents") {
      return new Response(
        JSON.stringify({
          ok: true,
          reusedExistingDocument: true,
          document: {
            id: "doc-1",
            consentReference: "IC-2026",
            status: "READY_FOR_SIGNATURE",
            patientName: "Patient One",
            mrn: "MRN-1",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/secure-signing")) {
      return new Response(
        JSON.stringify({
          ok: true,
          workflow: {
            sessionId: "sess-1",
            documentId: "doc-1",
            dispatchStatuses: { sms: "PENDING", email: "PENDING" },
            status: {
              linkCreated: true,
              smsSent: false,
              opened: false,
              otpRequested: false,
              otpVerified: false,
              signed: false,
              expired: false,
              revoked: false,
              failed: false,
              failedAttempts: 0,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;

  try {
    const document = await apiCreateConsentDocument({
      caseId: "case-1",
      approvedConsentFormId: "imc-approved-surgical-procedure-consent",
      plannedProcedure: "Appendectomy",
    });

    assert.equal(document.id, "doc-1");
    assert.equal(document.consentReference, "IC-2026");
    assert.equal(document.reusedExistingDocument, true);

    const documentRequest = requests.find((r) => r.url === "/api/modules/informed-consents/documents");
    assert.ok(documentRequest?.body);
    assert.equal(typeof documentRequest.body.idempotencyKey, "string");

    const workflow = await sendSecureSigningLinkForDocument({
      documentId: document.id,
      caseId: "case-1",
      patientName: "Patient One",
      mobileNumber: "+966500000000",
      recipientEmail: "patient@example.com",
    });

    assert.equal(workflow.sessionId, "sess-1");
    assert.equal(workflow.dispatchStatuses.sms, "PENDING");
    assert.equal(workflow.dispatchStatuses.email, "PENDING");
    assert.ok(
      requests.some((r) => r.url === "/api/modules/informed-consents/documents/doc-1/secure-signing"),
      "secure-signing request must be reached after the document is reused",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
