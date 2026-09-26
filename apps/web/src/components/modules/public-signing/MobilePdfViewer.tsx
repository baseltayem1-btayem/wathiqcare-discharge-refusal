"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, FileText } from "lucide-react";
import { cn, dirFor, rowDir, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type MobilePdfViewerProps = {
  url: string | null | undefined;
  token: string;
  lang: PublicSigningLang;
  acknowledged: boolean;
  onAcknowledge: (acknowledged: boolean) => void;
  title?: string;
  className?: string;
};

export default function MobilePdfViewer({
  url,
  token,
  lang,
  acknowledged,
  onAcknowledge,
  title,
  className,
}: MobilePdfViewerProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  const [zoom, setZoom] = useState(1);
  const isRtl = lang === "ar" || lang === "bilingual";

  if (!url) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900",
          className,
        )}
        dir={dirFor(uiLang)}
      >
        <div className={cn("flex items-center gap-2", rowDir(uiLang))}>
          <FileText size={16} aria-hidden />
          <p>
            {uiLang === "ar"
              ? "تعذر تحميل نسخة الطبيب المعبأة من الموافقة. ستُعرض النصوص أدناه."
              : "The doctor-filled consent PDF is not available. The text version is shown below."}
          </p>
        </div>
      </section>
    );
  }

  const src = url.startsWith("http") || url.startsWith("/")
    ? url
    : `/api/public/informed-consents/signing/${encodeURIComponent(token)}/final-pdf?copy=PATIENT_COPY&lang=${uiLang}&disposition=inline`;

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <header className={cn("flex flex-col gap-1", textAlign(uiLang))}>
        <h2 className="text-base font-semibold text-slate-900">
          {title || (uiLang === "ar" ? "الموافقة المعبأة من الطبيب" : "Doctor-Filled Consent")}
        </h2>
        <p className="text-xs text-slate-600">
          {uiLang === "ar"
            ? "راجع النسخة الكاملة أدناه. استخدم أزرار التكبير/التصغير على الجوال."
            : "Review the full copy below. Use the zoom buttons on mobile."}
        </p>
      </header>

      <div className={cn("mt-3 flex items-center gap-2", rowDir(uiLang))}>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          aria-label={uiLang === "ar" ? "تكبير" : "Zoom in"}
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          aria-label={uiLang === "ar" ? "تصغير" : "Zoom out"}
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={16} />
          {uiLang === "ar" ? "إعادة" : "Reset"}
        </button>
        <span className="ml-auto text-xs text-slate-500" dir="ltr">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div
        className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50"
        style={{ maxHeight: "70vh" }}
      >
        <div
          className="origin-top-left transition-transform"
          style={{
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
            minWidth: "100%",
          }}
        >
          <iframe
            title={uiLang === "ar" ? "نسخة الموافقة المعبأة" : "Filled consent copy"}
            src={src}
            className="h-[70vh] w-full min-w-[320px] border-0"
            aria-describedby="pdf-viewer-help"
          />
        </div>
      </div>

      <p id="pdf-viewer-help" className="mt-2 text-xs text-slate-500">
        {uiLang === "ar"
          ? "تأكد من مراجعة جميع الصفحات قبل المتابعة."
          : "Make sure to review all pages before continuing."}
      </p>

      <label
        className={cn(
          "mt-4 flex items-start gap-3 text-sm text-slate-700",
          rowDir(uiLang),
        )}
      >
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={acknowledged}
          onChange={(event) => onAcknowledge(event.target.checked)}
        />
        <span className={isRtl ? "text-right" : "text-left"}>
          {uiLang === "ar"
            ? "أؤكد أنني راجعت النسخة الكاملة المعبأة من الطبيب قبل اتخاذ القرار."
            : "I confirm that I reviewed the complete doctor-filled copy before making my decision."}
        </span>
      </label>
    </section>
  );
}
