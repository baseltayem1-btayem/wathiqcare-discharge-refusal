"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type CaseRecord = {
  id: string;
  status?: string;
  pdf_file?: string | null;
  metadata?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function caseReadyForFinalization(caseRecord: CaseRecord): boolean {
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);
  const witness = asRecord(metadata?.witness);

  const required = [
    Boolean(signature?.outcome),
    Boolean(workflow?.discussion_summary),
    Boolean(signature?.signer_name || signature?.outcome),
    Boolean(witness?.witness_name),
    Boolean(workflow?.refusal_started_at || workflow?.discharge_decision_at),
    Boolean(caseRecord.pdf_file),
  ];

  return required.every(Boolean);
}

export default function LegalOperationalOverviewPage() {
  const { lang } = useI18n();
  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<CaseRecord[]>("/api/cases?limit=300", { signal: controller.signal })
      .then((payload) => setCases(payload || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const total = cases.length;
    const ready = cases.filter(caseReadyForFinalization).length;
    const blocked = Math.max(0, total - ready);
    const pdfSuccess = cases.filter((item) => Boolean(item.pdf_file)).length;
    const pdfSuccessRate = total > 0 ? Math.round((pdfSuccess / total) * 100) : 0;

    return {
      total,
      ready,
      blocked,
      missingDataAlerts: blocked,
      pdfSuccessRate,
    };
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title={tr("Legal & Operational Overview", "النظرة العامة القانونية والتشغيلية")}
        subtitle={tr(
          "Executive dashboard for clinical operations, legal readiness, and inspection preparedness.",
          "لوحة تنفيذية للعمليات السريرية والجاهزية القانونية والاستعداد للتفتيش.",
        )}
      >
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {tr("Loading executive metrics...", "جاري تحميل المؤشرات التنفيذية...")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card><CardHeader><CardTitle className="text-sm">{tr("Total Cases", "إجمالي الحالات")}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-slate-900">{metrics.total}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">{tr("Ready for Finalization", "جاهزة للاعتماد النهائي")}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-700">{metrics.ready}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">{tr("Blocked Cases", "حالات محظورة")}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-700">{metrics.blocked}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">{tr("Missing Data Alerts", "تنبيهات نقص البيانات")}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-rose-700">{metrics.missingDataAlerts}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">{tr("PDF Success Rate", "معدل نجاح PDF")}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-700">{metrics.pdfSuccessRate}%</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{tr("Executive Readiness Summary", "ملخص الجاهزية التنفيذية")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div>{tr("This view supports clinical leadership, legal directors, and regulatory inspection review.", "هذا العرض يدعم القيادة السريرية ومديري الشؤون القانونية ومراجعات التفتيش التنظيمي.")}</div>
                <div>{tr("Finalization is enforced by readiness rules and missing data alerts.", "يتم فرض الاعتماد النهائي عبر قواعد الجاهزية وتنبيهات نقص البيانات.")}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
