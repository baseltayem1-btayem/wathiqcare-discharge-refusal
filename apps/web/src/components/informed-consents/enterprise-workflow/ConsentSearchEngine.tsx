"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

type ConsentLibraryItem = {
  id?: string;
  templateId?: string;
  templateVersionId?: string;
  code?: string;
  titleAr?: string;
  titleEn?: string;
  title?: string;
  specialty?: string;
  department?: string;
  consentType?: string;
  status?: string;
  version?: string;
  language?: string;
  pdfUrl?: string;
  fileUrl?: string;
  previewUrl?: string;
};

const API_BASE = "/api/modules/informed-consents";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeItems(payload: any): ConsentLibraryItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.templates)) return payload.templates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function slugify(value: string | undefined) {
  return String(value || "approved-consent-template")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function getTemplateId(item: ConsentLibraryItem) {
  return (
    item.templateId ||
    item.id ||
    item.templateVersionId ||
    item.code ||
    slugify(item.titleEn || item.title || item.titleAr)
  );
}

function itemKey(item: ConsentLibraryItem) {
  return getTemplateId(item);
}

function itemTitle(item: ConsentLibraryItem) {
  return item.titleEn || item.title || item.titleAr || item.code || "Approved Consent";
}

function itemTitleAr(item: ConsentLibraryItem) {
  return item.titleAr || item.title || item.titleEn || item.code || "نموذج موافقة معتمد";
}

export default function ConsentSearchEngine() {
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<ConsentLibraryItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadLibrary = React.useCallback(async (searchValue = query) => {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      if (searchValue.trim()) qs.set("q", searchValue.trim());

      const payload = await apiJson<any>(`${API_BASE}/imc-library${qs.toString() ? `?${qs.toString()}` : ""}`);
      let nextItems = normalizeItems(payload);

      if (nextItems.length === 0) {
        const fallback = await apiJson<any>(`${API_BASE}/templates${qs.toString() ? `?${qs.toString()}` : ""}`);
        nextItems = normalizeItems(fallback);
      }

      setItems(nextItems);
    } catch (e: any) {
      setError(e?.message || "Unable to load approved consent library from production API.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    loadLibrary("");
  }, [loadLibrary]);

  const previewPdf = React.useCallback(async (item: ConsentLibraryItem) => {
    const templateId = getTemplateId(item);

    setActionId(templateId);
    setError(null);

    try {      const resolved = await apiJson<any>(`${API_BASE}/imc-library/resolve`, {
        method: "POST",
        body: JSON.stringify({
          action: "preview-pdf",
          templateId,
          id: item.id || templateId,
          templateVersionId: item.templateVersionId || templateId,
          code: item.code || templateId,
          title: itemTitle(item),
          titleEn: item.titleEn || itemTitle(item),
          titleAr: item.titleAr || itemTitleAr(item),
          source: "imc-approved-library",
        }),
      }).catch(() => null);

      const pdfUrl =
        item.pdfUrl ||
        item.previewUrl ||
        item.fileUrl ||
        resolved?.pdfUrl ||
        resolved?.previewUrl ||
        `${API_BASE}/imc-library/resolve/pdf?id=${encodeURIComponent(templateId)}&title=${encodeURIComponent(itemTitle(item))}`;

      const pdfCheck = await fetch(pdfUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!pdfCheck.ok) {
        let message = "Approved consent PDF could not be generated from the official library data.";
        try {
          const payload = await pdfCheck.json();
          message =
            payload?.detail ||
            payload?.message ||
            payload?.error ||
            message;
        } catch {
          message = "Approved consent PDF could not be generated from the official library data.";
        }

        throw new Error(message);
      }

      const contentType = pdfCheck.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("The official approved consent PDF is not uploaded or not mapped correctly.");
      }

      const previewWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

      if (previewWindow) {
        previewWindow.location.href = pdfUrl;
      } else {
        window.location.href = pdfUrl;
      }
    } catch (e: any) {
      setError(e?.message || "Unable to open informed consent PDF preview from production library.");
    } finally {
      setActionId(null);
    }
  }, []);  const selectForPhysicianReview = React.useCallback(async (item: ConsentLibraryItem) => {
    const templateId = getTemplateId(item);

    setActionId(templateId);
    setError(null);

    try {
      const params = new URLSearchParams({
        source: "imc-approved-library",
        templateId,
        templateVersionId: item.templateVersionId || templateId,
        code: item.code || templateId,
        title: itemTitle(item),
        titleEn: item.titleEn || itemTitle(item),
        titleAr: item.titleAr || itemTitleAr(item),
      });

      window.location.href = `/modules/informed-consents/consent-creation-workflow?${params.toString()}`;
    } catch (e: any) {
      setError(e?.message || "Unable to open physician review workflow.");
    } finally {
      setActionId(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadLibrary(query);
            }}
            placeholder="Search approved consent library / البحث في مكتبة الموافقات"
            className="w-full rounded-lg border border-[#D8DCE3] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-[#002B5C]/10"
          />
        </div>

        <button
          type="button"
          onClick={() => loadLibrary(query)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#002B5C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#D8DCE3] bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] gap-4 border-b border-[#D8DCE3] bg-[#F8FAFC] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#667085]">
          <div>Consent / الموافقة</div>
          <div>Specialty</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="divide-y divide-[#EEF2F6]">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-[#667085]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading approved production library
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-[#667085]">
              <FileText className="h-4 w-4" />
              No approved consent templates found from production API
            </div>
          )}

          {!loading &&
            items.map((item) => {
              const templateId = getTemplateId(item);
              const busy = actionId === templateId;

              return (
                <div
                  key={itemKey(item)}
                  className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] items-center gap-4 px-4 py-4 text-sm"
                >
                  <div>
                    <div className="font-semibold text-[#101828]">{itemTitle(item)}</div>
                    <div className="mt-1 text-xs text-[#667085]">{itemTitleAr(item)}</div>
                    <div className="mt-1 text-xs text-[#98A2B3]">
                      {item.code || item.consentType || item.templateVersionId || templateId}
                    </div>
                  </div>

                  <div className="text-[#667085]">
                    {item.specialty || item.department || "General"}
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.status || "ACTIVE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => previewPdf(item)}
                      disabled={busy}
                      title="Preview approved consent PDF"
                      className="inline-flex items-center justify-center rounded-lg border border-[#D8DCE3] bg-white p-2 text-[#002B5C] shadow-sm hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => selectForPhysicianReview(item)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#C9A13B] px-3 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="h-4 w-4" />
        Production API linked: search, library resolve, PDF preview, caseId, templateId, and physician draft review.
      </div>
    </div>
  );
}








