import { ApprovedPatientWorkflow } from "@/components/approved-design/patient/ApprovedPatientWorkflow";
import UIRefreshBoundary from "@/components/ui-refresh/UIRefreshBoundary";
import { notFound } from "next/navigation";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";
import { ApiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicSigningWorkflowPage({ params }: PageProps) {
  const { token } = await params;
  try {
    await getSigningTokenContext(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <UIRefreshBoundary surface="public-signing">
      <ApprovedPatientWorkflow token={token} />
    </UIRefreshBoundary>
  );
}
