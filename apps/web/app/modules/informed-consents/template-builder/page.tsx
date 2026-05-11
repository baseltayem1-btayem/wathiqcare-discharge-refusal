import { redirect } from "next/navigation";

export default async function ConsentTemplateBuilderPage() {
  redirect("/modules/informed-consents/wording-governance");
}
