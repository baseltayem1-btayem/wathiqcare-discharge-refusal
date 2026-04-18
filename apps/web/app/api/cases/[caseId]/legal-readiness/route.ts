import { NextRequest } from "next/server";

import { GET as dischargeGet } from "../../../discharge/cases/[caseId]/legal-readiness/route";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return dischargeGet(request, context);
}
