import { redirect } from "next/navigation";

export default function DeprecatedInformedConsentCreatePage() {
  redirect("/modules/informed-consents/physician-workflow");
}
