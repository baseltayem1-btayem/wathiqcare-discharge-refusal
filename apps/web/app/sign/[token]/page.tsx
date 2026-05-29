import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

// Legacy entry point preserved for backwards-compatibility with secure-signing
// links issued before the enterprise workflow was wired to /sign/{token}/workflow.
// Always forward to the staged workflow (OTP -> Education -> Consent Review -> Decision -> Signature -> Confirmation).
export default async function PublicSigningLegacyRedirect({ params }: PageProps) {
  const { token } = await params;
  redirect(`/sign/${encodeURIComponent(token)}/workflow`);
}
