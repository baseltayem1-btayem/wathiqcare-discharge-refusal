import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/test";
process.env.DATABASE_URL_POOLED = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-jwt-secret-minimum-32-characters-long";
process.env.PUBLIC_LINK_TOKEN_PEPPER =
  process.env.PUBLIC_LINK_TOKEN_PEPPER || "test-public-link-token-pepper-minimum-32";
process.env.PUBLIC_SIGNING_OTP_PEPPER =
  process.env.PUBLIC_SIGNING_OTP_PEPPER || "test-signing-otp-pepper-minimum-32-characters";
process.env.WATHIQ_STEP_UP_SECRET =
  process.env.WATHIQ_STEP_UP_SECRET || "test-step-up-secret-minimum-32-characters-long";

function buildIllustrationRow(overrides: {
  id: string;
  patientFacing: boolean;
  imageReviewStatus: string;
  procedureImageUrl?: string | null;
  procedureNameEn?: string;
}) {
  const now = new Date();
  return {
    id: overrides.id,
    tenantId: "tenant-test",
    procedureId: "proc-test",
    procedureNameEn: overrides.procedureNameEn ?? "Capsule Endoscopy",
    procedureNameAr: "تنظير الكبسولة",
    specialty: "Gastroenterology",
    anatomyRegion: null,
    synonyms: [] as string[],
    anatomyImageUrl: null,
    procedureImageUrl: overrides.procedureImageUrl ?? "/educational/capsule.png",
    anatomyPromptEn: null,
    anatomyPromptAr: null,
    procedurePromptEn: "Procedure prompt",
    procedurePromptAr: null,
    patientDisplayDisclaimerEn: null,
    patientDisplayDisclaimerAr: null,
    source: "ChatGPT",
    version: "v1",
    patientFacing: overrides.patientFacing,
    imageReviewStatus: overrides.imageReviewStatus,
    reviewedBy: null,
    reviewedAt: null,
    effectiveDate: now,
    expiryDate: null,
    createdByUserId: "user-test",
    createdAt: now,
    updatedAt: now,
  };
}

let illustrationFindManyHandler: (args: { where?: Record<string, unknown> }) => Promise<unknown[]> =
  async () => [];

const mockPrisma = {
  clinicalKnowledgeIllustration: {
    findMany: async (args: { where?: Record<string, unknown> }) => illustrationFindManyHandler(args),
  },
} as unknown as PrismaClient;

(global as typeof globalThis & { __wathiqcarePrisma__?: PrismaClient }).__wathiqcarePrisma__ =
  mockPrisma;

test("getApprovedIllustrationsForProcedure returns only approved patient-facing illustrations", async () => {
  const approved = buildIllustrationRow({
    id: "ill-approved",
    patientFacing: true,
    imageReviewStatus: "approved",
  });
  const draft = buildIllustrationRow({
    id: "ill-draft",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
  });

  illustrationFindManyHandler = async (args) => {
    if (
      args.where?.imageReviewStatus === "approved" &&
      args.where?.patientFacing === true
    ) {
      return [approved];
    }
    return [approved, draft];
  };

  const { getApprovedIllustrationsForProcedure } = await import(
    "@/lib/server/clinical-knowledge/services/illustration-service"
  );

  const result = await getApprovedIllustrationsForProcedure("tenant-test", "proc-test");

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "ill-approved");
  assert.equal(result[0].patientFacing, true);
  assert.equal(result[0].imageReviewStatus, "approved");
});

test("getInternalReviewIllustrationsForProcedure includes draft non-patient-facing illustrations", async () => {
  const approved = buildIllustrationRow({
    id: "ill-approved",
    patientFacing: true,
    imageReviewStatus: "approved",
  });
  const draft = buildIllustrationRow({
    id: "ill-draft",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
    procedureNameEn: "Capsule Endoscopy",
  });

  illustrationFindManyHandler = async () => [draft, approved];

  const { getInternalReviewIllustrationsForProcedure } = await import(
    "@/lib/server/clinical-knowledge/services/illustration-service"
  );

  const result = await getInternalReviewIllustrationsForProcedure("tenant-test", "proc-test");

  assert.equal(result.length, 2);
  const draftResult = result.find((i) => i.id === "ill-draft");
  assert.ok(draftResult, "expected draft illustration in review results");
  assert.equal(draftResult!.patientFacing, false);
  assert.equal(draftResult!.imageReviewStatus, "pending_clinical_review");
});

test("getInternalReviewIllustrationsForProcedureByNames matches by name regardless of approval status", async () => {
  const draft = buildIllustrationRow({
    id: "ill-draft-cystoscopy",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
    procedureNameEn: "Cystoscopy and removal of bladder tumour",
  });

  illustrationFindManyHandler = async () => [draft];

  const { getInternalReviewIllustrationsForProcedureByNames } = await import(
    "@/lib/server/clinical-knowledge/services/illustration-service"
  );

  const result = await getInternalReviewIllustrationsForProcedureByNames("tenant-test", [
    "Cystoscopy and removal of bladder tumour",
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "ill-draft-cystoscopy");
  assert.equal(result[0].patientFacing, false);
});
