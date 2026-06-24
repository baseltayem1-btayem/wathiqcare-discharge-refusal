import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { createPromissoryNotesRouteHandlers } from "@/lib/server/module-api-route-handlers";
import {
  createTenantPromissoryNote,
  listTenantPromissoryNotes,
} from "@/lib/server/promissory-note-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createPromissoryNotesRouteHandlers({
  requireAuthFn: (request) => requireModuleOperationalAccess(request, "promissory-notes"),
  requireTenantOperationalAccessFn: () => undefined,
  listTenantPromissoryNotesFn: listTenantPromissoryNotes,
  createTenantPromissoryNoteFn: createTenantPromissoryNote,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
