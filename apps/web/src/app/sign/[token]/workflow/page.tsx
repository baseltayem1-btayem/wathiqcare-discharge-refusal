import { ApprovedPatientWorkflow } from "@/components/approved-design/patient/ApprovedPatientWorkflow";

export const dynamic = "force-dynamic";

type SignWorkflowPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignWorkflowPage({ params }: SignWorkflowPageProps) {
  const { token } = await params;
  return <ApprovedPatientWorkflow token={token} initialLang="ar" />;
}
