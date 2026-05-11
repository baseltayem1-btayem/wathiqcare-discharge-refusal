/**
 * PDF Filler Adapter
 *
 * Concrete ISignatureProvider implementation for PDF Filler.
 * Reads API credentials from environment — never hardcoded.
 *
 * If PDF_FILLER_BASE_URL or PDF_FILLER_API_KEY are not set,
 * the adapter operates in stub mode (logs instead of calling).
 */

import type {
  ISignatureProvider,
  SigningSessionInput,
  SignerRole,
  SignatureProviderResult,
  SignedDocumentResult,
} from "@/lib/core/signature-core";
import { SignatureProviderError } from "@/lib/core/signature-core";
import { SIGNATURE_CONFIG } from "@/lib/config/platform-config";

export class PdfFillerAdapter implements ISignatureProvider {
  readonly providerKey = "pdf_filler";

  private get baseUrl(): string {
    return SIGNATURE_CONFIG.pdfFillerBaseUrl;
  }

  private get apiKey(): string {
    return process.env[SIGNATURE_CONFIG.pdfFillerApiKeyEnv] ?? "";
  }

  private get isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "X-Platform": "WathiqCare",
    };
  }

  async submitForSigning(
    input: SigningSessionInput,
    signerLinks: Record<SignerRole, string>
  ): Promise<SignatureProviderResult> {
    if (!this.isConfigured) {
      console.warn("[PdfFillerAdapter] Not configured — stub mode. Set PDF_FILLER_BASE_URL and PDF_FILLER_API_KEY.");
      return { providerSessionId: `stub-${Date.now()}`, status: "submitted" };
    }

    const body = {
      document_id: input.documentId,
      module: input.moduleType,
      pdf_base64: input.pdfBytes.toString("base64"),
      signers: input.signers.map((s) => ({
        role: s.role,
        name: s.name,
        mobile: s.mobile,
        email: s.email,
        signing_url: signerLinks[s.role],
      })),
      expires_at: new Date(Date.now() + (input.expiryHours ?? 48) * 3600_000).toISOString(),
      metadata: { tenant_id: input.tenantId },
    };

    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new SignatureProviderError(
        `PDF Filler submission failed: ${res.status} ${text}`
      );
    }

    const data = (await res.json()) as { session_id: string };
    return { providerSessionId: data.session_id, status: "submitted" };
  }

  async retrieveSignedDocument(providerSessionId: string): Promise<SignedDocumentResult> {
    if (!this.isConfigured) {
      throw new SignatureProviderError("PdfFillerAdapter not configured for retrieveSignedDocument.");
    }

    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/signed-pdf`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new SignatureProviderError(
        `PDF Filler signed PDF retrieval failed: ${res.status}`
      );
    }

    const data = (await res.json()) as {
      pdf_base64: string;
      signed_at: string;
      metadata?: Record<string, unknown>;
    };

    return {
      pdfBytes: Buffer.from(data.pdf_base64, "base64"),
      signatureMetadata: data.metadata ?? {},
      signedAt: data.signed_at,
    };
  }

  async revokeSession(providerSessionId: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn("[PdfFillerAdapter] Stub revoke for:", providerSessionId);
      return;
    }

    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/revoke`, {
      method: "POST",
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new SignatureProviderError(`PDF Filler revoke failed: ${res.status}`);
    }
  }

  async resendToSigner(providerSessionId: string, signerRole: SignerRole): Promise<void> {
    if (!this.isConfigured) {
      console.warn("[PdfFillerAdapter] Stub resend for:", providerSessionId, signerRole);
      return;
    }

    const res = await fetch(`${this.baseUrl}/sessions/${providerSessionId}/resend`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ signer_role: signerRole }),
    });

    if (!res.ok) {
      throw new SignatureProviderError(`PDF Filler resend failed: ${res.status}`);
    }
  }
}
