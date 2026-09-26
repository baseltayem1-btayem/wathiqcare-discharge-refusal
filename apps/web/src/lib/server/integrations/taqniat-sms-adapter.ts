/**
 * Taqniat SMS Adapter
 *
 * Sends SMS signing link notifications via Taqniat (Saudi SMS provider)
 * or through the WathiqCare SMS Gateway Proxy when configured.
 * Reads credentials from environment — never hardcoded.
 *
 * If neither the SMS proxy nor Taqniat credentials are configured,
 * operates in stub (console-log) mode.
 */

import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";
import { getEnvironmentConfig } from "@/lib/environment/environment";

export interface SmsDeliveryResult {
  messageId?: string;
  status: "sent" | "failed" | "stub";
  error?: string;
  provider?: "taqnyat" | "sms_proxy" | null;
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

  private get proxyUrl(): string {
    return process.env.SMS_PROXY_URL?.trim() ?? "";
  }

  private get proxySecret(): string {
    return process.env.SMS_PROXY_SECRET?.trim() ?? "";
  }

  private get proxySenderName(): string {
    return process.env.SMS_PROXY_SENDER_NAME?.trim() ?? "WATHIQID";
  }

  private get isProxyConfigured(): boolean {
    return Boolean(this.proxyUrl && this.proxySecret);
  }

  private get isDirectConfigured(): boolean {
    return !!this.apiKey;
  }

  private get isConfigured(): boolean {
    return this.isProxyConfigured || this.isDirectConfigured;
  }

  /**
   * Send an SMS message via the configured provider.
   * Prefers the SMS Gateway Proxy when SMS_PROXY_URL and SMS_PROXY_SECRET are set.
   */
  async send(message: SmsMessage): Promise<SmsDeliveryResult> {
    if (!this.isConfigured) {
      const isProduction = getEnvironmentConfig().isProduction;
      if (isProduction) {
        return {
          status: "failed",
          error: `Taqniat SMS is not configured in production. Set ${SIGNATURE_CONFIG.taqniatApiKeyEnv}.`,
        };
      }
      console.warn(
        `[TaqniatSmsAdapter] Not configured — stub mode. Set ${SIGNATURE_CONFIG.taqniatApiKeyEnv}.`,
        { to: message.to, bodyPreview: message.body.substring(0, 50) }
      );
      return { status: "stub" };
    }

    if (this.isProxyConfigured) {
      return this.sendViaProxy(message);
    }

    return this.sendViaDirectTaqniat(message);
  }

  private async sendViaProxy(message: SmsMessage): Promise<SmsDeliveryResult> {
    const normalizedRecipient = normalizeSaudiMobileForSms(message.to);

    logRuntimeEvent({
      module: "sms_adapter",
      event: "sms_proxy_send",
      severity: "info",
      details: {
        to: maskPhone(normalizedRecipient),
        senderName: this.proxySenderName,
        bodyPreview: message.body.substring(0, 50),
      },
    });

    try {
      const res = await fetch(`${this.proxyUrl.replace(/\/$/, "")}/api/v1/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wathiqcare-sms-secret": this.proxySecret,
        },
        body: JSON.stringify({
          recipient: normalizedRecipient,
          senderName: this.proxySenderName,
          message: message.body,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          status: "failed",
          provider: "sms_proxy",
          error: `SMS proxy failed: ${res.status} ${text}`,
        };
      }

      const data = (await res.json()) as { messageId?: string; message_id?: string };
      return {
        status: "sent",
        provider: "sms_proxy",
        messageId: data.messageId ?? data.message_id,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: "sms_proxy",
        error: `SMS proxy exception: ${String(err)}`,
      };
    }
  }

  private async sendViaDirectTaqniat(message: SmsMessage): Promise<SmsDeliveryResult> {
    const normalizedRecipient = normalizeSaudiMobileForSms(message.to);

    logRuntimeEvent({
      module: "sms_adapter",
      event: "taqniat_direct_send",
      severity: "info",
      details: {
        to: maskPhone(normalizedRecipient),
        sender: message.sender ?? "WathiqCare",
        bodyPreview: message.body.substring(0, 50),
      },
    });

    try {
      const res = await fetch(`${this.apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          recipient: normalizedRecipient,
          message: message.body,
          sender: message.sender ?? "WathiqCare",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          status: "failed",
          provider: "taqnyat",
          error: `Taqniat SMS failed: ${res.status} ${text}`,
        };
      }

      const data = (await res.json()) as { message_id?: string };
      return {
        status: "sent",
        provider: "taqnyat",
        messageId: data.message_id,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: "taqnyat",
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
