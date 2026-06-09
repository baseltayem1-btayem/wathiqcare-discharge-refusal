import { useState } from "react";
import { Search, FileText, CheckSquare, Star, Plus, ChevronRight, Eye } from "lucide-react";

interface Props { lang: "en" | "ar" }

const categories = [
  { id: "all", en: "All Categories", ar: "جميع التخصصات" },
  { id: "surgery", en: "General Surgery", ar: "جراحة عامة" },
  { id: "cardiology", en: "Cardiology", ar: "أمراض القلب" },
  { id: "ortho", en: "Orthopedics", ar: "جراحة العظام" },
  { id: "gastro", en: "Gastroenterology", ar: "الجهاز الهضمي" },
  { id: "ophthal", en: "Ophthalmology", ar: "طب العيون" },
  { id: "anesthesia", en: "Anesthesia", ar: "التخدير" },
];

const forms = [
  { id: 1, nameEn: "Appendectomy Consent", nameAr: "موافقة استئصال الزائدة", cat: "surgery", version: "v3.2", usageCount: 247, risk: "medium", starred: true, approvedBy: "Legal & Medical Committee", lastUpdated: "01 May 2026" },
  { id: 2, nameEn: "Cardiac Catheterization Consent", nameAr: "موافقة القسطرة القلبية", cat: "cardiology", version: "v2.8", usageCount: 183, risk: "high", starred: true, approvedBy: "Cardiology Board", lastUpdated: "15 Apr 2026" },
  { id: 3, nameEn: "Total Knee Replacement", nameAr: "تبديل مفصل الركبة الكلي", cat: "ortho", version: "v4.1", usageCount: 129, risk: "high", starred: false, approvedBy: "Orthopedic Committee", lastUpdated: "10 Mar 2026" },
  { id: 4, nameEn: "Colonoscopy Procedure", nameAr: "إجراء تنظير القولون", cat: "gastro", version: "v2.0", usageCount: 312, risk: "low", starred: false, approvedBy: "Gastro Department", lastUpdated: "20 Feb 2026" },
  { id: 5, nameEn: "Cataract Surgery Consent", nameAr: "موافقة جراحة الساد", cat: "ophthal", version: "v3.5", usageCount: 201, risk: "low", starred: true, approvedBy: "Ophthalmology Board", lastUpdated: "05 Mar 2026" },
  { id: 6, nameEn: "General Anesthesia Consent", nameAr: "موافقة التخدير العام", cat: "anesthesia", version: "v5.0", usageCount: 589, risk: "high", starred: true, approvedBy: "Anesthesia Committee", lastUpdated: "01 Jun 2026" },
  { id: 7, nameEn: "Hernia Repair Consent", nameAr: "موافقة إصلاح الفتق", cat: "surgery", version: "v2.3", usageCount: 156, risk: "medium", starred: false, approvedBy: "Legal & Medical Committee", lastUpdated: "12 Apr 2026" },
  { id: 8, nameEn: "Spinal / Epidural Consent", nameAr: "موافقة التخدير النخاعي", cat: "anesthesia", version: "v3.1", usageCount: 98, risk: "high", starred: false, approvedBy: "Anesthesia Committee", lastUpdated: "28 Apr 2026" },
];

const riskColor: Record<string, string> = { low: "#19A978", medium: "#D9A93B", high: "#E84B7A" };
const riskLabel: Record<string, { en: string; ar: string }> = {
  low: { en: "Low Risk", ar: "مخاطر منخفضة" },
  medium: { en: "Med Risk", ar: "مخاطر متوسطة" },
  high: { en: "High Risk", ar: "مخاطر عالية" },
};

