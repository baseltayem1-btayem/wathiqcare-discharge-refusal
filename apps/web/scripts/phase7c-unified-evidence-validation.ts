import "dotenv/config";
import crypto from "node:crypto";
import { getPrisma } from "../src/lib/server/prisma";
import { generateUnifiedEvidenceRecord } from "../src/lib/server/unified-legal-evidence-service";

const ACCEPT_DOCUMENT_ID = process.argv[2] || "6d4c0305-c422-4c55-8610-f8519ac8d09c";
const REFUSE_DOCUMENT_ID = process.argv[3] || "19d5059f-6edb-4d96-a288-5a92fe48a1f4";

type EvidencePackageState = {
  id: string;
  checksumHash: string;
  fileName: string;
  generatedAt: string;
  metadataHash: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value)), "utf8").digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function loadDocumentState(documentId: string) {
  const prisma = getPrisma();
  const doc = await prisma.consentDocument.findFirst({
    where: { id: documentId },
    select: {
      id: true,
      tenantId: true,
      consentReference: true,
      immutablePdfHash: true,
      immutablePdfUrl: true,
      auditChecksum: true,
      metadata: true,
      signatures: {
        orderBy: { signedAt: "asc" },
        select: {
          id: true,
          role: true,
          signedAt: true,
          metadata: true,
        },
      },
      auditEvents: {
        orderBy: { createdAt: "asc" },
        select: {
          action: true,
          createdAt: true,
          metadata: true,
        },
      },
      evidencePackages: {
        orderBy: { generatedAt: "asc" },
        select: {
          id: true,
          checksumHash: true,
          fileName: true,
          generatedAt: true,
          metadata: true,
        },
      },
    },
  });

  if (!doc) {
    throw new Error(`Consent document not found: ${documentId}`);
  }

  const evidencePackages: EvidencePackageState[] = doc.evidencePackages.map((item) => ({
    id: item.id,
    checksumHash: item.checksumHash,
    fileName: item.fileName,
    generatedAt: item.generatedAt.toISOString(),
    metadataHash: sha256(item.metadata || {}),
  }));

  return {
    ...doc,
    evidencePackages,
    metadataHash: sha256(doc.metadata || {}),
  };
}

function packageStatesEqual(left: EvidencePackageState[], right: EvidencePackageState[]): boolean {
  return sha256(left) === sha256(right);
}

function hasEvent(actions: string[], event: string): boolean {
  return actions.includes(event);
}

async function validateDocument(documentId: string, expectedDecision: "ACCEPTED" | "REFUSED") {
  const before = await loadDocumentState(documentId);
  const unified = await generateUnifiedEvidenceRecord({
    tenantId: before.tenantId,
    documentId,
  });
  const after = await loadDocumentState(documentId);

  const actions = after.auditEvents.map((item) => item.action);
  const packageIdsBefore = before.evidencePackages.map((item) => item.id);
  const packageIdsAfter = after.evidencePackages.map((item) => item.id);
  const evidencePackagesUntouched = packageStatesEqual(before.evidencePackages, after.evidencePackages);

  const regression = {
    secureSigning: before.auditChecksum === after.auditChecksum,
    otp: hasEvent(actions, "OTP_VERIFIED") || Boolean(unified.snapshot.otp.verifiedTimestamp),
    decision: expectedDecision === unified.snapshot.decision.status,
    refusal: expectedDecision === "REFUSED"
      ? hasEvent(actions, "REFUSAL_SIGNED") && unified.snapshot.signature.signatureId !== null
      : true,
    pdf: before.immutablePdfHash === after.immutablePdfHash && before.immutablePdfUrl === after.immutablePdfUrl,
    evidencePackages: evidencePackagesUntouched && sha256(packageIdsBefore) === sha256(packageIdsAfter),
  };

  const pass =
    unified.snapshot.audit.timeline.length > 0
    && Boolean(unified.unifiedHash)
    && Boolean(unified.certificate.id)
    && Object.values(regression).every(Boolean);

  return {
    pass,
    documentId,
    consentReference: before.consentReference,
    evidencePackageIds: unified.existingEvidencePackageIds,
    unifiedHash: unified.unifiedHash,
    certificateId: unified.certificate.id,
    decisionStatus: unified.snapshot.decision.status,
    otpChallengeId: unified.snapshot.otp.challengeId,
    otpVerifiedTimestamp: unified.snapshot.otp.verifiedTimestamp,
    signatureId: unified.snapshot.signature.signatureId,
    certificateSignatureId: unified.snapshot.signature.certificateId,
    snapshotCreated: Boolean(unified.snapshot.audit.timeline.length),
    hashGenerated: Boolean(unified.unifiedHash),
    certificateGenerated: Boolean(unified.certificate.id),
    evidencePackagesUntouched,
    reused: unified.reused,
    refusalFormHash:
      expectedDecision === "REFUSED"
        ? (() => {
          const metadata = asRecord(after.metadata);
          const executionContext = asRecord(metadata.executionContext);
          const decision = asRecord(executionContext.decision);
          const formHash = decision.refusalFormHash;
          return typeof formHash === "string" && formHash.trim() ? formHash.trim() : null;
        })()
        : null,
    regression,
  };
}

async function main() {
  if (!process.env.APP_ENV) {
    process.env.APP_ENV = "pilot";
  }

  const accept = await validateDocument(ACCEPT_DOCUMENT_ID, "ACCEPTED");
  const refuse = await validateDocument(REFUSE_DOCUMENT_ID, "REFUSED");
  const overallPass = accept.pass && refuse.pass;

  console.log(JSON.stringify({
    result: overallPass ? "PASS" : "FAIL",
    documents: {
      accept,
      refuse,
    },
    regressionResults: {
      secureSigning: accept.regression.secureSigning && refuse.regression.secureSigning ? "PASS" : "FAIL",
      otp: accept.regression.otp && refuse.regression.otp ? "PASS" : "FAIL",
      decision: accept.regression.decision && refuse.regression.decision ? "PASS" : "FAIL",
      refusal: refuse.regression.refusal ? "PASS" : "FAIL",
      pdf: accept.regression.pdf && refuse.regression.pdf ? "PASS" : "FAIL",
      evidencePackages: accept.regression.evidencePackages && refuse.regression.evidencePackages ? "PASS" : "FAIL",
    },
  }, null, 2));

  await getPrisma().$disconnect();
  process.exit(overallPass ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await getPrisma().$disconnect().catch(() => undefined);
  process.exit(1);
});