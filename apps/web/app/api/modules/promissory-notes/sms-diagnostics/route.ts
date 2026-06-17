import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { isTaqnyatReady } from "@/services/sms/taqnyatClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function safeUrlHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

export async function GET(request: NextRequest) {
  await requireModuleOperationalAccess(request, "promissory-notes");

  const smsEnabled = (process.env.TAQNYAT_SMS_ENABLED || "").trim().toLowerCase();
  const transport = (process.env.SMS_TRANSPORT || "").trim().toLowerCase();

  return NextResponse.json({
    smsEnabledValue: smsEnabled || null,
    transportValue: transport || null,
    taqnyatReady: isTaqnyatReady(),
    gateway: {
      urlPresent: present(process.env.SMS_GATEWAY_URL),
      urlHost: safeUrlHost(process.env.SMS_GATEWAY_URL),
      secretPresent: present(process.env.SMS_GATEWAY_SECRET),
    },
    directTaqnyat: {
      bearerTokenPresent: present(process.env.TAQNYAT_BEARER_TOKEN),
      apiKeyPresent: present(process.env.TAQNYAT_API_KEY),
      senderNamePresent: present(process.env.TAQNYAT_SENDER_NAME),
      signatureSenderPresent: present(process.env.SIGNATURE_SMS_SENDER),
    },
  });
}
