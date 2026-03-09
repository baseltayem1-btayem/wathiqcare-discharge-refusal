import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { deriveConsentRecommendations } from "@/lib/server/governance/consent-intelligence";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

export async function POST(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    requireAuth(request);

    const payload = (await request.json().catch(() => null)) as
      | {
          procedureCode?: string;
          highRisk?: boolean;
          requiresAnesthesia?: boolean;
          requiresBloodProducts?: boolean;
          serviceModel?: string;
          releaseRequestSubmitted?: boolean;
          patientCapacityStatus?: string;
          existingSignedConsentCodes?: string[];
          existingExpiredConsentCodes?: string[];
        }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const recommendations = deriveConsentRecommendations(payload);
    return NextResponse.json(recommendations);
  } catch (error) {
    return handleApiError(error);
  }
}
