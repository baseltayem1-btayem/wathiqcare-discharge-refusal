import { redirect } from "next/navigation";

export default async function ConsentCreationWorkflowPage() {
  redirect("/modules/informed-consents/create");
}
