import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { recordCaseWitness } from "@/lib/server/case-compliance-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const payload = (await request.json().catch(() => ({}))) as {
      action?: "add" | "update" | "remove";
      witness_id?: string;
      witness_name?: string;
      witness_role?: string;
      full_name?: string;
      role?: string;
      role_category?: "clinical" | "non_clinical";
      id_type?: string;
      id_number?: string;
      mobile_number?: string;
      attestation_confirmed?: boolean;
      attestation_language?: "en" | "ar";
      attestation_version?: string;
      signature_type?: "DIGITAL_SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
      signature_hash?: string;
      otp_reference?: string;
      verification_status?: "VERIFIED" | "PENDING" | "FAILED";
      manual_fallback_used?: boolean;
      device_fingerprint?: string;
      force_unlock?: boolean;
      unlock_reason?: string;
    };
    const updated = await recordCaseWitness(auth, caseId, payload, request);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}