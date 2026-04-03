
import AppShell from "@/components/AppShell";
import Link from "next/link";

const demoCases = [
  { id: "1001", case_number: "CASE-1001", mrn: "123", diagnosis: "Test Diagnosis", physician: "Dr. Ahmad" },
  { id: "1002", case_number: "CASE-1002", mrn: "456", diagnosis: "Sample Case", physician: "Dr. Sara" },
];

export default function CasesPage() {
  return (
    <AppShell title="الحالات" subtitle="إدارة حالات رفض الخروج الطبي">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-extrabold text-cyan-900">قائمة الحالات</h2>
          <span className="rounded-full bg-cyan-50 text-cyan-700 px-4 py-1 text-sm font-semibold border border-cyan-100">{demoCases.length} حالة</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border bg-white shadow p-5 flex flex-col gap-2">
            <span className="text-lg font-bold text-cyan-800">الحالات النشطة</span>
            <span className="text-2xl font-extrabold text-cyan-700">2</span>
            <span className="text-slate-500 text-sm">حالات قيد المتابعة حالياً</span>
          </div>
          <div className="rounded-xl border bg-white shadow p-5 flex flex-col gap-2">
            <span className="text-lg font-bold text-emerald-700">جاهزة للإغلاق</span>
            <span className="text-2xl font-extrabold text-emerald-600">1</span>
            <span className="text-slate-500 text-sm">بانتظار الإغلاق النهائي</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white shadow mb-8">
          <table className="min-w-full text-slate-800">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="py-3 px-4 text-right">رقم الحالة</th>
                <th className="py-3 px-4 text-right">MRN</th>
                <th className="py-3 px-4 text-right">التشخيص</th>
                <th className="py-3 px-4 text-right">الطبيب</th>
                <th className="py-3 px-4 text-right">الانتقال</th>
              </tr>
            </thead>
            <tbody>
              {demoCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">لا توجد حالات حالياً.</td>
                </tr>
              ) : (
                demoCases.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 px-4 font-mono">{c.case_number}</td>
                    <td className="py-2 px-4">{c.mrn}</td>
                    <td className="py-2 px-4">{c.diagnosis}</td>
                    <td className="py-2 px-4">{c.physician}</td>
                    <td className="py-2 px-4">
                      <Link href={`/cases/${c.id}`} className="text-cyan-700 underline font-semibold">الدخول</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-cyan-700 underline font-semibold">العودة للوحة التحكم</Link>
        </div>
      </div>
    </AppShell>
  );
}
