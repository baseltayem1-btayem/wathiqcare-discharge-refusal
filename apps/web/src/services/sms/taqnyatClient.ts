import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";

export type TaqnyatSendArgs = {
  recipient: string;
  message: string;
};

export type SmsProvider = "taqnyat" | "sms_proxy";

export type TaqnyatSendResult = {
  ok: boolean;
  statusCode: number;
  providerMessageId: string | null;
  response: Record<string, unknown> | null;
  provider: SmsProvider | null;
};

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "[REDACTED_PHONE]";
  }
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

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

function getSmsProxyUrl(): string {
  return process.env.SMS_PROXY_URL?.trim() ?? "";
}

function getSmsProxySecret(): string {
  return process.env.SMS_PROXY_SECRET?.trim() ?? "";
}

function getSmsProxySenderName(): string {
  return process.env.SMS_PROXY_SENDER_NAME?.trim() ?? "WATHIQID";
}

function isSmsProxyConfigured(): boolean {
  return Boolean(getSmsProxyUrl() && getSmsProxySecret());
}

/**
 * Normalize a Saudi mobile number to the proxy/Taqnyat-successful format:
 * 9665XXXXXXXX without a leading '+'.
 */
export function normalizeSaudiMobileForSms(recipient: string): string {
  let digits = recipient.replace(/\D/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `966${digits.slice(1)}`;
  }
  if (digits.startsWith("5") && digits.length === 9) {
    digits = `966${digits}`;
  }

  return digits;
}

export function isTaqnyatReady(): boolean {
  return isSmsProxyConfigured() || (isSmsEnabled() && Boolean(getBearerToken()));
}

function buildSendResult(
  response: Response,
  parsed: Record<string, unknown> | null,
  provider: SmsProvider,
): TaqnyatSendResult {
  const messageId =
    typeof parsed?.messageId === "string"
      ? parsed.messageId
      : typeof parsed?.message_id === "string"
        ? parsed.message_id
        : null;

  return {
    ok: response.ok,
    statusCode: response.status,
    providerMessageId: messageId,
    response: parsed,
    provider,
  };
}

async function sendViaSmsProxy(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const proxyUrl = getSmsProxyUrl().replace(/\/$/, "");
  const secret = getSmsProxySecret();
  const senderName = getSmsProxySenderName();
  const normalizedRecipient = normalizeSaudiMobileForSms(args.recipient);

  // Safe logging: mask recipient, never log secret.
  console.log("[sms_proxy] sending via proxy", {
    recipient: maskPhone(normalizedRecipient),
    senderName,
    messageLength: args.message.length,
  });

  try {
    const response = await fetch(`${proxyUrl}/api/v1/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wathiqcare-sms-secret": secret,
      },
      body: JSON.stringify({
        recipient: normalizedRecipient,
        senderName,
        message: args.message,
      }),
    });

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = (await response.json()) as Record<string, unknown>;
    } catch {
      parsed = null;
    }

    return buildSendResult(response, parsed, "sms_proxy");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sms_proxy] network error", { error: message, recipient: maskPhone(normalizedRecipient) });
    return {
      ok: false,
      statusCode: 0,
      providerMessageId: null,
      response: { code: "SMS_PROXY_NETWORK_ERROR", error: message },
      provider: "sms_proxy",
    };
  }
}

async function sendViaDirectTaqnyat(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  const bearerToken = getBearerToken();
  if (!isSmsEnabled() || !bearerToken) {
    return {
      ok: false,
      statusCode: 503,
      providerMessageId: null,
      response: { code: "TAQNYAT_NOT_CONFIGURED_OR_DISABLED" },
      provider: null,
    };
  }

  const normalizedRecipient = normalizeSaudiMobileForSms(args.recipient);

  console.log("[taqnyat] sending via direct API", {
    recipient: maskPhone(normalizedRecipient),
    sender: getSenderName(),
    messageLength: args.message.length,
  });

  try {
    const response = await fetch(`${SIGNATURE_CONFIG.taqniatApiUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        recipients: [normalizedRecipient],
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

    return buildSendResult(response, parsed, "taqnyat");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[taqnyat] network error", { error: message, recipient: maskPhone(normalizedRecipient) });
    return {
      ok: false,
      statusCode: 0,
      providerMessageId: null,
      response: { code: "TAQNYAT_NETWORK_ERROR", error: message },
      provider: "taqnyat",
    };
  }
}

export async function sendTaqnyatMessage(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
  if (isSmsProxyConfigured()) {
    return sendViaSmsProxy(args);
  }

  return sendViaDirectTaqnyat(args);
}
