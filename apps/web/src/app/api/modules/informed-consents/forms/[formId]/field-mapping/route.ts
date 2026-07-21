import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { createFieldMappingRouteHandlers } from "@/lib/server/field-mapping-route-handler";

const handlers = createFieldMappingRouteHandlers({
  requireModuleOperationalAccess,
  getPrisma,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const { GET, POST } = handlers;
