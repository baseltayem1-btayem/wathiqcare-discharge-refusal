import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import {
  resolveContentMapping,
  buildImcConsentPackage,
} from "@/lib/server/content-mapping-service";
import { resolveCkeConsentMapping } from "@/lib/server/clinical-knowledge/informed-consent-integration";
import { handleContentMappingResolve } from "./route-handler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ContentMappingResolveDependencies } from "./route-handler";

const dependencies = {
  requireModuleOperationalAccess,
  resolveFeatureFlag,
  writeConsentAudit,
  resolveContentMapping,
  buildImcConsentPackage,
  resolveCkeConsentMapping,
} as ContentMappingResolveDependencies;

export async function GET(request: NextRequest) {
  return handleContentMappingResolve(request, dependencies);
}
