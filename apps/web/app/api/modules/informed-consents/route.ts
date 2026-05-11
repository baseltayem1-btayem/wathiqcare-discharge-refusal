<<<<<<< Updated upstream
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { userRoleAllows } from "@/lib/server/roles";
=======
import { requireModuleOperationalAccess } from "@/lib/server/auth";
>>>>>>> Stashed changes
import {
  createInformedConsentsRouteHandlers,
} from "@/lib/server/module-api-route-handlers";
import {
  createTenantConsentRecord,
  listTenantConsentRecords,
} from "@/lib/server/module-consent-service";
import { INFORMED_CONSENTS_ALLOWED_ROLES, isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

const handlers = createInformedConsentsRouteHandlers({
  requireAuthFn: (request) => requireModuleOperationalAccess(request, "informed-consents"),
  requireTenantOperationalAccessFn: () => undefined,
  listTenantConsentRecordsFn: listTenantConsentRecords,
  createTenantConsentRecordFn: createTenantConsentRecord,
});

async function enforceInformedConsentsAccess(request: NextRequest): Promise<Response | null> {
  if (!isInformedConsentsEnabled()) {
    return Response.json({ ok: false, error: "Informed Consents module is disabled by release flag." }, { status: 503 });
  }

  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    if (!userRoleAllows(auth.role, INFORMED_CONSENTS_ALLOWED_ROLES)) {
      throw new ApiError(403, "Insufficient role permissions for Informed Consents");
    }

    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const blocked = await enforceInformedConsentsAccess(request);
  if (blocked) return blocked;
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const blocked = await enforceInformedConsentsAccess(request);
  if (blocked) return blocked;
  return handlers.POST(request);
}
