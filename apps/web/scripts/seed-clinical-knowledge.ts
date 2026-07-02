/**
 * Seed Clinical Knowledge Engine from the IMC approved consent library.
 *
 * Usage:
 *   npx tsx scripts/seed-clinical-knowledge.ts <tenant-id> [created-by-user-id]
 *
 * This script is additive and idempotent (uses stable IDs). It can be run
 * repeatedly for the same tenant without creating duplicates.
 *
 * The seed is performed in separate phases instead of one large interactive
 * transaction. This avoids Prisma P2028 transaction timeouts against remote
 * Preview / Production databases while keeping each phase atomic and
 * rerunnable thanks to upserts and skipDuplicates.
 */

import { PrismaClient } from "@prisma/client";
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

  // Phase 1: specialties
  if (plan.specialties.length) {
    console.log(`Seeding ${plan.specialties.length} specialty(s)...`);
    await prisma.clinicalSpecialty.createMany({
      data: plan.specialties,
      skipDuplicates: true,
    });
  }

  // Phase 2: procedures
  if (plan.procedures.length) {
    console.log(`Seeding ${plan.procedures.length} procedure(s)...`);
    await prisma.clinicalProcedure.createMany({
      data: plan.procedures,
      skipDuplicates: true,
    });
  }

  // Phase 3: consent forms + sections
  // Each form is processed independently so a remote transaction timeout cannot
  // roll back the entire seed. Stable IDs make reruns safe.
  if (plan.consentForms.length) {
    console.log(`Seeding ${plan.consentForms.length} consent form(s)...`);
    for (let i = 0; i < plan.consentForms.length; i++) {
      const entry = plan.consentForms[i];
      if ((i + 1) % 50 === 0 || i === plan.consentForms.length - 1) {
        console.log(`  ...form ${i + 1}/${plan.consentForms.length}`);
      }

      await prisma.consentForm.upsert({
        where: { id: entry.form.id as string },
        update: {},
        create: entry.form,
      });

      if (entry.sections.length) {
        await prisma.consentFormSection.createMany({
          data: entry.sections,
          skipDuplicates: true,
        });
      }
    }
  }

  // Phase 4: education materials
  if (plan.educationMaterials.length) {
    console.log(`Seeding ${plan.educationMaterials.length} education material(s)...`);
    await prisma.educationMaterial.createMany({
      data: plan.educationMaterials,
      skipDuplicates: true,
    });
  }

  // Phase 5: risk disclosures
  if (plan.riskDisclosures.length) {
    console.log(`Seeding ${plan.riskDisclosures.length} risk disclosure(s)...`);
    await prisma.riskDisclosure.createMany({
      data: plan.riskDisclosures,
      skipDuplicates: true,
    });
  }

  // Phase 5.5: educational illustrations
  if (plan.illustrations.length) {
    console.log(`Seeding ${plan.illustrations.length} illustration(s)...`);
    await prisma.clinicalKnowledgeIllustration.createMany({
      data: plan.illustrations,
      skipDuplicates: true,
    });
  }

  // Phase 6: packages + items
  if (plan.packages.length) {
    console.log(`Seeding ${plan.packages.length} package(s)...`);
    for (let i = 0; i < plan.packages.length; i++) {
      const pkg = plan.packages[i];
      if ((i + 1) % 50 === 0 || i === plan.packages.length - 1) {
        console.log(`  ...package ${i + 1}/${plan.packages.length}`);
      }

      await prisma.clinicalKnowledgePackage.upsert({
        where: { id: pkg.package.id as string },
        update: {},
        create: pkg.package,
      });

      if (pkg.items.length) {
        await prisma.packageItem.createMany({
          data: pkg.items,
          skipDuplicates: true,
        });
      }
    }
  }

  // Phase 7: governance events
  if (plan.governanceEvents.length) {
    console.log(`Seeding ${plan.governanceEvents.length} governance event(s)...`);
    await prisma.governanceEvent.createMany({
      data: plan.governanceEvents,
      skipDuplicates: true,
    });
  }

  // Phase 8: default decision rules
  const defaultRules = buildDefaultRuleCreateInputs(tenantId, createdByUserId);
  if (defaultRules.length) {
    console.log(`Seeding ${defaultRules.length} default decision rule(s)...`);
    await prisma.decisionRule.createMany({
      data: defaultRules,
      skipDuplicates: true,
    });
  }

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
