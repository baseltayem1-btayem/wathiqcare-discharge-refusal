import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env" });

import { PrismaClient, $Enums } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.env.TENANT_ID || "efe052b7-a8ac-4962-a021-8c01931514a7";
  const moduleKey = process.env.MODULE_KEY || "informed-consents";
  const rawValue = process.env.ENABLED;
  const value = rawValue === "1" || rawValue?.toLowerCase() === "true";
  const scopeRef = `${tenantId}:${moduleKey}`;

  const existing = await prisma.featureFlagOverride.findUnique({
    where: {
      scope_scopeRef_key: {
        scope: $Enums.FeatureFlagScope.MODULE,
        scopeRef,
        key: "ENABLE_CONTENT_MAPPING_ENGINE",
      },
    },
  });

  let record;
  if (existing) {
    record = await prisma.featureFlagOverride.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    record = await prisma.featureFlagOverride.create({
      data: {
        scope: $Enums.FeatureFlagScope.MODULE,
        scopeRef,
        key: "ENABLE_CONTENT_MAPPING_ENGINE",
        value,
        tenantId,
        moduleKey,
        updatedBy: null,
      },
    });
  }

  console.log("feature flag set:", {
    key: record.key,
    scope: record.scope,
    scopeRef: record.scopeRef,
    value: record.value,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
