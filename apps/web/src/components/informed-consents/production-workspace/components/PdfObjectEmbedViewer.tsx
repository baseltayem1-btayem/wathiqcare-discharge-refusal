"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

type PdfObjectEmbedViewerProps = {
  src?: string | null;
  title?: string;
  className?: string;
  viewerClassName?: string;
};

type ViewerStatus = "idle" | "loading" | "ready" | "error";

export function PdfObjectEmbedViewer({
  src,
  title = "Approved consent PDF",
  className = "",
  viewerClassName = "h-[60vh] min-h-[520px]",
}: PdfObjectEmbedViewerProps) {
  const safeSrc = useMemo(() => (typeof src === "string" ? src.trim() : ""), [src]);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);
  const [status, setStatus] = useState<ViewerStatus>(safeSrc ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const pagesElement = pagesRef.current;
    pagesElement?.replaceChildren();

    if (!safeSrc) {
      setStatus("idle");
      setErrorMessage("");
      setPageCount(0);
      return;
    }

    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    async function renderPdf() {
      try {
        setStatus("loading");
        setErrorMessage("");
        setPageCount(0);

        loadingTask = pdfjsLib.getDocument({
          url: safeSrc,
          withCredentials: false,
          disableWorker: true,
        });

        const pdf = await loadingTask.promise;

        if (cancelled || renderTokenRef.current !== token) return;

        setPageCount(pdf.numPages);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return;

          const page = await pdf.getPage(pageNumber);

          if (cancelled || renderTokenRef.current !== token) return;

          const hostWidth = Math.max(360, (pagesElement?.clientWidth || 980) - 32);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(0.7, hostWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          const pageShell = document.createElement("section");
          pageShell.className = "mx-auto mb-5 w-fit max-w-full rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200";

          const label = document.createElement("div");
          label.className = "mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
          label.textContent = `Page ${pageNumber} of ${pdf.numPages}`;

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });

          if (!context) {
            throw new Error("Browser canvas rendering context is unavailable.");
          }

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "block max-w-full bg-white";

          pageShell.append(label, canvas);
          pagesElement?.append(pageShell);

          await page.render({
            canvasContext: context,
            viewport,
            transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;

          page.cleanup();
        }

        if (!cancelled && renderTokenRef.current === token) {
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled && renderTokenRef.current === token) {
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to render the approved PDF preview.");
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      pagesElement?.replaceChildren();

      try {
        loadingTask?.destroy();
      } catch {
        // Ignore cleanup errors from interrupted renders.
      }
    };
  }, [safeSrc]);

  if (!safeSrc) {
    return (
      <div className={`flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 ${className}`}>
        Approved PDF source is not available for this consent.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className={`relative overflow-auto bg-slate-100 p-4 ${viewerClassName}`} aria-label={title}>
        {status === "loading" ? (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Loading approved PDF preview…
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-red-700">The PDF preview could not be rendered inside the workspace.</p>
              <p className="mt-2 text-xs text-slate-600">{errorMessage}</p>
              <a
                href={safeSrc}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-xs font-semibold text-blue-600 underline underline-offset-2"
              >
                Open the approved consent PDF in a new tab
              </a>
            </div>
          </div>
        ) : null}

        <div ref={pagesRef} className={status === "error" ? "hidden" : "mx-auto flex w-full flex-col items-center"} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        <span>{pageCount > 0 ? `${pageCount} approved PDF page${pageCount === 1 ? "" : "s"} rendered by PDF.js` : "PDF.js approved source viewer"}</span>
        <a href={safeSrc} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline underline-offset-2">
          Open in new tab
        </a>
      </div>
    </div>
  );
}