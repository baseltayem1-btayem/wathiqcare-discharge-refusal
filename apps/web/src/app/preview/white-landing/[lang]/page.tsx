import { notFound } from "next/navigation";
import WathiqcareWhiteLanding from "@/components/landing/WathiqcareWhiteLanding";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ar" }];
}

export default async function WhiteLandingPreviewPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang !== "en" && lang !== "ar") {
    notFound();
  }

  return <WathiqcareWhiteLanding lang={lang} />;
}
