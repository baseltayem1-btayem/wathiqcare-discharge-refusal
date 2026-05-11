import { notFound } from "next/navigation";

type VerifyResponse = {
  valid: boolean;
  documentId?: string;
  consentReference?: string;
  finalizedAt?: string | null;
  checksumSha256?: string;
  signerCompletion?: boolean;
};

async function getVerification(token: string): Promise<VerifyResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/modules/informed-consents/evidence/verify/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { valid: false };
  }

  return (await response.json()) as VerifyResponse;
}

export default async function InformedConsentsEvidenceVerifyPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) notFound();

  const verification = await getVerification(token);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Informed Consent Evidence Verification</h1>
      {verification.valid ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm">
          <div className="font-semibold text-emerald-800">Document is authentic and verified.</div>
          <div>Document ID: {verification.documentId}</div>
          <div>Consent Reference: {verification.consentReference}</div>
          <div>Finalized At: {verification.finalizedAt || "-"}</div>
          <div>Checksum (SHA256): {verification.checksumSha256}</div>
          <div>Signer Completion: {String(Boolean(verification.signerCompletion))}</div>
        </div>
      ) : (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Verification failed. Token is invalid or record is not available.
        </div>
      )}
    </main>
  );
}
