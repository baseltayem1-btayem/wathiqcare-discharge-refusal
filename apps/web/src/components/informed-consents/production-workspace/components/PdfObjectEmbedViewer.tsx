"use client";

type PdfObjectEmbedViewerProps = {
  src?: string | null;
  title?: string;
  className?: string;
  viewerClassName?: string;
};

export function PdfObjectEmbedViewer({
  src,
  title = "Approved consent PDF",
  className = "",
  viewerClassName = "h-[60vh] min-h-[520px]",
}: PdfObjectEmbedViewerProps) {
  const safeSrc = typeof src === "string" ? src.trim() : "";

  if (!safeSrc) {
    return (
      <div className={`flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 ${className}`}>
        Approved PDF source is not available for this consent.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <object
        data={safeSrc}
        type="application/pdf"
        aria-label={title}
        className={`block w-full bg-white ${viewerClassName}`}
      >
        <embed
          src={safeSrc}
          type="application/pdf"
          title={title}
          className={`block w-full bg-white ${viewerClassName}`}
        />

        <div className="flex min-h-[520px] items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              The PDF preview could not be displayed in this browser.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              You can still open the approved PDF source directly.
            </p>
            <a
              href={safeSrc}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Open approved PDF
            </a>
          </div>
        </div>
      </object>
    </div>
  );
}
