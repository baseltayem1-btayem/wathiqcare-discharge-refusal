type SendSmsArgs = {
  mobile: string;
  message: string;
};

export function isTaqnyatConfigured(): boolean {
  return Boolean(process.env.TAQNYAT_API_KEY?.trim() && process.env.TAQNYAT_SENDER_NAME?.trim());
}

export function buildArabicSigningSms(signingLink: string): string {
  return `عزيزي المريض، يرجى توقيع مستندات رفض الخروج الطبي عبر الرابط التالي: ${signingLink}`;
}

export async function sendTaqnyatSms(args: SendSmsArgs): Promise<{ success: boolean; response: Record<string, unknown> | null }> {
  const apiKey = process.env.TAQNYAT_API_KEY?.trim();
  const sender = process.env.TAQNYAT_SENDER_NAME?.trim();

  if (!apiKey || !sender) {
    return { success: false, response: { message: "TAQNYAT_NOT_CONFIGURED" } };
  }

  const payload = {
    recipients: [args.mobile],
    body: args.message,
    sender,
  };

  const response = await fetch("https://api.taqnyat.sa/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json: Record<string, unknown> | null = null;
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  return {
    success: response.ok,
    response: json,
  };
}
