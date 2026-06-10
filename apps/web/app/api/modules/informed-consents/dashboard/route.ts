import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    pendingConsents: 7,
    signedToday: 12,
    anesthesiaQueue: 4,
    complianceScore: 98,
    awaitingPatientSignature: 2,
  });
}
