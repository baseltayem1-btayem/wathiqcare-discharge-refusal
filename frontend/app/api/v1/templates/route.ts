import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";
import { GOVERNANCE_TEMPLATE_SEEDS } from "@/lib/server/governance/template-registry";

const governanceDb = prisma as unknown as {
  consentTemplate: {
    findMany: (args: {
      where: { tenantId: string };
      orderBy: { createdAt: "asc" };
    }) => Promise<Array<Record<string, unknown>>>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  };
  $transaction: <T>(promises: Promise<T>[]) => Promise<T[]>;
};

export async function GET(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);

    const existing = await governanceDb.consentTemplate.findMany({
      where: { tenantId: auth.tenant_id },
      orderBy: { createdAt: "asc" },
    });

    if (existing.length > 0) {
      return NextResponse.json(toJsonSafe(existing));
    }

    const seeded = await governanceDb.$transaction(
      GOVERNANCE_TEMPLATE_SEEDS.map((seed) =>
        governanceDb.consentTemplate.create({
          data: {
            tenantId: auth.tenant_id,
            templateName: seed.name,
            templateType: seed.code,
            languageMode: "bilingual",
            formNumber: seed.formNumber,
            version: "1.0",
            active: true,
            requiresWitness: false,
            allowsSms: true,
            allowsNafath: false,
            allowsTablet: true,
            linkedPolicyReference: "IMC-governance",
            metadata: {
              category: seed.category,
              legalWordingImmutable: true,
            },
          },
        }),
      ),
    );

    return NextResponse.json(toJsonSafe(seeded));
  } catch (error) {
    return handleApiError(error);
  }
}
