import { ApiError } from "@/lib/server/http";
import { validateSigningToken } from "@/lib/server/signature-orchestration-service";

export type SigningTokenContext = {
  tenantId: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
  signerRole: string;
  redirectPath: string;
};

function buildRedirectPath(moduleType: string, documentId: string, token: string): string {
  const normalized = moduleType.toLowerCase();
  if (normalized.includes("informed")) {
    return `/sign/${encodeURIComponent(token)}/workflow`;
  }
  if (normalized.includes("discharge")) {
    return `/secure/${encodeURIComponent(token)}`;
  }
  if (normalized.includes("legal")) {
    return `/cases/${encodeURIComponent(documentId)}/legal-package`;
  }
  return `/documents/${encodeURIComponent(documentId)}`;
}

export async function getSigningTokenContext(token: string): Promise<SigningTokenContext> {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    throw new ApiError(400, "Invalid or expired signing token");
  }

  const validated = await validateSigningToken(normalizedToken);
  if (!validated.sessionId || !validated.documentId || !validated.moduleType || !validated.tenantId || !validated.signerRole) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  return {
    tenantId: validated.tenantId,
    sessionId: validated.sessionId,
    documentId: validated.documentId,
    moduleType: validated.moduleType,
    signerRole: validated.signerRole,
    redirectPath: buildRedirectPath(validated.moduleType, validated.documentId, normalizedToken),
  };
}