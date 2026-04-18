import { redirect } from "next/navigation";

import CaseWorkspaceClient from "./CaseWorkspaceClient";

const ENABLE_WORKSPACE_V2 = process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_V2 === "true";

type CaseParams = {
  id: string;
};

type CasePageProps = {
  params: Promise<CaseParams>;
};

export default async function CasePage({ params }: CasePageProps) {
  const resolvedParams = await params;

  if (ENABLE_WORKSPACE_V2) {
    redirect(`/cases/${resolvedParams.id}/workspace-v2`);
  }

  return <CaseWorkspaceClient />;
}
