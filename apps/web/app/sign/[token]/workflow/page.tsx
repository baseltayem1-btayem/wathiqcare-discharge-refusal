import InformedConsentsEnterpriseWorkflowScreens from "@/components/modules/InformedConsentsEnterpriseWorkflowScreens";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicSigningWorkflowPage({ params }: PageProps) {
  const { token } = await params;
  const context = await getSigningTokenContext(token);

  return <InformedConsentsEnterpriseWorkflowScreens documentId={context.documentId} mode="signature" />;
}
