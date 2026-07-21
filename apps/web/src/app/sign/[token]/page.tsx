import { ApprovedPatientWorkflow } from "@/components/approved-design/patient/ApprovedPatientWorkflow";

export const dynamic = "force-dynamic";

type SignTokenPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignTokenPage({ params }: SignTokenPageProps) {
  const { token } = await params;
  return <ApprovedPatientWorkflow token={token} initialLang="ar" />;
}
