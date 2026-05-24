export const dynamic = "force-dynamic";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import DynamicEducationCard from "@/components/procedure-education/DynamicEducationCard";
import { PROCEDURE_EDUCATION_ENTERPRISE_LIBRARY } from "@/lib/procedure-education/sample-library";

export default function ProcedureEducationPreviewPage() {
  return (
    <AppShell
      title="Education Preview"
      subtitle="Phase 23B enterprise bilingual education preview with structured sections and media placeholders"
      actions={
        <Link
          href="/admin/procedure-education"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back To Library
        </Link>
      }
    >
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Preview mode only. This page validates AR/EN rendering, version badge, and media architecture placeholders.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROCEDURE_EDUCATION_ENTERPRISE_LIBRARY.map((item) => {
          const imageCount = item.mediaPlaceholders.filter((asset) => asset.architectureType === "image").length;
          const infographicCount = item.mediaPlaceholders.filter((asset) => asset.architectureType === "infographic").length;
          const videoCount = item.mediaPlaceholders.filter((asset) => asset.architectureType === "video").length;

          return (
            <div key={item.procedureCode} className="space-y-2">
              <DynamicEducationCard
                procedureCode={item.procedureCode}
                titleEn={item.titleEn}
                titleAr={item.titleAr}
                summaryEn={item.summaryEn}
                summaryAr={item.summaryAr}
                versionLabel="v1.0"
                status="ACTIVE"
                languages={["ar", "en"]}
                sectionCount={item.sections.length}
                images={imageCount}
                infographics={infographicCount}
                videos={videoCount}
                pdfs={1}
              />
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                Servier SMART Mapping: {item.servierSmartMapping.libraryRef} · Sections: {item.sections.length}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
