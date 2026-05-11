import { redirect } from "next/navigation";

export default async function ConsentTemplateRegistryPage() {
  redirect("/modules/informed-consents/templates");
}
