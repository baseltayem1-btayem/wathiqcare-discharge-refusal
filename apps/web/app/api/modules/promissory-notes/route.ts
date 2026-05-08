import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import {
  createPromissoryNotesRouteHandlers,
} from "@/lib/server/module-api-route-handlers";
import {
  createTenantPromissoryNote,
  listTenantPromissoryNotes,
} from "@/lib/server/promissory-note-service";

const handlers = createPromissoryNotesRouteHandlers({
  requireAuthFn: requireAuth,
  requireTenantOperationalAccessFn: requireTenantOperationalAccess,
  listTenantPromissoryNotesFn: listTenantPromissoryNotes,
  createTenantPromissoryNoteFn: createTenantPromissoryNote,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
