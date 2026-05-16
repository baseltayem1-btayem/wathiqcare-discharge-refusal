import { requireModuleOperationalAccess } from "@/lib/server/auth";
import type { NextRequest } from "next/server";
import {

  createInformedConsentsRouteHandlers,
} from "@/lib/server/module-api-route-handlers";
import {
  createTenantConsentRecord,
  listTenantConsentRecords,
} from "@/lib/server/module-consent-service";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createInformedConsentsRouteHandlers({
  requireAuthFn: (request) => requireModuleOperationalAccess(request, "informed-consents"),
  requireTenantOperationalAccessFn: () => undefined,
  listTenantConsentRecordsFn: listTenantConsentRecords,
  createTenantConsentRecordFn: createTenantConsentRecord,
});

export async function GET(request: NextRequest) {
  if (!isInformedConsentsEnabled()) {
    return Response.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isInformedConsentsEnabled()) {
    return Response.json({ ok: false, error: "Informed Consents module is disabled." }, { status: 503 });
  }
  return handlers.POST(request);
}
