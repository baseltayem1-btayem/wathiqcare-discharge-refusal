import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicSigningWorkflow from "@/components/modules/PublicSigningWorkflow";

export const metadata: Metadata = {
  title: "Patient Signing Workflow",
  description: "WathiqCare secure patient consent signing workflow.",
};

export default async function SignWorkflowPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--wc-bg)]">
      <PublicSigningWorkflow token={token} />
    </div>
  );
}
