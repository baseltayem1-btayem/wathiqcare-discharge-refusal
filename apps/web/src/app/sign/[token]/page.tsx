import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApprovedPatientWorkflow } from "@/components/approved-design/patient/ApprovedPatientWorkflow";

export const metadata: Metadata = {
  title: "WathiqCare Secure Signing",
};

type SignPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    lang?: string;
  }>;
};

export default async function PublicSignPage({ params, searchParams }: SignPageProps) {
  const { token } = await params;
  const { lang } = await searchParams;

  if (!token) {
    notFound();
  }

  const initialLang = lang === "en" ? "en" : "ar";

  return (
    <main className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <ApprovedPatientWorkflow token={token} initialLang={initialLang} />
      </div>
    </main>
  );
}
