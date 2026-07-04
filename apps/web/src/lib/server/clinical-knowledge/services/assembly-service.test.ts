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

const now = new Date();
const tenantId = "tenant-test";
const procedureId = "proc-capsule";

function buildProcedure() {
  return {
    id: procedureId,
    tenantId,
    code: "capsule-endoscopy",
    nameEn: "Capsule Endoscopy",
    nameAr: "تنظير الكبسولة",
    shortNameEn: null,
    shortNameAr: null,
    specialtyId: "spec-gi",
    departmentName: "Gastroenterology",
    categoryCode: "PROCEDURE_CONSENT",
    typicalDurationMinutes: 60,
    anesthesiaRequired: false,
    keywords: ["capsule endoscopy"],
    externalMappings: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
    specialty: { code: "GI", nameEn: "Gastroenterology", nameAr: "جهاز هضمي" },
  };
}

function buildPackage() {
  return {
    id: "pkg-capsule",
    tenantId,
    procedureId,
    version: "1.0.0",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    effectiveDate: now,
    expiryDate: null,
    status: "PUBLISHED",
    governanceSnapshot: null,
    requiredParticipantsSnapshot: null,
    packageSnapshot: null,
    supersededByPackageId: null,
    createdByUserId: "user-test",
    publishedByUserId: "user-test",
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "item-form",
        tenantId,
        packageId: "pkg-capsule",
        itemType: "CONSENT_FORM",
        itemId: "form-capsule",
        orderIndex: 0,
        isRequired: true,
        packageOverrides: null,
      },
    ],
  };
}

function buildForm() {
  return {
    id: "form-capsule",
    tenantId,
    code: "CAPSULE_CONSENT",
    titleEn: "Capsule Endoscopy Consent",
    titleAr: "",
    formType: "PROCEDURE_CONSENT",
    riskLevel: "STANDARD",
    status: "PUBLISHED",
    version: "1.0.0",
    effectiveDate: now,
    expiryDate: null,
    governanceSnapshot: null,
    pdfTemplateUrl: null,
    requiresWitness: false,
    requiresInterpreter: false,
    createdByUserId: "user-test",
    publishedByUserId: "user-test",
    createdAt: now,
    updatedAt: now,
    sections: [],
  };
}

function buildIllustration(overrides: {
  id: string;
  patientFacing: boolean;
  imageReviewStatus: string;
  procedureNameEn?: string;
  procedureImageUrl?: string;
}) {
  return {
    id: overrides.id,
    tenantId,
    procedureId,
    procedureNameEn: overrides.procedureNameEn ?? "Capsule Endoscopy",
    procedureNameAr: "تنظير الكبسولة",
    specialty: "Gastroenterology",
    anatomyRegion: null,
    synonyms: [] as string[],
    anatomyImageUrl: null,
    procedureImageUrl: overrides.procedureImageUrl ?? "/educational/capsule.png",
    anatomyPromptEn: null,
    anatomyPromptAr: null,
    procedurePromptEn: "Prompt",
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

type FindManyArgs = { where?: Record<string, unknown> };

const scenario = {
  approvedIllustrations: [] as ReturnType<typeof buildIllustration>[],
  allIllustrations: [] as ReturnType<typeof buildIllustration>[],
};

const mockPrisma = {
  clinicalProcedure: {
    findFirst: async () => buildProcedure(),
  },
  clinicalKnowledgePackage: {
    findFirst: async () => buildPackage(),
  },
  consentForm: {
    findMany: async () => [buildForm()],
  },
  educationMaterial: {
    findMany: async () => [],
  },
  riskDisclosure: {
    findMany: async () => [],
  },
  clinicalKnowledgeIllustration: {
    findMany: async (args: FindManyArgs) => {
      if (
        args.where?.imageReviewStatus === "approved" &&
        args.where?.patientFacing === true
      ) {
        return scenario.approvedIllustrations;
      }
      return scenario.allIllustrations;
    },
  },
  decisionRule: {
    findMany: async () => [],
  },
} as unknown as PrismaClient;

(global as typeof globalThis & { __wathiqcarePrisma__?: PrismaClient }).__wathiqcarePrisma__ =
  mockPrisma;

test("assembleKnowledgePackage excludes draft illustrations in patient-facing mode", async () => {
  const approved = buildIllustration({
    id: "ill-approved",
    patientFacing: true,
    imageReviewStatus: "approved",
  });
  const draft = buildIllustration({
    id: "ill-draft",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
  });

  scenario.approvedIllustrations = [approved];
  scenario.allIllustrations = [approved, draft];

  const { assembleKnowledgePackage } = await import(
    "@/lib/server/clinical-knowledge/services/assembly-service"
  );

  const result = await assembleKnowledgePackage({
    tenantId,
    procedureCode: "capsule-endoscopy",
    reviewMode: false,
  });

  assert.equal(result.found, true);
  assert.ok(result.assembly);
  assert.equal(result.assembly!.illustrations.length, 1);
  assert.equal(result.assembly!.illustrations[0].id, "ill-approved");
  assert.equal(result.assembly!.illustrations[0].patientFacing, true);
});

test("assembleKnowledgePackage includes draft illustrations in reviewMode", async () => {
  const approved = buildIllustration({
    id: "ill-approved",
    patientFacing: true,
    imageReviewStatus: "approved",
  });
  const draft = buildIllustration({
    id: "ill-draft",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
    procedureNameEn: "Capsule Endoscopy",
  });

  scenario.approvedIllustrations = [approved];
  scenario.allIllustrations = [approved, draft];

  const { assembleKnowledgePackage } = await import(
    "@/lib/server/clinical-knowledge/services/assembly-service"
  );

  const result = await assembleKnowledgePackage({
    tenantId,
    procedureCode: "capsule-endoscopy",
    reviewMode: true,
  });

  assert.equal(result.found, true);
  assert.ok(result.assembly);
  assert.equal(result.assembly!.illustrations.length, 2);

  const draftIllustration = result.assembly!.illustrations.find((i) => i.id === "ill-draft");
  assert.ok(draftIllustration, "expected draft illustration in review mode assembly");
  assert.equal(draftIllustration!.patientFacing, false);
  assert.equal(draftIllustration!.imageReviewStatus, "pending_clinical_review");
});

test("assembleKnowledgePackage preserves patientFacing=false and pending status for draft images", async () => {
  const draft = buildIllustration({
    id: "ill-draft-cystoscopy",
    patientFacing: false,
    imageReviewStatus: "pending_clinical_review",
    procedureNameEn: "Cystoscopy and removal of bladder tumour",
    procedureImageUrl: "/educational/cystoscopy.png",
  });

  scenario.approvedIllustrations = [];
  scenario.allIllustrations = [draft];

  const { assembleKnowledgePackage } = await import(
    "@/lib/server/clinical-knowledge/services/assembly-service"
  );

  const result = await assembleKnowledgePackage({
    tenantId,
    procedureCode: "cystoscopy-and-removal-of-bladder-tumour",
    reviewMode: true,
  });

  assert.equal(result.found, true);
  assert.ok(result.assembly);
  assert.equal(result.assembly!.illustrations.length, 1);
  assert.equal(result.assembly!.illustrations[0].patientFacing, false);
  assert.equal(result.assembly!.illustrations[0].imageReviewStatus, "pending_clinical_review");
  assert.equal(
    result.assembly!.illustrations[0].procedureImageUrl,
    "/educational/cystoscopy.png",
  );
});
