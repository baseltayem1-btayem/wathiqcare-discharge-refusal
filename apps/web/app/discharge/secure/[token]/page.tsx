import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function LegacySecureDecisionRedirect({ params }: PageProps) {
  const { token } = await params;
  redirect(`/secure/${encodeURIComponent(token)}`);
}