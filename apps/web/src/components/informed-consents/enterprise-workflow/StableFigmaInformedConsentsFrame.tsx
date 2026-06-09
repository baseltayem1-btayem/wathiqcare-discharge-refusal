"use client";

import React from "react";

const WATHIQCARE_API_BASE = "/api/modules/informed-consents";

async function wathiqcareApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WATHIQCARE_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `WathiqCare API request failed: ${response.status}`);
  }

  return response.json();
}

function useWathiqCareEnterpriseBridge() {
  const [language, setLanguage] = React.useState<"en" | "ar">("en");
  const [dashboardStats, setDashboardStats] = React.useState<any>(null);
  const [apiBusy, setApiBusy] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const refreshDashboard = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const data = await wathiqcareApi("/dashboard");
      setDashboardStats(data);
    } catch (error: any) {
      setApiError(error?.message || "Unable to connect dashboard with backend API");
    } finally {
      setApiBusy(false);
    }
  }, []);

  React.useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const toggleLanguage = React.useCallback(() => {
    setLanguage((current) => {
      const next = current === "en" ? "ar" : "en";
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
        document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      }
      return next;
    });
  }, []);

  const openNewConsent = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ source: "physician-dashboard" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to create consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  const selectForPhysicianReview = React.useCallback(async (templateId?: string) => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ templateId, source: "imc-approved-library" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}/review`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to select consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  return {
    language,
    dashboardStats,
    apiBusy,
    apiError,
    refreshDashboard,
    toggleLanguage,
    openNewConsent,
    selectForPhysicianReview,
  };
}

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileText,
  Send,
  Shield,
  Stethoscope,
, Languages, RefreshCw} from "lucide-react";


const WATHIQCARE_API_BASE = "/api/modules/informed-consents";

async function wathiqcareApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WATHIQCARE_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `WathiqCare API request failed: ${response.status}`);
  }

  return response.json();
}

function useWathiqCareEnterpriseBridge() {
  const [language, setLanguage] = React.useState<"en" | "ar">("en");
  const [dashboardStats, setDashboardStats] = React.useState<any>(null);
  const [apiBusy, setApiBusy] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const refreshDashboard = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const data = await wathiqcareApi("/dashboard");
      setDashboardStats(data);
    } catch (error: any) {
      setApiError(error?.message || "Unable to connect dashboard with backend API");
    } finally {
      setApiBusy(false);
    }
  }, []);

  React.useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const toggleLanguage = React.useCallback(() => {
    setLanguage((current) => {
      const next = current === "en" ? "ar" : "en";
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
        document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      }
      return next;
    });
  }, []);

  const openNewConsent = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ source: "physician-dashboard" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to create consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  const selectForPhysicianReview = React.useCallback(async (templateId?: string) => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ templateId, source: "imc-approved-library" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}/review`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to select consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  return {
    language,
    dashboardStats,
    apiBusy,
    apiError,
    refreshDashboard,
    toggleLanguage,
    openNewConsent,
    selectForPhysicianReview,
  };
}

import FinalInformedConsentsModule from "@/components/informed-consents/FinalInformedConsentsModule";


const WATHIQCARE_API_BASE = "/api/modules/informed-consents";

async function wathiqcareApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WATHIQCARE_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `WathiqCare API request failed: ${response.status}`);
  }

  return response.json();
}

