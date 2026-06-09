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
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <Search 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadLibrary(query);
            }}
            placeholder="Search approved consent library / البحث في مكتبة الموافقات"
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          />
        </div>

        <button
          type="button"
          onClick={() => loadLibrary(query)}
          disabled={loading}
          
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
        >
          {loading ? <Loader2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     /> : <Search 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />}
          Search
        </button>
      </div>

      {error && (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <AlertCircle 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          {error}
        </div>
      )}

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div>Consent / الموافقة</div>
          <div>Specialty</div>
          <div>Status</div>
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Actions</div>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {loading && (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <Loader2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              Loading approved production library
            </div>
          )}

          {!loading && items.length === 0 && (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <FileText 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
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
                  
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                >
                  <div>
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{itemTitle(item)}</div>
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{itemTitleAr(item)}</div>
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      {item.code || item.consentType || item.templateVersionId || templateId}
                    </div>
                  </div>

                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    {item.specialty || item.department || "General"}
                  </div>

                  <div>
                    <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <CheckCircle2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                      {item.status || "ACTIVE"}
                    </span>
                  </div>

                  <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                    <button
                      type="button"
                      onClick={() => previewPdf(item)}
                      disabled={busy}
                      title="Preview approved consent PDF"
                      
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                    >
                      {busy ? <Loader2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     /> : <Eye 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />}
                    </button>

                    <button
                      type="button"
                      onClick={() => selectForPhysicianReview(item)}
                      disabled={busy}
                      
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                    >
                      <Send 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <ShieldCheck 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
        Production API linked: search, library resolve, PDF preview, caseId, templateId, and physician draft review.
      </div>
    </div>
  );
}








