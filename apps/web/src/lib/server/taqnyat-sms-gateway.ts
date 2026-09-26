import { sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
import type { SmsGateway } from "@/lib/server/patient-message-outbox-service";

function maskMobile(value: string): string {
  return value.replace(/\d(?=\d{4})/g, "*");
}

/**
 * Production SMS gateway for the patient-message outbox.
 *
 * Delegates to the shared Taqnyat client (fixed-IP SMS proxy transport with
 * timeout and normalization). The Taqnyat token never leaves the server and
 * is never logged; recipients are masked in all logs.
 */
export function createTaqnyatSmsGateway(): SmsGateway {
  return {
    async send({ recipient, message, idempotencyKey }) {
      console.log("[taqnyat-gateway] provider request start", {
        recipient: maskMobile(recipient),
        messageLength: message.length,
        idempotencyKey: idempotencyKey ?? null,
      });

      const result = await sendTaqnyatMessage({ recipient, message });

      if (result.ok) {
        console.log("[taqnyat-gateway] provider response accepted", {
          recipient: maskMobile(recipient),
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          statusCode: result.statusCode,
        });
        return { ok: true, providerMessageId: result.providerMessageId };
      }

      const errorCode =
        typeof result.response?.code === "string"
          ? result.response.code
          : "TAQNYAT_DELIVERY_FAILED";

      console.error("[taqnyat-gateway] provider response failure", {
        recipient: maskMobile(recipient),
        provider: result.provider,
        errorCode,
        statusCode: result.statusCode,
      });

      return {
        ok: false,
        providerMessageId: result.providerMessageId,
        errorCode,
        errorMessage:
          typeof result.response?.error === "string"
            ? result.response.error
            : JSON.stringify(result.response ?? {}),
      };
    },
  };
}
