import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";

export async function requireTrakCareOperationalContext(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:create");
  const context = buildTrakCareRequestContext(request, auth);
  return { auth, context };
}
