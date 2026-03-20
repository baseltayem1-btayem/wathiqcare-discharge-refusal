import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

function flag(name: string, fallback = "false"): boolean {
  return (process.env[name] ?? fallback).toLowerCase() === "true";
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    return NextResponse.json({
      his: {
        enabled: flag("HIS_INTEGRATION_ENABLED", "true"),
        endpoint: "/his/patient/{mrn}",
      },
      fhir: {
        enabled: flag("FHIR_INTEGRATION_ENABLED", "true"),
        resources: ["Patient", "Encounter", "Procedure", "Consent"],
      },
      docuWare: {
        enabled: flag("DOCUWARE_ENABLED"),
      },
      sharePoint: {
        enabled: flag("SHAREPOINT_ENABLED"),
      },
      erp: {
        enabled: flag("ERP_ENABLED"),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
