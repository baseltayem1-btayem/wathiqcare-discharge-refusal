import ComplianceConsolePage from "@/components/admin/ComplianceConsolePage";
import { getTranslation } from "@/lib/i18n";
import { cookies } from "next/headers";

function getContent(lang: "ar" | "en") {
  return {
    title: getTranslation(lang, "adminDataResidency.title"),
    subtitle: getTranslation(lang, "adminDataResidency.subtitle"),
    endpoint: "/api/admin/data-residency",
    highlights: [
      getTranslation(lang, "adminDataResidency.highlights.patientData"),
      getTranslation(lang, "adminDataResidency.highlights.analytics"),
      getTranslation(lang, "adminDataResidency.highlights.validation"),
    ],
  };
}

export default async function AdminDataResidencyPage() {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("wathiqcare_lang")?.value;
  const lang: "ar" | "en" = langCookie === "ar" ? "ar" : "en";
  const content = getContent(lang);
  return (
    <ComplianceConsolePage
      title={content.title}
      subtitle={content.subtitle}
      endpoint={content.endpoint}
      highlights={content.highlights}
    />
  );
}