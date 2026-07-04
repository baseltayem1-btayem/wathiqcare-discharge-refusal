/**
 * SMS Gateway Proxy — Taqnyat Provider
 *
 * Sends SMS via Taqnyat API. Bearer token is held only in proxy memory.
 */

import type { ProxyConfig } from "./config.js";
import { maskMobileNumber, sanitizeLogMessage } from "./logging.js";

export type TaqnyatSendArgs = {
  recipient: string;
  message: string;
  sender: string;
  correlationId?: string;
};

export type TaqnyatSendResult = {
  ok: boolean;
  statusCode: number;
  providerMessageId: string | null;
  providerStatus: string | null;
  response: Record<string, unknown> | null;
};

export function createTaqnyatProvider(config: ProxyConfig) {
  async function send(args: TaqnyatSendArgs): Promise<TaqnyatSendResult> {
    const apiUrl = config.taqnyatApiUrl.replace(/\/$/, "") + "/messages";

    const body = {
      recipients: [args.recipient],
      body: args.message,
      sender: args.sender,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.taqnyatBearerToken}`,
      },
      body: JSON.stringify(body),
    });

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = (await response.json()) as Record<string, unknown>;
    } catch {
      parsed = null;
    }

    const providerMessageId =
      typeof parsed?.messageId === "string"
        ? parsed.messageId
        : typeof parsed?.message_id === "string"
          ? parsed.message_id
          : null;

    const providerStatus =
      typeof parsed?.statusCode === "string"
        ? parsed.statusCode
        : typeof parsed?.status === "string"
          ? parsed.status
          : null;

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: response.ok ? "info" : "warn",
        event: "taqnyat_send_attempt",
        correlationId: args.correlationId,
        recipientMasked: maskMobileNumber(args.recipient),
        statusCode: response.status,
        providerMessageId,
        providerStatus,
        ok: response.ok,
      }),
    );

    return {
      ok: response.ok,
      statusCode: response.status,
      providerMessageId,
      providerStatus,
      response: parsed,
    };
  }

  return { send };
}

export type TaqnyatProvider = ReturnType<typeof createTaqnyatProvider>;
