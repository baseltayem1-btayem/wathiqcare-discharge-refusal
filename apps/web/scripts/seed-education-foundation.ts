// STALE EDUCATION DRIFT — excluded from apps/web/tsconfig.json type-check baseline.
// This script references Prisma models (educationPackage, educationVersion, etc.)
// that do not exist in schema.prisma. The project uses ProcedureEducation* models instead.
// Kept for reference; not imported by the active runtime.
// See docs/quality-baseline/typescript-error-classification.md

import "dotenv/config";
import { getPrisma } from "../src/lib/server/prisma";
import { approveEducationPackage, createEducationPackage } from "../src/lib/server/education-library-service";

async function main() {
  const prisma = getPrisma();
  const configuredTenantId = process.env.EDUCATION_DEMO_TENANT_ID?.trim() || null;
  const tenant = configuredTenantId
    ? await prisma.tenant.findUnique({ where: { id: configuredTenantId }, select: { id: true } })
    : await prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });

  if (!tenant?.id) {
    throw new Error("No tenant found for education seed");
  }

  const existing = await prisma.educationPackage.findFirst({
    where: {
      tenantId: tenant.id,
      packageKey: "general-anesthesia-education-package",
    },
    include: {
      currentVersion: true,
      assets: true,
    },
  });

  if (existing) {
    console.log(JSON.stringify({
      status: "exists",
      tenantId: tenant.id,
      packageId: existing.id,
      versionId: existing.currentVersionId,
      assetCount: existing.assets.length,
    }, null, 2));
    return;
  }

  const created = await createEducationPackage({
    tenantId: tenant.id,
    packageKey: "general-anesthesia-education-package",
    titleAr: "حزمة التثقيف الخاصة بالتخدير العام",
    titleEn: "General Anesthesia Education Package",
    summaryAr: "حزمة تجريبية تأسيسية تحتوي على أصول تعليمية بديلة فقط دون محتوى فعلي.",
    summaryEn: "Foundational demo package with placeholder educational assets only and no imported media.",
    clinicalDomain: "anesthesia",
    procedureCode: "general-anesthesia",
    versionLabel: "v1.0-demo",
    manifestJson: {
      packageKind: "demo-foundation",
      procedureFamily: "anesthesia",
      languages: ["ar", "en"],
      placeholderOnly: true,
    },
    metadata: {
      phase: "phase5-educational-content-foundation",
      sourceStrategy: "manual_placeholder_only",
    },
    placeholderAssets: [
      {
        assetKey: "overview-image-placeholder",
        assetType: "IMAGE",
        title: "General Anesthesia Overview Placeholder",
        locale: "bilingual",
        sourceUri: "placeholder://general-anesthesia/overview-image",
        thumbnailUri: "placeholder://general-anesthesia/overview-image-thumb",
        metadata: { placeholder: true, category: "overview" },
      },
      {
        assetKey: "risks-video-placeholder",
        assetType: "VIDEO",
        title: "General Anesthesia Risks Placeholder",
        locale: "bilingual",
        sourceUri: "placeholder://general-anesthesia/risks-video",
        thumbnailUri: "placeholder://general-anesthesia/risks-video-thumb",
        metadata: { placeholder: true, category: "risks" },
      },
      {
        assetKey: "post-procedure-instructions-placeholder",
        assetType: "POST_PROCEDURE",
        title: "General Anesthesia Recovery Instructions Placeholder",
        locale: "bilingual",
        sourceUri: "placeholder://general-anesthesia/recovery-instructions",
        metadata: { placeholder: true, category: "post_procedure" },
      },
    ],
  });

  const approved = await approveEducationPackage({
    tenantId: tenant.id,
    packageId: created.id,
    versionId: created.currentVersionId,
  });

  console.log(JSON.stringify({
    status: "seeded",
    tenantId: tenant.id,
    packageId: approved.id,
    currentVersionId: approved.currentVersionId,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});