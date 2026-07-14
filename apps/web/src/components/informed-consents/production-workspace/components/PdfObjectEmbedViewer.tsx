"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { RefreshCw, ExternalLink, Settings, AlertCircle } from "lucide-react";

type PdfObjectEmbedViewerProps = {
  src?: string | null;
  title?: string;
  className?: string;
  viewerClassName?: string;
  compactOnError?: boolean;
  onLoad?: () => void;
  onError?: (message: string) => void;
};

type ViewerStatus = "idle" | "loading" | "ready" | "error";

function generateCorrelationId(): string {
  const time = Date.now().toString(36).slice(-4);
  const random = Math.random().toString(36).slice(2, 6);
  return `pdf-${time}-${random}`;
}

function classifyPdfError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : String(error || "Unable to render the approved PDF preview.");
  const lower = message.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("missing access token")) {
    return { status: 401, message: "Session expired or missing. Please refresh the page and try again." };
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return { status: 403, message: "You do not have permission to preview this PDF." };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return { status: 404, message: "The requested PDF source was not found." };
  }
  if (lower.includes("409") || lower.includes("conflict")) {
    return { status: 409, message: "The PDF source is out of date or conflicts with the current document." };
  }
  if (lower.includes("network")) {
    return { status: 0, message: "Network error while loading the PDF." };
  }
  return { status: 500, message };
}

export function PdfObjectEmbedViewer({
  src,
  title = "Approved consent PDF",
  className = "",
  viewerClassName = "h-[60vh] min-h-[520px]",
  compactOnError = true,
  onLoad,
  onError,
}: PdfObjectEmbedViewerProps) {
  const { lang } = useI18n();
  const safeSrc = useMemo(() => (typeof src === "string" ? src.trim() : ""), [src]);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);
  const correlationIdRef = useRef(generateCorrelationId());
  const [status, setStatus] = useState<ViewerStatus>(safeSrc ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStatus, setErrorStatus] = useState<number>(0);
  const [pageCount, setPageCount] = useState(0);

  const clearPages = useCallback(() => {
    const pagesElement = pagesRef.current;
    if (pagesElement) {
      pagesElement.replaceChildren();
    }
  }, []);

  const resetCorrelationId = useCallback(() => {
    correlationIdRef.current = generateCorrelationId();
  }, []);

  useEffect(() => {
    clearPages();
    resetCorrelationId();

    if (!safeSrc) {
      setStatus("idle");
      setErrorMessage("");
      setErrorStatus(0);
      setPageCount(0);
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loadingTask: any = null;
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    async function renderPdf() {
      try {
        setStatus("loading");
        setErrorMessage("");
        setErrorStatus(0);
        setPageCount(0);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib: any = await import("pdfjs-dist/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";

        loadingTask = pdfjsLib.getDocument({
          url: safeSrc,
          withCredentials: true,
        });

        const pdf = await loadingTask.promise;

        if (cancelled || renderTokenRef.current !== token) return;

        setPageCount(pdf.numPages);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== token) return;

          const page = await pdf.getPage(pageNumber);

          if (cancelled || renderTokenRef.current !== token) return;

          const pagesElement = pagesRef.current;
          const hostWidth = Math.max(360, (pagesElement?.clientWidth || 980) - 32);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(0.7, hostWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          const pageShell = document.createElement("section");
          pageShell.className = "mx-auto mb-5 w-fit max-w-full rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200";

          const label = document.createElement("div");
          label.className = "mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
          label.textContent = lang === "ar"
            ? `صفحة ${pageNumber} من ${pdf.numPages}`
            : `Page ${pageNumber} of ${pdf.numPages}`;

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
          onLoad?.();
        }
      } catch (error) {
        if (!cancelled && renderTokenRef.current === token) {
          const classified = classifyPdfError(error);
          setStatus("error");
          setErrorMessage(classified.message);
          setErrorStatus(classified.status);
          onError?.(classified.message);
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      clearPages();

      try {
        loadingTask?.destroy();
      } catch {
        // Ignore cleanup errors from interrupted renders.
      }
    };
  }, [safeSrc, lang, clearPages, resetCorrelationId, onLoad, onError]);

  const handleRetry = useCallback(() => {
    resetCorrelationId();
    // Force effect re-run by toggling a stable dependency is not possible;
    // instead reload the same src by appending a cache-busting correlation query
    // that is stripped before display, but we keep it simple: re-mount via key would
    // require prop plumbing. We use window.location reload of the iframe/object fallback.
    window.location.reload();
  }, [resetCorrelationId]);

  const handleOpenMappingSettings = useCallback(() => {
    const mappingAnchor = document.getElementById("consent-field-mapping-verify-button");
    if (mappingAnchor) {
      mappingAnchor.scrollIntoView({ behavior: "smooth", block: "center" });
      mappingAnchor.focus();
    }
  }, []);

  const errorBox = (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-700">
            {lang === "ar" ? "تعذر عرض معاينة PDF داخل مساحة العمل." : "The PDF preview could not be rendered inside the workspace."}
          </p>
          <p className="mt-1 text-xs text-slate-600">{errorMessage}</p>
          <p className="mt-2 text-[11px] tabular-nums text-slate-400">
            {lang === "ar" ? "معرّف المرجع:" : "Reference:"} {correlationIdRef.current}
            {errorStatus > 0 ? ` · ${errorStatus}` : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="size-3.5" />
              {lang === "ar" ? "إعادة المحاولة" : "Retry"}
            </button>
            <a
              href={safeSrc}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="size-3.5" />
              {lang === "ar" ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
            </a>
            {errorStatus === 401 || errorStatus === 403 || errorStatus === 404 || errorStatus === 409 ? (
              <button
                type="button"
                onClick={handleOpenMappingSettings}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings className="size-3.5" />
                {lang === "ar" ? "الانتقال إلى الخريطة/الإعدادات" : "Go to mapping/settings"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (!safeSrc) {
    return (
      <div className={`flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 ${className}`}>
        {lang === "ar" ? "مصدر PDF المعتمد غير متاح لهذا الموافقة." : "Approved PDF source is not available for this consent."}
      </div>
    );
  }

  const compactErrorClass = compactOnError ? "min-h-[240px]" : "min-h-[420px]";

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div
        className={`relative overflow-auto bg-slate-100 p-4 ${status === "error" ? compactErrorClass : viewerClassName}`}
        aria-label={title}
      >
        {status === "loading" ? (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {lang === "ar" ? "جاري تحميل معاينة PDF المعتمدة…" : "Loading approved PDF preview…"}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            {errorBox}
          </div>
        ) : null}

        <div ref={pagesRef} className={status === "error" ? "hidden" : "mx-auto flex w-full flex-col items-center"} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        <span>
          {pageCount > 0
            ? lang === "ar"
              ? `${pageCount} صفحة/صفحات تم عرضها بواسطة PDF.js`
              : `${pageCount} approved PDF page${pageCount === 1 ? "" : "s"} rendered by PDF.js`
            : "PDF.js approved source viewer"}
        </span>
        <a href={safeSrc} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline underline-offset-2">
          {lang === "ar" ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
        </a>
      </div>
    </div>
  );
}
