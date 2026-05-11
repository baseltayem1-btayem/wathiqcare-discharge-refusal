import InformedConsentsEnterpriseWorkflowScreens from "@/components/modules/InformedConsentsEnterpriseWorkflowScreens";

export default async function ConsentWitnessConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InformedConsentsEnterpriseWorkflowScreens documentId={id} mode="witness" />;
}
