import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import {
  createInformedConsentsRouteHandlers,
} from "@/lib/server/module-api-route-handlers";
import {
  createTenantConsentRecord,
  listTenantConsentRecords,
} from "@/lib/server/module-consent-service";

const handlers = createInformedConsentsRouteHandlers({
  requireAuthFn: requireAuth,
  requireTenantOperationalAccessFn: requireTenantOperationalAccess,
  listTenantConsentRecordsFn: listTenantConsentRecords,
  createTenantConsentRecordFn: createTenantConsentRecord,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
