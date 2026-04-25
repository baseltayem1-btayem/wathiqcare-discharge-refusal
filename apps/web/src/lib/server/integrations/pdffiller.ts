import crypto from "node:crypto";

type PdfFillerRecipient = {
  name: string;
  email?: string;
  phone?: string;
};

type SignatureRequestPayload = {
  documentId: string;
  recipient: PdfFillerRecipient;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

type PdfFillerResponse = {
  id?: string;
  status?: string;
  signing_link?: string;
  signed_document_url?: string;
  certificate_url?: string;
  [key: string]: unknown;
};

const PDFFILLER_BASE_URL = "https://api.pdffiller.com/v2";

function getApiKey(): string | null {
  const key = process.env.PDFFILLER_API_KEY?.trim();
  return key ? key : null;
}

function getHeaders(): Headers {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("PDFFILLER_NOT_CONFIGURED");
  }

  return new Headers({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });
}

export function isPdfFillerConfigured(): boolean {
  return Boolean(getApiKey());
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function ensureOk(response: Response, operation: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const payload = await parseJsonSafe(response);
  const details = JSON.stringify(payload);
  throw new Error(`${operation} failed with status ${response.status}: ${details}`);
}

export async function uploadTemplate(file: {
  fileName: string;
  content: string;
  mimeType?: string;
}): Promise<PdfFillerResponse> {
  const headers = getHeaders();
  const response = await fetch(`${PDFFILLER_BASE_URL}/templates`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: file.fileName,
      mime_type: file.mimeType || "text/html",
      content_base64: Buffer.from(file.content, "utf8").toString("base64"),
    }),
  });

  await ensureOk(response, "uploadTemplate");
  return (await response.json()) as PdfFillerResponse;
}

export async function createSignatureRequest(payload: SignatureRequestPayload): Promise<PdfFillerResponse> {
  const headers = getHeaders();
  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      document_id: payload.documentId,
      recipients: [
        {
          name: payload.recipient.name,
          email: payload.recipient.email,
          phone: payload.recipient.phone,
        },
      ],
      callback_url: payload.callbackUrl,
      metadata: payload.metadata ?? {},
    }),
  });

  await ensureOk(response, "createSignatureRequest");
  return (await response.json()) as PdfFillerResponse;
}

export async function checkSignatureStatus(signatureRequestId: string): Promise<PdfFillerResponse> {
  const headers = getHeaders();
  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}`, {
    method: "GET",
    headers,
  });

  await ensureOk(response, "checkSignatureStatus");
  return (await response.json()) as PdfFillerResponse;
}

export async function downloadSignedDocument(signatureRequestId: string): Promise<Buffer> {
  const headers = getHeaders();
  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}/signed_document`, {
    method: "GET",
    headers,
  });

  await ensureOk(response, "downloadSignedDocument");
  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

export async function downloadCertificate(signatureRequestId: string): Promise<Buffer> {
  const headers = getHeaders();
  const response = await fetch(`${PDFFILLER_BASE_URL}/signature_requests/${encodeURIComponent(signatureRequestId)}/certificate`, {
    method: "GET",
    headers,
  });

  await ensureOk(response, "downloadCertificate");
  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

export function validatePdfFillerWebhookSignature(payloadRaw: string, receivedSignature: string | null): boolean {
  const secret = process.env.PDFFILLER_CALLBACK_SECRET?.trim();
  if (!secret) {
    return true;
  }

  if (!receivedSignature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(payloadRaw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(receivedSignature));
  } catch {
    return false;
  }
}