function useWathiqCareEnterpriseBridge() {
  const [language, setLanguage] = React.useState<"en" | "ar">("en");
  const [dashboardStats, setDashboardStats] = React.useState<any>(null);
  const [apiBusy, setApiBusy] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const refreshDashboard = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const data = await wathiqcareApi("/dashboard");
      setDashboardStats(data);
    } catch (error: any) {
      setApiError(error?.message || "Unable to connect dashboard with backend API");
    } finally {
      setApiBusy(false);
    }
  }, []);

  React.useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const toggleLanguage = React.useCallback(() => {
    setLanguage((current) => {
      const next = current === "en" ? "ar" : "en";
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
        document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      }
      return next;
    });
  }, []);

  const openNewConsent = React.useCallback(async () => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ source: "physician-dashboard" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to create consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  const selectForPhysicianReview = React.useCallback(async (templateId?: string) => {
    setApiBusy(true);
    setApiError(null);
    try {
      const created = await wathiqcareApi("/documents", {
        method: "POST",
        body: JSON.stringify({ templateId, source: "imc-approved-library" }),
      });
      if (created?.id) window.location.href = `/modules/informed-consents/documents/${created.id}/review`;
      else await refreshDashboard();
    } catch (error: any) {
      setApiError(error?.message || "Unable to select consent through backend API");
    } finally {
      setApiBusy(false);
    }
  }, [refreshDashboard]);

  return {
    language,
    dashboardStats,
    apiBusy,
    apiError,
    refreshDashboard,
    toggleLanguage,
    openNewConsent,
    selectForPhysicianReview,
  };
}

type StableFigmaInformedConsentsFrameProps = {
  auth: unknown;
  lang?: "en" | "ar";
};

export default function StableFigmaInformedConsentsFrame({
  auth,
  lang = "en",
}: StableFigmaInformedConsentsFrameProps) {
  const isArabic = lang === "ar";

  const cards = [
    {
      label: isArabic ? "مسودات نشطة" : "Active Drafts",
      value: "08",
      icon: FileText,
      tone: "text-[#002B5C]",
      bg: "bg-[#EBF3FB]",
    },
    {
      label: isArabic ? "بانتظار المريض" : "Awaiting Patient",
      value: "12",
      icon: Send,
      tone: "text-[#4B9CD3]",
      bg: "bg-[#EBF3FB]",
    },
    {
      label: isArabic ? "مكتملة اليوم" : "Completed Today",
      value: "05",
      icon: CheckCircle2,
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: isArabic ? "تحتاج مراجعة" : "Needs Review",
      value: "03",
      icon: AlertCircle,
      tone: "text-amber-700",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      
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
      <header 
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
              <Stethoscope 
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

            <div>
              <h1 
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
                {isArabic
                  ? "الموافقات المستنيرة"
                  : "Informed Consents"}
              </h1>
              <p 
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
                {isArabic
                  ? "واجهة تشغيلية مطورة مع الحفاظ على مكتبة الموافقات المعتمدة."
                  : "Enterprise Figma-aligned interface while preserving the approved consent library."}
              </p>
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
            <Shield 
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
            {isArabic ? "بيئة طبية محمية" : "Protected clinical workspace"}
          </div>
        </div>
      </header>

      <main 
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
    >{apiError && <div 
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
    >{apiError}</div>}
        <section 
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
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                
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
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${card.tone}`} />
                  </div>
                  <Activity 
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
                  {card.value}
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
                  {card.label}
                </div>
              </div>
            );
          })}
        </section>

        <section 
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
    >
                {isArabic
                  ? "بوابة جاهزية قبل إشعار المريض"
                  : "Readiness gate before patient notification"}
              </div>
              <p 
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
                {isArabic
                  ? "تم الحفاظ على منطق ومكتبة الموافقات المعتمدة، مع تحسين الإطار البصري للصفحة بما يتوافق مع نموذج Figma."
                  : "The approved consent workflow and library remain intact while the surrounding interface follows the approved Figma direction."}
              </p>
            </div>
          </div>
        </section>

        <section 
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
            <h2 
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
              {isArabic
                ? "مكتبة الموافقات المعتمدة ورحلة الإصدار"
                : "Approved Consent Library & Issuance Workflow"}
            </h2>
            <p 
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
              {isArabic
                ? "هذا القسم يستخدم المكوّن المستقر الحالي دون تغيير في البيانات أو المكتبة."
                : "This section uses the existing stable module without changing the data source or consent library."}
            </p>
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
            <FinalInformedConsentsModule auth={auth} />
          </div>
        </section>
      </main>
    </div>
  );
}



