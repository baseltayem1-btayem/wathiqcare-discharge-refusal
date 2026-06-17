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

function getSmsTransport(): string {
  return (process.env.SMS_TRANSPORT || "").trim().toLowerCase();
}

function isGatewayTransport(): boolean {
  return getSmsTransport() === "gateway";
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

function getGatewayUrl(): string {
  return (process.env.SMS_GATEWAY_URL || "").trim().replace(/\/$/, "");
}

function getGatewaySendUrl(): string {
  const gatewayUrl = getGatewayUrl();

  if (!gatewayUrl) {
    return "";
  }

  return gatewayUrl.endsWith("/v1/sms/send")
    ? gatewayUrl
    : `${gatewayUrl}/v1/sms/send`;
}

function getGatewaySecret(): string {
  return (process.env.SMS_GATEWAY_SECRET || "").trim();
}

function isGatewayReady(): boolean {
  return Boolean(getGatewayUrl() && getGatewaySecret());
}

export function isTaqnyatReady(): boolean {
  if (isGatewayTransport()) {
    return isSmsEnabled() && isGatewayReady();
  }

  return isSmsEnabled() && Boolean(getBearerToken());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSmsRecipient(recipient: string): string {
  const digits = recipient.replace(/\D/g, "");

  if (digits.startsWith("009665") && digits.length === 14) {
    return digits.slice(2);
  }

  if (digits.startsWith("9665") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("05") && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }

  if (digits.startsWith("5") && digits.length === 9) {
    return `966${digits}`;
  }

  return digits;
}


function isProviderSuccess(response: Response, parsed: Record<string, unknown> | null): boolean {
  if (!response.ok) return false;
  if (!parsed) return true;

  return (
    parsed.ok === true ||
    parsed.success === true ||
    parsed.accepted === true ||
    parsed.status === "sent" ||
    parsed.status === "accepted" ||
    parsed.status === "queued" ||
    parsed.code === "OK" ||
    parsed.code === "ACCEPTED"
  );
}

function extractProviderMessageId(response: Record<string, unknown> | null): string | null {
  if (!response) return null;

  const direct =
    getString(response.messageId)
    || getString(response.message_id)
    || getString(response.id)
    || getString(response.referenceId);

  if (direct) return direct;

  const providerResponse = asRecord(response.providerResponse);
  if (!providerResponse) return null;

  return (
    getString(providerResponse.messageId)
    || getString(providerResponse.message_id)
    || getString(providerResponse.id)
    || null
  );
}

async function sendViaGateway(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const gatewayUrl = getGatewayUrl();
  const gatewaySecret = getGatewaySecret();

  if (!isSmsEnabled() || !gatewayUrl || !gatewaySecret) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: { code: "SMS_GATEWAY_NOT_CONFIGURED_OR_DISABLED" },
    };
  }

  const response = await fetch(getGatewaySendUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wathiqcare-sms-secret": gatewaySecret,
    },
    body: JSON.stringify({
      mobile: normalizeSmsRecipient(args.recipient),
      message: args.message,
      referenceId: crypto.randomUUID(),
    }),
  });

  const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  return {
    ok: isProviderSuccess(response, parsed),
    statusCode: response.status,
    providerMessageId: extractProviderMessageId(parsed),
    response: parsed,
  };
}

async function sendViaTaqnyatDirect(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
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
      recipients: [normalizeSmsRecipient(args.recipient)],
      body: args.message,
      sender: getSenderName(),
    }),
  });

  const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  return {
    ok: response.ok,
    statusCode: response.status,
    providerMessageId: extractProviderMessageId(parsed),
    response: parsed,
  };
}

export async function sendTaqnyatMessage(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  if (isGatewayTransport()) {
    return sendViaGateway(args);
  }

  return sendViaTaqnyatDirect(args);
}


