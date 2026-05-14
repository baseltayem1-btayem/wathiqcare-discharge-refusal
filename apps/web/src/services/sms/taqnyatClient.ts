import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";

export type TaqnyatSendArgs = {
  recipient: string;
  message: string;
};

export type TaqnyatSendResult = {
  ok: boolean;
  statusCode: number;
  providerMessageId: string | null;
  response: Record<string, unknown> | null;
};

function getSenderName(): string {
  return (
    process.env.TAQNYAT_SENDER_NAME?.trim()
    || process.env.SIGNATURE_SMS_SENDER?.trim()
    || "WathiqCare"
  );
}

function isSmsEnabled(): boolean {
  const raw = process.env.TAQNYAT_SMS_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function getBearerToken(): string {
  return (
    process.env.TAQNYAT_BEARER_TOKEN?.trim()
    || process.env.TAQNYAT_API_KEY?.trim()
    || process.env[SIGNATURE_CONFIG.taqniatApiKeyEnv]?.trim()
    || ""
  );
}

export function isTaqnyatReady(): boolean {
  return isSmsEnabled() && Boolean(getBearerToken());
}

export async function sendTaqnyatMessage(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const bearerToken = getBearerToken();
  if (!isSmsEnabled() || !bearerToken) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: { code: "TAQNYAT_NOT_CONFIGURED_OR_DISABLED" },
    };
  }

  const response = await fetch(`${SIGNATURE_CONFIG.taqniatApiUrl.replace(/\/$/, "")}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      recipients: [args.recipient],
      body: args.message,
      sender: getSenderName(),
    }),
  });

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  return {
    ok: response.ok,
    statusCode: response.status,
    providerMessageId: typeof parsed?.message_id === "string" ? parsed.message_id : null,
    response: parsed,
  };
}
