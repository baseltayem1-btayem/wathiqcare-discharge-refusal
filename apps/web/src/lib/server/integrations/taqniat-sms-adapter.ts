/**
 * Taqniat SMS Adapter
 *
 * Sends SMS signing link notifications via Taqniat (Saudi SMS provider).
 * Reads credentials from environment — never hardcoded.
 *
 * If TAQNIAT_API_KEY is not set, operates in stub (console-log) mode.
 */

import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";
import { logRuntimeEvent } from "@/lib/server/runtime-observability";

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "[REDACTED_PHONE]";
  }
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export interface SmsDeliveryResult {
  messageId?: string;
  status: "sent" | "failed" | "stub";
  error?: string;
}

export interface SmsMessage {
  to: string;        // International format, e.g. +966501234567
  body: string;      // Plain text (Arabic or English)
  sender?: string;   // Approved sender ID (alphanumeric, max 11 chars)
}

export class TaqniatSmsAdapter {
  private get apiKey(): string {
    return process.env[SIGNATURE_CONFIG.taqniatApiKeyEnv] ?? "";
  }

  private get apiUrl(): string {
    return SIGNATURE_CONFIG.taqniatApiUrl;
  }

  private get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Send an SMS message via Taqniat.
   */
  async send(message: SmsMessage): Promise<SmsDeliveryResult> {
    if (!this.isConfigured) {
      logRuntimeEvent({
        module: "sms_adapter",
        event: "taqniat_stub_mode",
        severity: "warn",
        details: {
          to: maskPhone(message.to),
          bodyPreview: message.body.substring(0, 50),
          reason: "api_key_not_configured",
        },
      });
      return { status: "stub" };
    }

    try {
      const res = await fetch(`${this.apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          recipient: message.to,
          message: message.body,
          sender: message.sender ?? "WathiqCare",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          status: "failed",
          error: `Taqniat SMS failed: ${res.status} ${text}`,
        };
      }

      const data = (await res.json()) as { message_id?: string };
      return { status: "sent", messageId: data.message_id };
    } catch (err) {
      return {
        status: "failed",
        error: `Taqniat SMS exception: ${String(err)}`,
      };
    }
  }

  /**
   * Build a bilingual signing invitation SMS body.
   */
  buildSigningInvitationSms(signerName: string, signingUrl: string, expiryHours: number): string {
    return [
      `عزيزي ${signerName}،`,
      `تمت مشاركة وثيقة طبية قانونية معك عبر منصة WathiqCare تستلزم توقيعك.`,
      `الرابط: ${signingUrl}`,
      `صالح لمدة ${expiryHours} ساعة.`,
      `---`,
      `Dear ${signerName},`,
      `A medical-legal document on WathiqCare requires your signature.`,
      `Link: ${signingUrl}`,
      `Valid for ${expiryHours} hours.`,
    ].join("\n");
  }
}

/** Singleton instance */
export const taqniatSms = new TaqniatSmsAdapter();
