import { redirect } from "next/navigation";

export default function DeprecatedConsentCreationWorkflowPage() {
  redirect("/modules/informed-consents/physician-workflow");
}

