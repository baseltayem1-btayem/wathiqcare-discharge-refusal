import { NextRequest } from "next/server";

import {
  GET as dischargeGet,
  POST as dischargePost,
} from "../../../discharge/cases/[caseId]/legal-package/route";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return dischargeGet(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return dischargePost(request, context);
}
