export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DynamicEducationCard from "@/components/procedure-education/DynamicEducationCard";
import { getProcedureEducationById } from "@/lib/server/procedure-education-service";

type ProcedureEducationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProcedureEducationDetailPage({ params }: ProcedureEducationPageProps) {
  const { id } = await params;
  const item = await getProcedureEducationById(id);

  if (!item) {
    notFound();
  }

  return (
    <AppShell
      title={`Procedure Education: ${item.titleEn}`}
      subtitle="Versioned, localized, and auditable dynamic procedure education entry"
      actions={
        <Link href="/admin/procedure-education" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Back To Library
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DynamicEducationCard
          procedureCode={item.procedureCode}
          titleEn={item.titleEn}
          titleAr={item.titleAr}
          summaryEn={item.summaryEn}
          summaryAr={item.summaryAr}
          versionLabel={item.versionLabel}
          status={item.status}
          languages={item.languages}
          sectionCount={item.sectionCount}
          images={item.assetCounts.images}
          infographics={item.assetCounts.infographics}
          videos={item.assetCounts.videos}
          pdfs={item.assetCounts.pdfs}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Audit Event Structure</h2>
          <p className="mt-1 text-sm text-slate-600">Captured in procedure_education_audit_events for every view interaction.</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl border border-slate-200 px-3 py-2">action: viewed</li>
            <li className="rounded-xl border border-slate-200 px-3 py-2">language: ar / en</li>
            <li className="rounded-xl border border-slate-200 px-3 py-2">version: {item.versionLabel}</li>
            <li className="rounded-xl border border-slate-200 px-3 py-2">duration: seconds per session</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
