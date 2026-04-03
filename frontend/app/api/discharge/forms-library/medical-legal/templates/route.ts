import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listMedicalLegalTemplates } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    return NextResponse.json(listMedicalLegalTemplates());
  } catch (error) {
    return handleApiError(error);
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
