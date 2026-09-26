/**
 * Pure mapping of the public signing POST body to service arguments.
 *
 * Kept dependency-free so it can be unit-tested without loading Next.js
 * server runtime or the Prisma-backed signature service. The route
 * (app/api/public-signing/document/[token]/sign) uses this to forward
 * `declarations` (the accepted patient declaration keys) to the service —
 * the server service validates completeness authoritatively.
 */
export type PublicSignRequestArgs = {
  token: string;
  signerName: string;
  signatureDataUrl?: string;
  /** Patient declaration keys accepted in the signing journey (routine path). */
  declarations: unknown;
};

export function mapPublicSignRequestBody(
  body: unknown,
  token: string,
): PublicSignRequestArgs {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    token,
    // The service coerces/validates these (getString + explicit checks);
    // casts preserve the pre-existing route behavior exactly.
    signerName: b.signerName as string,
    signatureDataUrl: b.signatureDataUrl as string | undefined,
    declarations: b.declarations,
  };
}