export function ApprovedForms({ lang }: Props) {
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const isRTL = lang === "ar";

  const filtered = forms.filter(f =>
    (cat === "all" || f.cat === cat) &&
    (isRTL ? f.nameAr : f.nameEn).toLowerCase().includes(search.toLowerCase())
  );

  const prev = forms.find(f => f.id === preview);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "مكتبة النماذج المعتمدة" : "Approved Forms Library"}
            </h2>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#123B5C" }}>
              <Plus size={14} /> {isRTL ? "طلب نموذج جديد" : "Request New Form"}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-white rounded-xl border" style={{ borderColor: "#D8E8EF" }}>
            <Search size={14} style={{ color: "#64798B" }} />
            <input
              className="flex-1 text-sm outline-none bg-transparent"
              placeholder={isRTL ? "البحث في النماذج..." : "Search forms..."}
              style={{ color: "#102A43" }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-all"
                style={{
                  borderColor: cat === c.id ? "#2F90C7" : "#D8E8EF",
                  background: cat === c.id ? "#EAF6FF" : "white",
                  color: cat === c.id ? "#2F90C7" : "#64798B"
                }}
              >
                {isRTL ? c.ar : c.en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(form => (
              <div
                key={form.id}
                className="bg-white rounded-2xl border p-5 flex flex-col gap-3 hover:shadow-md transition-all"
                style={{ borderColor: "#D8E8EF" }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EAF6FF" }}>
                    <FileText size={18} style={{ color: "#2F90C7" }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {form.starred && <Star size={13} fill="#D9A93B" style={{ color: "#D9A93B" }} />}
                    <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: riskColor[form.risk] + "18", color: riskColor[form.risk] }}>
                      {isRTL ? riskLabel[form.risk].ar : riskLabel[form.risk].en}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? form.nameAr : form.nameEn}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-2" style={{ color: "#64798B" }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: "#F1EFFF", color: "#6B5CE7" }}>{form.version}</span>
                    <span>{form.usageCount} {isRTL ? "استخدام" : "uses"}</span>
                  </div>
                </div>
                <div className="text-xs p-2 rounded-lg" style={{ background: "#F7FBFC", color: "#64798B" }}>
                  <span className="font-semibold">{isRTL ? "معتمد من:" : "Approved by:"}</span> {form.approvedBy}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setPreview(form.id === preview ? null : form.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all"
                    style={{ borderColor: "#D8E8EF", color: "#64798B" }}
                  >
                    <Eye size={12} /> {isRTL ? "معاينة" : "Preview"}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "#2F90C7" }}>
                    <Plus size={12} /> {isRTL ? "استخدام" : "Use"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview panel */}
      {prev && (
        <div className="w-80 border-l bg-white overflow-y-auto flex-shrink-0" style={{ borderColor: "#D8E8EF" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#D8E8EF" }}>
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "معاينة النموذج" : "Form Preview"}
            </span>
            <button onClick={() => setPreview(null)} className="text-xs" style={{ color: "#64798B" }}>✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EAF6FF" }}>
                <CheckSquare size={20} style={{ color: "#2F90C7" }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? prev.nameAr : prev.nameEn}</div>
                <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>{prev.version} · {prev.lastUpdated}</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { labelEn: "Approved By", labelAr: "معتمد من", val: prev.approvedBy },
                { labelEn: "Last Updated", labelAr: "آخر تحديث", val: prev.lastUpdated },
                { labelEn: "Total Uses", labelAr: "مرات الاستخدام", val: `${prev.usageCount}` },
              ].map(row => (
                <div key={row.labelEn} className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#64798B" }}>{isRTL ? row.labelAr : row.labelEn}</div>
                  <div className="text-sm" style={{ color: "#102A43" }}>{row.val}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl" style={{ background: "#F7FBFC", border: "1px solid #D8E8EF" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#64798B" }}>
                {isRTL ? "أقسام النموذج" : "FORM SECTIONS"}
              </div>
              {[
                isRTL ? "هوية المريض والموافقة" : "Patient Identity & Consent",
                isRTL ? "وصف الإجراء" : "Procedure Description",
                isRTL ? "المخاطر والمضاعفات" : "Risks & Complications",
                isRTL ? "البدائل المتاحة" : "Alternatives Available",
                isRTL ? "أسئلة المريض" : "Patient Questions",
                isRTL ? "التوقيع الإلكتروني" : "Electronic Signature",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2F90C7" }} />
                  <span className="text-xs" style={{ color: "#102A43" }}>{s}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}>
              {isRTL ? "استخدام هذا النموذج" : "Use This Form"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
