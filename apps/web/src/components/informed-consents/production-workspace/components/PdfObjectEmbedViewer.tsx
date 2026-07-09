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
      <iframe
        title={title}
        src={safeSrc}
        className={`block w-full border-0 bg-white ${viewerClassName}`}
        loading="lazy"
      />

      <div className="border-t border-slate-200 bg-white px-3 py-2 text-[11px]">
        <a
          href={safeSrc}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline underline-offset-2"
        >
          Open the approved consent PDF in a new tab
        </a>
      </div>
    </div>
  );
}