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
      className="min-h-screen bg-[#F4F6F9] text-[#2F2F2F]"
    >
      <header className="border-b border-[#D8DCE3] bg-white px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002B5C] text-white shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-[#2F2F2F]">
                {isArabic
                  ? "الموافقات المستنيرة"
                  : "Informed Consents"}
              </h1>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                {isArabic
                  ? "واجهة تشغيلية مطورة مع الحفاظ على مكتبة الموافقات المعتمدة."
                  : "Enterprise Figma-aligned interface while preserving the approved consent library."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-[#F8FAFC] px-3 py-2 text-xs text-[#6B7280]">
            <Shield className="h-4 w-4 text-[#002B5C]" />
            {isArabic ? "بيئة طبية محمية" : "Protected clinical workspace"}
          </div>
        </div>
      </header>

      <main className="px-8 py-5">{apiError && <div className="mx-6 my-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{apiError}</div>}
        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-[#D8DCE3] bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${card.tone}`} />
                  </div>
                  <Activity className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </div>

                <div className="font-mono text-2xl font-semibold text-[#002B5C]">
                  {card.value}
                </div>

                <div className="mt-1 text-sm text-[#6B7280]">
                  {card.label}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="text-sm font-semibold text-amber-900">
                {isArabic
                  ? "بوابة جاهزية قبل إشعار المريض"
                  : "Readiness gate before patient notification"}
              </div>
              <p className="mt-0.5 text-xs leading-5 text-amber-800">
                {isArabic
                  ? "تم الحفاظ على منطق ومكتبة الموافقات المعتمدة، مع تحسين الإطار البصري للصفحة بما يتوافق مع نموذج Figma."
                  : "The approved consent workflow and library remain intact while the surrounding interface follows the approved Figma direction."}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#D8DCE3] bg-white shadow-sm">
          <div className="border-b border-[#D8DCE3] bg-white px-5 py-4">
            <h2 className="text-sm font-semibold text-[#2F2F2F]">
              {isArabic
                ? "مكتبة الموافقات المعتمدة ورحلة الإصدار"
                : "Approved Consent Library & Issuance Workflow"}
            </h2>
            <p className="mt-1 text-xs text-[#6B7280]">
              {isArabic
                ? "هذا القسم يستخدم المكوّن المستقر الحالي دون تغيير في البيانات أو المكتبة."
                : "This section uses the existing stable module without changing the data source or consent library."}
            </p>
          </div>

          <div className="p-5">
            <FinalInformedConsentsModule auth={auth} />
          </div>
        </section>
      </main>
    </div>
  );
}


