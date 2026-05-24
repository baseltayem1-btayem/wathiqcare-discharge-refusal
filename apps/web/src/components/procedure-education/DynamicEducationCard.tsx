import { FileText, ImageIcon, Languages, PlayCircle } from "lucide-react";

type DynamicEducationCardProps = {
  procedureCode: string;
  titleEn: string;
  titleAr: string;
  summaryEn?: string | null;
  summaryAr?: string | null;
  versionLabel: string;
  status: string;
  languages?: string[];
  sectionCount?: number;
  images: number;
  infographics?: number;
  videos: number;
  pdfs: number;
};

function badgeClass(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "ARCHIVED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DynamicEducationCard({
  procedureCode,
  titleEn,
  titleAr,
  summaryEn,
  summaryAr,
  versionLabel,
  status,
  languages,
  sectionCount,
  images,
  infographics = 0,
  videos,
  pdfs,
}: DynamicEducationCardProps) {
  const showAr = (languages ?? []).includes("ar");
  const showEn = (languages ?? []).includes("en");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{procedureCode}</div>
        <div className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(status)}`}>{status}</div>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-900">{titleEn}</h3>
      <p className="mt-1 text-right text-sm text-slate-700" dir="rtl">
        {titleAr}
      </p>

      <p className="mt-3 text-sm text-slate-600">{summaryEn || "English summary pending."}</p>
      <p className="mt-1 text-right text-sm text-slate-600" dir="rtl">
        {summaryAr || "ملخص عربي قيد الإعداد."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 px-2 py-2 text-center">
          <Languages className="mx-auto mb-1 h-4 w-4" />
          {showAr || showEn ? `${showAr ? "AR" : ""}${showAr && showEn ? " / " : ""}${showEn ? "EN" : ""}` : "AR / EN"}
        </div>
        <div className="rounded-xl border border-slate-200 px-2 py-2 text-center">
          <ImageIcon className="mx-auto mb-1 h-4 w-4" />
          {images} images
        </div>
        <div className="rounded-xl border border-slate-200 px-2 py-2 text-center">
          <PlayCircle className="mx-auto mb-1 h-4 w-4" />
          {videos} videos
        </div>
        <div className="rounded-xl border border-slate-200 px-2 py-2 text-center">
          <FileText className="mx-auto mb-1 h-4 w-4" />
          {pdfs} PDFs
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 px-2 py-1">Version: {versionLabel}</div>
        <div className="rounded-lg border border-slate-200 px-2 py-1">Infographics: {infographics}</div>
        <div className="rounded-lg border border-slate-200 px-2 py-1">Sections: {sectionCount ?? 0}</div>
      </div>
    </article>
  );
}
