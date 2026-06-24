
"use client";
import { useState, use } from "react";
import AppShell from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/make-ui/tabs";

type CaseWorkspacePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function CaseWorkspacePage({ params }: CaseWorkspacePageProps) {
  const { id } = use(params);
  const [tab, setTab] = useState("overview");

  // Demo data for legal readiness and evidence
  const readiness = {
    status: "جاهز قانونياً",
    color: "emerald",
    details: "جميع المتطلبات القانونية مكتملة."
  };
  const evidenceSummary = [
    { label: "توقيع المريض", value: "مكتمل" },
    { label: "توقيع الطبيب", value: "مكتمل" },
    { label: "مستند الرفض", value: "مرفق" },
    { label: "تاريخ الإبلاغ", value: "2026-03-28" },
  ];

  return (
    <AppShell title={`الحالة #${id}`} subtitle="مساحة عمل الحالة">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border bg-white shadow p-6 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold text-${readiness.color}-700 mb-2`}>الحالة القانونية</span>
            <span className={`text-2xl font-extrabold text-${readiness.color}-600 mb-1`}>{readiness.status}</span>
            <span className="text-slate-500 text-sm text-center">{readiness.details}</span>
          </div>
          <div className="md:col-span-2 rounded-2xl border bg-white shadow p-6 flex flex-col gap-2">
            <span className="text-lg font-bold text-cyan-800 mb-2">ملخص الأدلة</span>
            <div className="grid grid-cols-2 gap-2">
              {evidenceSummary.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold w-32">{item.label}:</span>
                  <span className="text-slate-900 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex gap-2 bg-slate-50 p-2 rounded-xl shadow-inner">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
            <TabsTrigger value="actor-events">الأحداث الفاعلة</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
            <TabsTrigger value="audit-chain">سلسلة التدقيق</TabsTrigger>
            <TabsTrigger value="evidence-report">تقرير الأدلة</TabsTrigger>
          </TabsList>
          <div className="mt-2">
            <TabsContent value="overview">
              <h2 className="text-xl font-bold mb-3 text-cyan-900">نظرة عامة على الحالة</h2>
              <div className="rounded-xl border bg-white shadow p-6 text-slate-700 mb-4">معلومات موجزة عن الحالة #{id}.</div>
              <div className="text-slate-400 text-center">لا توجد بيانات إضافية حالياً.</div>
            </TabsContent>
            <TabsContent value="timeline">
              <h2 className="text-xl font-bold mb-3 text-cyan-900">الخط الزمني</h2>
              <div className="rounded-xl border bg-white shadow p-6 text-slate-700 mb-4">عرض تسلسل الأحداث الرئيسية للحالة.</div>
              <div className="text-slate-400 text-center">لا توجد أحداث بعد.</div>
            </TabsContent>
            <TabsContent value="actor-events">
              <h2 className="text-xl font-bold mb-3 text-cyan-900">الأحداث الفاعلة</h2>
              <div className="rounded-xl border bg-white shadow p-6 text-slate-700 mb-4">سجل الأحداث المرتبطة بالمشاركين في الحالة.</div>
              <div className="text-slate-400 text-center">لا توجد أحداث بعد.</div>
            </TabsContent>
            <TabsContent value="documents">
              <h2 className="text-xl font-bold mb-3 text-cyan-900">المستندات</h2>
              <div className="rounded-xl border bg-white shadow p-6 text-slate-700 mb-4">قائمة المستندات المرتبطة بالحالة.</div>
              <div className="text-slate-400 text-center">لا توجد مستندات مرفقة.</div>
            </TabsContent>
            <TabsContent value="audit-chain">
              <h2 className="text-xl font-bold mb-3 text-cyan-900">سلسلة التدقيق</h2>
              <div className="rounded-xl border bg-white shadow p-6 text-slate-700 mb-4">عرض سلسلة تدقيق الحالة.</div>
              <div className="text-slate-400 text-center">لا توجد بيانات تدقيق بعد.</div>
            </TabsContent>
            <TabsContent value="evidence-report">
              <h2 className="text-xl font-bold mb-3 text-emerald-900">تقرير الأدلة القانونية</h2>
              <div className="rounded-xl border bg-slate-50 shadow p-6 text-slate-700 mb-4">
                <div className="mb-4">
                  <span className="block text-cyan-800 font-bold mb-1">ملخص الحالة</span>
                  <div className="text-slate-700">معلومات موجزة عن الحالة #{id} (اسم المريض، الطبيب، التشخيص، الحالة القانونية).</div>
                </div>
                <div className="mb-4">
                  <span className="block text-cyan-800 font-bold mb-1">الخط الزمني الرئيسي</span>
                  <ul className="list-disc pl-6 text-slate-700">
                    <li>تاريخ فتح الحالة: 2026-03-28</li>
                    <li>تقديم القرار للمريض: 2026-03-29</li>
                    <li>توقيع المريض: 2026-03-29</li>
                    <li>توقيع الطبيب: 2026-03-29</li>
                  </ul>
                </div>
                <div className="mb-4">
                  <span className="block text-cyan-800 font-bold mb-1">ملخص الأحداث الفاعلة</span>
                  <ul className="list-disc pl-6 text-slate-700">
                    <li>المريض: وافق على القرار</li>
                    <li>الطبيب: وثق القرار</li>
                  </ul>
                </div>
                <div className="mb-4">
                  <span className="block text-cyan-800 font-bold mb-1">سلسلة التدقيق</span>
                  <ul className="list-disc pl-6 text-slate-700">
                    <li>تسجيل جميع الأحداث في النظام</li>
                    <li>تدقيق التواقيع والمستندات</li>
                  </ul>
                </div>
                <div>
                  <span className="block text-cyan-800 font-bold mb-1">ملخص المستندات المرتبطة</span>
                  <ul className="list-disc pl-6 text-slate-700">
                    <li>مستند الرفض: مرفق</li>
                    <li>تقرير توقيع المريض: مكتمل</li>
                    <li>تقرير توقيع الطبيب: مكتمل</li>
                  </ul>
                </div>
              </div>
              <div className="text-slate-400 text-center text-sm">تقرير الأدلة للعرض فقط. للاستخدام القانوني والتنفيذي.</div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}
