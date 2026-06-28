/**
 * Seed Clinical Knowledge Engine from the IMC approved consent library.
 *
 * Usage:
 *   npx tsx scripts/seed-clinical-knowledge.ts <tenant-id> [created-by-user-id]
 *
 * This script is additive and idempotent (uses stable IDs). It can be run
 * repeatedly for the same tenant without creating duplicates.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { buildImcSeedPlan, countSeedPlan } from "../src/lib/server/clinical-knowledge/migration/seed-from-imc";
import { buildDefaultRuleCreateInputs } from "../src/lib/server/clinical-knowledge/rules/default-rules";

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2];
  const createdByUserId = process.argv[3] || "system-migration";

  if (!tenantId) {
    console.error("Usage: npx tsx scripts/seed-clinical-knowledge.ts <tenant-id> [created-by-user-id]");
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    process.exit(1);
  }

  const plan = buildImcSeedPlan({ tenantId, createdByUserId });

  console.log("Seed plan counts:", countSeedPlan(plan));
  if (plan.warnings.length) {
    console.warn("Seed warnings:", plan.warnings);
  }

  await prisma.$transaction(async (tx) => {
    // 1. specialties
    if (plan.specialties.length) {
      await tx.clinicalSpecialty.createMany({
        data: plan.specialties,
        skipDuplicates: true,
      });
    }

    // 2. procedures
    if (plan.procedures.length) {
      await tx.clinicalProcedure.createMany({
        data: plan.procedures,
        skipDuplicates: true,
      });
    }

    // 3. consent forms (with tenant relation, so create individually)
    for (const entry of plan.consentForms) {
      await tx.consentForm.upsert({
        where: { id: entry.form.id as string },
        update: {},
        create: entry.form,
      });

      if (entry.sections.length) {
        await tx.consentFormSection.createMany({
          data: entry.sections,
          skipDuplicates: true,
        });
      }
    }

    // 4. education materials
    if (plan.educationMaterials.length) {
      await tx.educationMaterial.createMany({
        data: plan.educationMaterials,
        skipDuplicates: true,
      });
    }

    // 5. risk disclosures
    if (plan.riskDisclosures.length) {
      await tx.riskDisclosure.createMany({
        data: plan.riskDisclosures,
        skipDuplicates: true,
      });
    }

    // 6. packages + items
    for (const pkg of plan.packages) {
      await tx.clinicalKnowledgePackage.upsert({
        where: { id: pkg.package.id as string },
        update: {},
        create: pkg.package,
      });

      if (pkg.items.length) {
        await tx.packageItem.createMany({
          data: pkg.items,
          skipDuplicates: true,
        });
      }
    }

    // 7. governance events
    if (plan.governanceEvents.length) {
      await tx.governanceEvent.createMany({
        data: plan.governanceEvents,
        skipDuplicates: true,
      });
    }

    // 8. default decision rules
    const defaultRules = buildDefaultRuleCreateInputs(tenantId, createdByUserId);
    if (defaultRules.length) {
      await tx.decisionRule.createMany({
        data: defaultRules,
        skipDuplicates: true,
      });
    }
  });

  console.log("Clinical Knowledge Engine seeded successfully.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
