import InformedConsentsEnterpriseWorkflowScreens from "@/components/modules/InformedConsentsEnterpriseWorkflowScreens";

export default async function ConsentSignaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InformedConsentsEnterpriseWorkflowScreens documentId={id} mode="signature" />;
}
