/**
 * Approved Healthcare Consent Platform Design — Physician Dashboard
 *
 * Ported from design/figma/wathiqcare-v1.1/src/app/App.tsx PhysicianFlow.
 * Wired to real WathiqCare production APIs:
 *   - GET  /api/modules/informed-consents/templates
 *   - GET  /api/modules/informed-consents/patients/search
 *   - POST /api/modules/informed-consents/documents
 *   - POST /api/modules/informed-consents/documents/[id]/secure-signing
 *   - GET  /api/modules/informed-consents/documents
 *
 * All identity / status data shown in this component is real and originates
 * from authenticated server endpoints — no mock MRNs, patient names or refs.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  FileText,
  Loader2,
  Search,
  User,
} from "lucide-react";

import {
  Alert,
  Card,
  DesktopHeader,
  T,
  cls,
  type Lang,
} from "../shared";

type PhysicianScreen =
  | "consent-types"
  | "patient-lookup"
  | "dispatch"
  | "status-tracker";

type ConsentTypeKey =
  | "surgical"
  | "anesthesia"
  | "invasive_procedure"
  | "blood_transfusion";

type Template = {
  id: string;
  templateCode?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  consentType?: string | null;
  specialty?: string | null;
  department?: string | null;
};

type PatientResult = {
  id: string;
  mrn: string;
  name: string;
  caseId?: string;
  caseNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  mobileNumber?: string | null;
  source: "trakcare" | "case_fallback";
};

type ConsentDocumentRow = {
  id: string;
  consentReference?: string | null;
  status: string;
  patientName?: string | null;
  mrn?: string | null;
  createdAt: string;
  case?: { caseNumber?: string | null; medicalRecordNo?: string | null; patientName?: string | null } | null;
  template?: {
    titleAr?: string | null;
    titleEn?: string | null;
    consentType?: string | null;
  } | null;
};

const CONSENT_CATEGORIES: Array<{
  key: ConsentTypeKey;
  apiType: string;
  active: boolean;
  labelKey: "consentSurgery" | "consentAnesthesia" | "consentInvasive";
  fallbackLabel: { ar: string; en: string };
  descAr: string;
  descEn: string;
}> = [
  {
    key: "surgical",
    apiType: "surgical",
    active: true,
    labelKey: "consentSurgery",
    fallbackLabel: { ar: "موافقة جراحية", en: "Surgical Consent" },
    descAr: "موافقة إجراءات جراحية معتمدة",
    descEn: "Approved surgical procedure consent",
  },
  {
    key: "anesthesia",
    apiType: "anesthesia",
    active: true,
    labelKey: "consentAnesthesia",
    fallbackLabel: { ar: "موافقة تخدير", en: "Anesthesia Consent" },
    descAr: "موافقة بروتوكولات التخدير",
    descEn: "Anesthesia protocol consent",
  },
  {
    key: "invasive_procedure",
    apiType: "invasive_procedure",
    active: false,
    labelKey: "consentInvasive",
    fallbackLabel: {
      ar: "موافقة إجراء تداخلي",
      en: "Invasive Procedure Consent",
    },
    descAr: "إجراءات تداخلية تشخيصية",
    descEn: "Diagnostic invasive procedures",
  },
  {
    key: "blood_transfusion",
    apiType: "blood_transfusion",
    active: false,
    labelKey: "consentSurgery", // unused; explicit label below
    fallbackLabel: { ar: "موافقة نقل الدم", en: "Blood Transfusion Consent" },
    descAr: "بروتوكول نقل الدم",
    descEn: "Blood transfusion protocol",
  },
];

function categoryLabel(
  cat: (typeof CONSENT_CATEGORIES)[number],
  lang: Lang,
): string {
  return cat.fallbackLabel[lang];
}

function formatRelative(dateIso: string, lang: Lang): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  });
}

function statusLabel(status: string, lang: Lang): {
  label: string;
  tone: "completed" | "pending" | "expired" | "draft";
} {
  const s = (status || "").toUpperCase();
  const t = T[lang];
  if (s === "SIGNED" || s === "FINALIZED" || s === "ARCHIVED") {
    return { label: t.completedStatus, tone: "completed" };
  }
  if (s === "EXPIRED" || s === "REVOKED" || s === "DECLINED") {
    return { label: t.expiredStatus, tone: "expired" };
  }
  if (s === "DRAFT" || s === "REVIEW") {
    return {
      label: lang === "ar" ? "مسودة" : "Draft",
      tone: "draft",
    };
  }
  return { label: t.pendingStatus, tone: "pending" };
}

export type ApprovedPhysicianDashboardProps = {
  initialLang?: Lang;
  currentUser: { name: string; role?: string };
  onLogout?: () => void;
};

export function ApprovedPhysicianDashboard({
  initialLang = "ar",
  currentUser,
  onLogout,
}: ApprovedPhysicianDashboardProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [screen, setScreen] = useState<PhysicianScreen>("consent-types");
  const [selectedCategory, setSelectedCategory] =
    useState<ConsentTypeKey | null>(null);

  /* ── Templates for the chosen category ─────────────────────────────── */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  /* ── Patient lookup ───────────────────────────────────────────────── */
  const [mrnInput, setMrnInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(
    null,
  );

  /* ── Dispatch ─────────────────────────────────────────────────────── */
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientMobile, setRecipientMobile] = useState("");
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccessRef, setDispatchSuccessRef] = useState<string | null>(
    null,
  );

  /* ── Status tracker ──────────────────────────────────────────────── */
  const [docs, setDocs] = useState<ConsentDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const toggleLang = useCallback(
    () => setLang((l) => (l === "ar" ? "en" : "ar")),
    [],
  );

  const selectedCategoryMeta = useMemo(
    () => CONSENT_CATEGORIES.find((c) => c.key === selectedCategory) || null,
    [selectedCategory],
  );

  /* ── Fetch templates when entering patient-lookup ──────────────────── */
  useEffect(() => {
    if (screen !== "patient-lookup" || !selectedCategoryMeta) return;
    let cancelled = false;
    const run = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const res = await fetch(
          `/api/modules/informed-consents/templates?type=${encodeURIComponent(
            selectedCategoryMeta.apiType,
          )}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Template[];
        if (!cancelled) setTemplates(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setTemplatesError(
            lang === "ar"
              ? "تعذر تحميل قوالب الموافقة"
              : "Unable to load consent templates",
          );
          setTemplates([]);
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [screen, selectedCategoryMeta, lang]);

  /* ── Status tracker load on entry ──────────────────────────────────── */
  useEffect(() => {
    if (screen !== "status-tracker") return;
    const cancelled = false;
    const run = async () => {
      setDocsLoading(true);
      setDocsError(null);
      try {
        const res = await fetch(
          `/api/modules/informed-consents/documents?limit=25`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ConsentDocumentRow[];
        if (!cancelled) setDocs(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setDocsError(
            lang === "ar"
              ? "تعذر تحميل قائمة الموافقات"
              : "Unable to load consent list",
          );
          setDocs([]);
        }
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    };
    void run();
  }, [screen, lang]);

  /* ── Actions ───────────────────────────────────────────────────────── */
  const handleSelectCategory = useCallback((key: ConsentTypeKey) => {
    setSelectedCategory(key);
    setSelectedPatient(null);
    setSearchResults([]);
    setMrnInput("");
    setSearchError(null);
    setDispatchError(null);
    setDispatchSuccessRef(null);
    setScreen("patient-lookup");
  }, []);

  const handleSearch = useCallback(async () => {
    const q = mrnInput.trim();
    if (q.length < 2) {
      setSearchError(
        lang === "ar"
          ? "أدخل ما لا يقل عن حرفين"
          : "Enter at least 2 characters",
      );
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSelectedPatient(null);
    try {
      const res = await fetch(
        `/api/modules/informed-consents/patients/search?q=${encodeURIComponent(q)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PatientResult[];
      const list = Array.isArray(data) ? data : [];
      setSearchResults(list);
      if (list.length === 0) {
        setSearchError(
          lang === "ar"
            ? "لا توجد نتائج لهذا الرقم"
            : "No patients found for this query",
        );
      }
    } catch (err) {
      setSearchError(
        lang === "ar"
          ? "تعذر البحث عن المريض"
          : "Patient search failed",
      );
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [mrnInput, lang]);

  const handleChoosePatient = useCallback((p: PatientResult) => {
    setSelectedPatient(p);
    setRecipientMobile(p.mobileNumber || "");
    setRecipientEmail("");
    setDispatchError(null);
    setDispatchSuccessRef(null);
    setScreen("dispatch");
  }, []);

  const handleDispatch = useCallback(async () => {
    if (!selectedPatient || !selectedCategoryMeta) {
      setDispatchError(
        lang === "ar"
          ? "بيانات الموافقة غير مكتملة"
          : "Incomplete consent context",
      );
      return;
    }
    if (templates.length === 0) {
      setDispatchError(
        lang === "ar"
          ? "لا توجد قوالب معتمدة لنوع الموافقة المختار"
          : "No approved templates available for this consent type",
      );
      return;
    }
    if (!recipientEmail.trim()) {
      setDispatchError(
        lang === "ar"
          ? "أدخل البريد الإلكتروني للمريض"
          : "Patient email is required",
      );
      return;
    }
    const caseId = selectedPatient.caseId;
    if (!caseId) {
      setDispatchError(
        lang === "ar"
          ? "لا يوجد ملف حالة مرتبط بهذا المريض"
          : "Selected patient has no associated case record",
      );
      return;
    }

    setDispatchLoading(true);
    setDispatchError(null);
    try {
      const createRes = await fetch(
        `/api/modules/informed-consents/documents`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            caseId,
            templateId: templates[0].id,
            language: "bilingual",
          }),
        },
      );
      if (!createRes.ok) {
        const text = await createRes.text().catch(() => "");
        throw new Error(text || `HTTP ${createRes.status}`);
      }
      const created = (await createRes.json()) as {
        id: string;
        consentReference?: string;
      };

      const dispatchRes = await fetch(
        `/api/modules/informed-consents/documents/${encodeURIComponent(
          created.id,
        )}/secure-signing`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recipientEmail: recipientEmail.trim(),
            mobileNumber: recipientMobile.trim() || undefined,
            physicianName: currentUser.name,
          }),
        },
      );
      if (!dispatchRes.ok) {
        const text = await dispatchRes.text().catch(() => "");
        throw new Error(text || `HTTP ${dispatchRes.status}`);
      }

      setDispatchSuccessRef(
        created.consentReference || created.id.slice(0, 12),
      );
      setScreen("status-tracker");
    } catch (err) {
      setDispatchError(
        err instanceof Error
          ? err.message
          : lang === "ar"
            ? "تعذر إرسال الموافقة"
            : "Dispatch failed",
      );
    } finally {
      setDispatchLoading(false);
    }
  }, [
    selectedPatient,
    selectedCategoryMeta,
    templates,
    recipientEmail,
    recipientMobile,
    currentUser.name,
    lang,
  ]);

  /* ── Nav items ─────────────────────────────────────────────────────── */
  const navItems: {
    id: PhysicianScreen;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "consent-types",
      label: t.selectConsentType,
      icon: <FileText size={16} />,
    },
    {
      id: "patient-lookup",
      label: t.patientLookup,
      icon: <Search size={16} />,
    },
    {
      id: "dispatch",
      label: t.dispatchConsent,
      icon: <ClipboardList size={16} />,
    },
    {
      id: "status-tracker",
      label: t.statusTracker,
      icon: <Activity size={16} />,
    },
  ];

  return (
    <div
      dir={dir}
      className={cls(
        "min-h-screen bg-background flex flex-col",
        lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]",
      )}
    >
      <DesktopHeader
        lang={lang}
        onLangToggle={toggleLang}
        subtitle={t.physicianTitle}
        user={currentUser}
        showLogout={Boolean(onLogout)}
        onLogout={onLogout}
      />

      <div className="flex-1 max-w-5xl mx-auto w-full flex gap-0">
        <nav
          className={cls(
            "w-56 shrink-0 border-border bg-card p-3 flex flex-col gap-1 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto",
            lang === "ar" ? "border-l" : "border-r",
          )}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={cls(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
                screen === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {screen === "consent-types" && (
            <div className="flex flex-col gap-5">
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {t.selectConsentType}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONSENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() =>
                      cat.active && handleSelectCategory(cat.key)
                    }
                    className={cls(
                      "p-4 rounded-xl border-2 flex flex-col gap-2 transition-colors",
                      lang === "ar"
                        ? "items-end text-right"
                        : "items-start text-left",
                      cat.active
                        ? "border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                        : "border-dashed border-border/50 opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div
                      className={cls(
                        "flex items-center gap-2 w-full",
                        lang === "ar"
                          ? "flex-row-reverse justify-between"
                          : "flex-row justify-between",
                      )}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {categoryLabel(cat, lang)}
                      </span>
                      {!cat.active && (
                        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {t.comingSoon}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? cat.descAr : cat.descEn}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "patient-lookup" && (
            <div className="flex flex-col gap-5">
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {t.patientLookup}
              </h2>
              {selectedCategoryMeta && (
                <p
                  className={cls(
                    "text-xs text-muted-foreground",
                    lang === "ar" ? "text-right" : "text-left",
                  )}
                >
                  {lang === "ar" ? "نوع الموافقة: " : "Consent type: "}
                  <span className="font-semibold text-foreground">
                    {categoryLabel(selectedCategoryMeta, lang)}
                  </span>
                </p>
              )}
              {templatesError && (
                <Alert type="warning" lang={lang}>
                  {templatesError}
                </Alert>
              )}
              <Card className="p-5">
                <div className="flex flex-col gap-3">
                  <label
                    className={cls(
                      "text-sm font-semibold text-foreground",
                      lang === "ar" ? "text-right" : "text-left",
                    )}
                  >
                    {t.mrnLabel}
                  </label>
                  <div
                    className={cls(
                      "flex gap-2",
                      lang === "ar" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <input
                      value={mrnInput}
                      onChange={(e) => setMrnInput(e.target.value)}
                      placeholder="MRN-XXXXXXXX"
                      dir="ltr"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSearch();
                      }}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-input-background font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSearch()}
                      disabled={searchLoading || templatesLoading}
                      className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {searchLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Search size={14} />
                      )}
                      {t.searchBtn}
                    </button>
                  </div>
                </div>
              </Card>

              {searchError && (
                <Alert type="info" lang={lang}>
                  {searchError}
                </Alert>
              )}

              {searchResults.map((p) => (
                <Card key={`${p.mrn}-${p.caseId || p.id}`} className="p-4">
                  <div
                    className={cls(
                      "flex items-center gap-3",
                      lang === "ar" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div
                      className={cls(
                        "flex-1",
                        lang === "ar" ? "text-right" : "text-left",
                      )}
                    >
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {p.mrn}
                        {p.gender ? ` · ${p.gender}` : ""}
                        {p.dateOfBirth ? ` · ${p.dateOfBirth}` : ""}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/80 mt-0.5">
                        {p.source === "trakcare"
                          ? lang === "ar"
                            ? "مصدر: TrakCare"
                            : "Source: TrakCare"
                          : lang === "ar"
                            ? "مصدر: سجل الحالات"
                            : "Source: case registry"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChoosePatient(p)}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      {t.sendConsent}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {screen === "dispatch" && (
            <div className="flex flex-col gap-5">
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {t.dispatchConsent}
              </h2>
              {!selectedPatient || !selectedCategoryMeta ? (
                <Alert type="warning" lang={lang}>
                  {lang === "ar"
                    ? "اختر نوع الموافقة والمريض أولاً."
                    : "Select a consent type and patient first."}
                </Alert>
              ) : (
                <Card className="p-5 flex flex-col gap-4">
                  {[
                    {
                      label: lang === "ar" ? "المريض" : "Patient",
                      value: selectedPatient.name,
                    },
                    {
                      label: lang === "ar" ? "رقم الملف" : "MRN",
                      value: selectedPatient.mrn,
                      mono: true,
                    },
                    {
                      label:
                        lang === "ar" ? "نوع الموافقة" : "Consent Type",
                      value: categoryLabel(selectedCategoryMeta, lang),
                    },
                    {
                      label:
                        lang === "ar"
                          ? "القالب المعتمد"
                          : "Approved Template",
                      value:
                        templates[0]
                          ? lang === "ar"
                            ? templates[0].titleAr ||
                              templates[0].titleEn ||
                              templates[0].templateCode ||
                              ""
                            : templates[0].titleEn ||
                              templates[0].titleAr ||
                              templates[0].templateCode ||
                              ""
                          : lang === "ar"
                            ? "لا يوجد قالب"
                            : "No template",
                    },
                    {
                      label:
                        lang === "ar" ? "الطبيب المسؤول" : "Physician",
                      value: currentUser.name,
                    },
                    {
                      label:
                        lang === "ar" ? "طريقة الإرسال" : "Delivery",
                      value:
                        lang === "ar"
                          ? "رابط آمن عبر البريد + SMS"
                          : "Secure Email + SMS Link",
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className={cls(
                        "flex justify-between items-start",
                        lang === "ar" ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="text-xs text-muted-foreground">
                        {row.label}
                      </span>
                      <span
                        className={cls(
                          "text-sm font-medium text-foreground max-w-xs",
                          lang === "ar" ? "text-right" : "text-left",
                          row.mono ? "font-mono" : "",
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}

                  <div className="h-px bg-border" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        {lang === "ar"
                          ? "بريد المريض الإلكتروني"
                          : "Patient email"}
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        dir="ltr"
                        className="px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        {lang === "ar" ? "رقم الجوال" : "Mobile number"}
                      </label>
                      <input
                        type="tel"
                        value={recipientMobile}
                        onChange={(e) => setRecipientMobile(e.target.value)}
                        placeholder="+9665XXXXXXXX"
                        dir="ltr"
                        className="px-3 py-2 rounded-lg border border-border bg-input-background font-mono text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <Alert type="warning" lang={lang}>
                    {lang === "ar"
                      ? "بعد الإرسال، لا يمكن تعديل محتوى الموافقة. تأكد من صحة المعلومات."
                      : "After dispatch, consent content cannot be modified. Verify all information."}
                  </Alert>

                  {dispatchError && (
                    <Alert type="error" lang={lang}>
                      {dispatchError}
                    </Alert>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleDispatch()}
                    disabled={dispatchLoading}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {dispatchLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {t.sendConsent}
                  </button>
                </Card>
              )}
            </div>
          )}

          {screen === "status-tracker" && (
            <div className="flex flex-col gap-5">
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  lang === "ar" ? "text-right" : "text-left",
                )}
              >
                {t.statusTracker}
              </h2>

              {dispatchSuccessRef && (
                <Alert type="success" lang={lang}>
                  {(lang === "ar"
                    ? "تم إرسال طلب الموافقة بنجاح. الرقم المرجعي: "
                    : "Consent request dispatched. Reference: ") +
                    dispatchSuccessRef}
                </Alert>
              )}

              {docsLoading && (
                <Card className="p-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  {lang === "ar" ? "تحميل…" : "Loading…"}
                </Card>
              )}

              {docsError && (
                <Alert type="error" lang={lang}>
                  {docsError}
                </Alert>
              )}

              {!docsLoading && !docsError && docs.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  {lang === "ar"
                    ? "لا توجد طلبات موافقة بعد"
                    : "No consent requests yet"}
                </Card>
              )}

              {docs.map((d) => {
                const meta = statusLabel(d.status, lang);
                const tone =
                  meta.tone === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : meta.tone === "expired"
                      ? "bg-red-100 text-red-700"
                      : meta.tone === "draft"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-700";
                const title =
                  lang === "ar"
                    ? d.template?.titleAr || d.template?.titleEn || ""
                    : d.template?.titleEn || d.template?.titleAr || "";
                return (
                  <Card key={d.id} className="p-4">
                    <div
                      className={cls(
                        "flex items-center gap-3",
                        lang === "ar" ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={15} className="text-primary" />
                      </div>
                      <div
                        className={cls(
                          "flex-1 min-w-0",
                          lang === "ar" ? "text-right" : "text-left",
                        )}
                      >
                        <p className="text-sm font-semibold text-foreground truncate">
                          {d.patientName ||
                            d.case?.patientName ||
                            (lang === "ar" ? "غير معروف" : "Unknown")}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {d.mrn ||
                            d.case?.medicalRecordNo ||
                            d.case?.caseNumber ||
                            "—"}
                          {title ? ` · ${title}` : ""}
                        </p>
                      </div>
                      <div
                        className={cls(
                          "flex flex-col gap-1",
                          lang === "ar" ? "items-start" : "items-end",
                        )}
                      >
                        <span
                          className={cls(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            tone,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatRelative(d.createdAt, lang)}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ApprovedPhysicianDashboard;
