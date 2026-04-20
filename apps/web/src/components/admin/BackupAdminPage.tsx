"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DatabaseBackup, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type BackupJob = {
  id: string;
  backupType: string;
  storageLocation: string;
  region: string;
  encrypted: boolean;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  restoreVerifiedAt?: string | null;
};

type RestoreTest = {
  id: string;
  resultStatus: string;
  rpoMinutes?: number | null;
  rtoMinutes?: number | null;
  executedAt?: string;
  notes?: string | null;
};

type BackupDashboard = {
  summary?: {
    totalJobs?: number;
    successfulJobs?: number;
    failedJobs?: number;
    encryptedJobs?: number;
    restoreVerifiedJobs?: number;
    restorePassCount?: number;
    latestRegion?: string | null;
    latestSuccessfulAt?: string | null;
  };
  targets?: {
    rpoMinutes?: number;
    rtoMinutes?: number;
  };
  jobs?: BackupJob[];
  restoreTests?: RestoreTest[];
};

function statusVariant(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "SUCCEEDED" || normalized === "PASSED") return "success" as const;
  if (normalized === "FAILED") return "warning" as const;
  return "outline" as const;
}

export default function BackupAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const backupStatusLabel = useCallback((value: string) => {
    switch (value) {
      case "SCHEDULED":
        return txt("Scheduled", "مجدول");
      case "RUNNING":
        return txt("Running", "قيد التشغيل");
      case "SUCCEEDED":
        return txt("Succeeded", "ناجح");
      case "FAILED":
        return txt("Failed", "فشل");
      default:
        return value;
    }
  }, [txt]);
  const restoreResultLabel = useCallback((value: string) => {
    switch (value) {
      case "PASSED":
        return txt("Passed", "نجح");
      case "FAILED":
        return txt("Failed", "فشل");
      case "PARTIAL":
        return txt("Partial", "جزئي");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<BackupDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepUpVerified, setStepUpVerified] = useState(false);
  const [form, setForm] = useState({
    backupType: "scheduled_snapshot",
    storageLocation: "ksa-primary-vault",
    region: "saudi-arabia-riyadh",
    encrypted: true,
    status: "SUCCEEDED",
    restoreResultStatus: "PASSED",
    restoreNotes: "Quarterly restore drill completed.",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<BackupDashboard>("/api/admin/backups", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load backup dashboard.", "تعذر تحميل لوحة النسخ الاحتياطي."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Backup jobs", "مهام النسخ الاحتياطي"), value: dashboard?.summary?.totalJobs ?? 0 },
      { label: txt("Successful jobs", "المهام الناجحة"), value: dashboard?.summary?.successfulJobs ?? 0 },
      { label: txt("Restore passes", "اختبارات الاستعادة الناجحة"), value: dashboard?.summary?.restorePassCount ?? 0 },
      { label: txt("Encrypted jobs", "المهام المشفرة"), value: dashboard?.summary?.encryptedJobs ?? 0 },
    ],
    [dashboard, txt],
  );

  async function handleRegisterBackup() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/backups", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(txt("Backup/DR event registered.", "تم تسجيل حدث النسخ الاحتياطي/التعافي."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to register backup job.", "تعذر تسجيل مهمة النسخ الاحتياطي."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Backups & DR", "النسخ الاحتياطي والتعافي")}
        subtitle={txt("Phase 3 workspace for backup readiness, restore drills, and continuity targets.", "مساحة العمل للمرحلة 3 لجهوزية النسخ الاحتياطي وتمارين الاستعادة وأهداف استمرارية العمل.")}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> {txt("Refresh", "تحديث")}
          </Button>
        }
      >
        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardTitle className="text-sm text-slate-600">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{txt("Register backup or restore drill", "تسجيل نسخة احتياطية أو تمرين استعادة")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StepUpVerificationPanel
              actionKey="backup_job_create"
              description={txt("Backups, restore drills, and DR registrations require an active step-up session.", "يتطلب تسجيل النسخ الاحتياطية وتمارين الاستعادة وخطط التعافي جلسة تحقق معزز نشطة.")}
              onVerifiedChange={setStepUpVerified}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Backup type", "نوع النسخ الاحتياطي")} value={form.backupType} onChange={(e) => setForm((current) => ({ ...current, backupType: e.target.value }))} />
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Storage location", "موقع التخزين")} value={form.storageLocation} onChange={(e) => setForm((current) => ({ ...current, storageLocation: e.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Region", "المنطقة")} value={form.region} onChange={(e) => setForm((current) => ({ ...current, region: e.target.value }))} />
              <select aria-label={txt("Backup job status", "حالة مهمة النسخ الاحتياطي")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                {['SCHEDULED', 'RUNNING', 'SUCCEEDED', 'FAILED'].map((option) => <option key={option} value={option}>{backupStatusLabel(option)}</option>)}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select aria-label={txt("Restore test result", "نتيجة اختبار الاستعادة")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.restoreResultStatus} onChange={(e) => setForm((current) => ({ ...current, restoreResultStatus: e.target.value }))}>
                {['PASSED', 'FAILED', 'PARTIAL'].map((option) => <option key={option} value={option}>{restoreResultLabel(option)}</option>)}
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.encrypted} onChange={(e) => setForm((current) => ({ ...current, encrypted: e.target.checked }))} />
                {txt("Encryption enabled", "التشفير مفعّل")}
              </label>
            </div>
            <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Restore notes", "ملاحظات الاستعادة")} value={form.restoreNotes} onChange={(e) => setForm((current) => ({ ...current, restoreNotes: e.target.value }))} />
            <Button onClick={() => void handleRegisterBackup()} disabled={busy || loading || !stepUpVerified}>{txt("Register backup event", "تسجيل حدث النسخ الاحتياطي")}</Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Backup jobs", "مهام النسخ الاحتياطي")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(dashboard?.jobs ?? []).slice(0, 8).map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-800">{job.backupType}</div>
                    <Badge variant={statusVariant(job.status)}>{backupStatusLabel(job.status)}</Badge>
                  </div>
                  <div className="text-slate-500">{job.storageLocation} · {job.region}</div>
                  <div className="text-slate-400">{txt("Encrypted", "مشفر")}: {job.encrypted ? txt('Yes', 'نعم') : txt('No', 'لا')} · {txt("Restore verified", "تم التحقق من الاستعادة")}: {job.restoreVerifiedAt ? txt('Yes', 'نعم') : txt('No', 'لا')}</div>
                </div>
              ))}
              {(dashboard?.jobs ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No backup jobs recorded yet.", "لا توجد مهام نسخ احتياطي مسجلة بعد.")}</div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Restore tests & targets", "اختبارات الاستعادة والأهداف")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                <DatabaseBackup className="mr-2 inline h-4 w-4" /> {txt("RPO target", "هدف RPO")}: {dashboard?.targets?.rpoMinutes ?? 60} {txt("min", "دقيقة")} · {txt("RTO target", "هدف RTO")}: {dashboard?.targets?.rtoMinutes ?? 240} {txt("min", "دقيقة")}
              </div>
              {(dashboard?.restoreTests ?? []).slice(0, 8).map((test) => (
                <div key={test.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{txt("Restore test", "اختبار الاستعادة")}</span>
                    <Badge variant={statusVariant(test.resultStatus)}>{restoreResultLabel(test.resultStatus)}</Badge>
                  </div>
                  <div className="text-slate-500">RPO: {test.rpoMinutes ?? '—'} {txt("min", "دقيقة")} · RTO: {test.rtoMinutes ?? '—'} {txt("min", "دقيقة")}</div>
                  <div className="text-slate-400">{test.notes || txt('No notes recorded.', 'لا توجد ملاحظات مسجلة.')}</div>
                </div>
              ))}
              {(dashboard?.restoreTests ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No restore drills have been recorded yet.", "لا توجد تمارين استعادة مسجلة بعد.")}</div> : null}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
