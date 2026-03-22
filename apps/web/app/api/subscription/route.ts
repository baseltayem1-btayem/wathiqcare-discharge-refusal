import { NextRequest } from "next/server";
import { GET as getSummary } from "@/app/api/subscription/summary/route";

export async function GET(request: NextRequest) {
    return getSummary(request);
}
