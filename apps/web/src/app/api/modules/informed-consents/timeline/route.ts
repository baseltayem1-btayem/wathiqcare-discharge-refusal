import { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { handleTimelineRequest } from "./route-handler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<Response> {
  return handleTimelineRequest(request, {
    requireModuleOperationalAccess,
    getPrisma,
  });
}
