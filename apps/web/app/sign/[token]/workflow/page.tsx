import InformedConsentsEnterpriseWorkflowScreens from "@/components/modules/InformedConsentsEnterpriseWorkflowScreens";
import { notFound } from "next/navigation";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";
import { ApiError } from "@/lib/server/http";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicSigningWorkflowPage({ params }: PageProps) {
  const { token } = await params;
  let context;
  try {
    context = await getSigningTokenContext(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <InformedConsentsEnterpriseWorkflowScreens documentId={context.documentId} mode="signature" />;
}
