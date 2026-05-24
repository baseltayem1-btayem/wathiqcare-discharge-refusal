export const dynamic = "force-dynamic";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import DynamicEducationCard from "@/components/procedure-education/DynamicEducationCard";
import { PROCEDURE_EDUCATION_SAMPLE_LIBRARY } from "@/lib/procedure-education/sample-library";
import { listProcedureEducation, type ProcedureEducationCardRecord } from "@/lib/server/procedure-education-service";

function fallbackCards(): ProcedureEducationCardRecord[] {
  return PROCEDURE_EDUCATION_SAMPLE_LIBRARY.map((item) => ({
    id: item.procedureCode,
    procedureCode: item.procedureCode,
    titleAr: item.titleAr,
    titleEn: item.titleEn,
    summaryAr: item.summaryAr,
    summaryEn: item.summaryEn,
    status: "DRAFT",
    versionLabel: "v1.0",
    sectionCount: 6,
    languages: ["ar", "en"],
    assetCounts: {
      images: 1,
      infographics: 1,
      videos: 1,
      pdfs: 1,
    },
    updatedAt: new Date(),
  }));
}

export default async function ProcedureEducationAdminPage() {
  let cards: ProcedureEducationCardRecord[] = [];

  try {
    cards = await listProcedureEducation();
  } catch {
    cards = [];
  }

  const displayCards = cards.length > 0 ? cards : fallbackCards();

  return (
    <AppShell
      title="Procedure Education Library"
      subtitle="Enterprise dynamic procedure education foundation with bilingual content and multimedia assets"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/procedure-education/preview"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Education Preview
          </Link>
          <Link
            href="/admin/procedure-education/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Procedure Education
          </Link>
        </div>
      }
    >
      <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Phase 23A foundation supports Arabic/English, images, videos, PDFs, and view audit telemetry.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {displayCards.map((item) => (
          <Link key={item.id} href={`/admin/procedure-education/${item.id}`} className="block">
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
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
