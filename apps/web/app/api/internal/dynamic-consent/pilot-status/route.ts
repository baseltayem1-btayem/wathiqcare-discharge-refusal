/**
 * Internal Pilot Rollout Status API
 *
 * Authenticated, feature-gated (`engine=dynamic-preview` or
 * `pilot=dynamic-consent`). Returns the pilot rollout status for the
 * authenticated subject. No DB access. No DB writes. No external
 * calls. Audit event is built in memory only and returned in the
 * response — not persisted.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ENABLE_DYNAMIC_CONSENT_ENGINE } from "@/lib/config/feature-flags";
import {
  buildPilotRolloutStatus,
  isPilotExplicitlyRequested,
} from "@/modules/consent-engine/pilot";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requested = isPilotExplicitlyRequested({
      searchParams,
      featureFlagEnabled: ENABLE_DYNAMIC_CONSENT_ENGINE,
    });

    if (!requested) {
      return NextResponse.json(
        {
          success: false,
          error: "Pilot rollout status is disabled",
          hint: "Enable with ENABLE_DYNAMIC_CONSENT_ENGINE=true, ?engine=dynamic-preview, or ?pilot=dynamic-consent",
        },
        { status: 403 },
      );
    }

    const auth = await requireAuth(request);

    const status = buildPilotRolloutStatus({
      email: auth.email ?? null,
      specialty: searchParams.get("specialty"),
      searchParams,
      featureFlagEnabled: ENABLE_DYNAMIC_CONSENT_ENGINE,
      renderer: searchParams.get("renderer") ?? undefined,
      evidenceEnabled: searchParams.get("evidence") === "true",
    });

    return NextResponse.json(
      { success: true, status },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-WC-Preview": "dynamic-consent-pilot-status",
        },
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
