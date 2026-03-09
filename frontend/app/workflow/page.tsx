"use client";

import Link from "next/link";
import { ArrowRight, FileText, Workflow } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";

export default function WorkflowPage() {
  return (
    <AuthGuard>
      <AppShell
        title="سير العمل / المستندات"
        subtitle="افتح أي حالة لتنفيذ إجراءات سير عمل رفض الخروج وإنشاء المستندات."
        actions={
          <>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Workflow className="h-4 w-4" />
              الحالات
            </Link>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <FileText className="h-4 w-4" />
              حالة جديدة
            </Link>
          </>
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <p>
            للوصول إلى إجراءات سير العمل والنماذج والمستندات المُنشأة، افتح صفحة تفاصيل الحالة.
          </p>
          <p className="mt-2">
            من هناك يمكنك تنفيذ خطوات سير عمل رفض الخروج، وإنشاء نماذج الرفض،
            وإنشاء الإشعارات المالية، وتنزيل المستندات أو عرضها.
          </p>
          <Link
            href="/cases"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            فتح الحالات
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
