import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovedPatientWorkflow } from "@/components/approved-design/patient/ApprovedPatientWorkflow";

export const metadata: Metadata = {
  title: "WathiqCare Secure Signing",
};

type SignCatchAllPageProps = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    lang?: string;
  }>;
};

export default async function PublicSignCatchAllPage({ params, searchParams }: SignCatchAllPageProps) {
  const { slug } = await params;
  const { lang } = await searchParams;

  const token = slug?.[0];
  if (!token) {
    notFound();
  }

  const initialLang = lang === "en" ? "en" : "ar";

  return (
    <main className="min-h-screen bg-background">
      <ApprovedPatientWorkflow token={token} initialLang={initialLang} />
    </main>
  );
}
