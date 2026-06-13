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

type SmsTransport = "taqnyat" | "gateway";

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

function getSmsTransport(): SmsTransport {
  const raw = process.env.SMS_TRANSPORT?.trim().toLowerCase();
  return raw === "gateway" ? "gateway" : "taqnyat";
}

function getBearerToken(): string {
  return (
    process.env.TAQNYAT_BEARER_TOKEN?.trim()
    || process.env.TAQNYAT_API_KEY?.trim()
    || process.env[SIGNATURE_CONFIG.taqniatApiKeyEnv]?.trim()
    || ""
  );
}

function getGatewayUrl(): string {
  return process.env.SMS_GATEWAY_URL?.trim() || "";
}

function getGatewaySecret(): string {
  return process.env.SMS_GATEWAY_SECRET?.trim() || "";
}

export function isTaqnyatReady(): boolean {
  if (!isSmsEnabled()) return false;

  if (getSmsTransport() === "gateway") {
    return Boolean(getGatewayUrl() && getGatewaySecret());
  }

  return Boolean(getBearerToken());
}

async function sendViaGateway(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const gatewayUrl = getGatewayUrl();
  const gatewaySecret = getGatewaySecret();

  if (!gatewayUrl || !gatewaySecret) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: {
        code: "SMS_GATEWAY_NOT_CONFIGURED",
      },
    };
  }

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wathiqcare-sms-secret": gatewaySecret,
    },
    body: JSON.stringify({
      mobile: args.recipient,
      message: args.message,
      sender: getSenderName(),
      provider: "taqnyat",
    }),
    cache: "no-store",
  });

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  const providerResponse =
    parsed && typeof parsed.providerResponse === "object" && parsed.providerResponse !== null
      ? parsed.providerResponse as Record<string, unknown>
      : parsed;

  const providerMessageId =
    typeof parsed?.providerMessageId === "string"
      ? parsed.providerMessageId
      : typeof providerResponse?.message_id === "string"
        ? providerResponse.message_id
        : null;

  return {
    ok: response.ok && parsed?.ok !== false,
    statusCode: response.status,
    providerMessageId,
    response: {
      transport: "gateway",
      gateway: parsed,
      providerResponse,
    },
  };
}

async function sendDirectToTaqnyat(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const bearerToken = getBearerToken();

  if (!bearerToken) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: {
        code: "TAQNYAT_NOT_CONFIGURED",
      },
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
    response: {
      transport: "taqnyat",
      providerResponse: parsed,
    },
  };
}

export async function sendTaqnyatMessage(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  if (!isSmsEnabled()) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: {
        code: "SMS_DISABLED",
      },
    };
  }

  if (getSmsTransport() === "gateway") {
    return sendViaGateway(args);
  }

  return sendDirectToTaqnyat(args);
}
