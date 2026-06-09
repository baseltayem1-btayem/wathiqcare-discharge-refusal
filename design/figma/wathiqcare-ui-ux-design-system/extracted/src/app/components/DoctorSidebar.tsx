import {
  FileText, Clock, CheckSquare, Wind, BookOpen, Shield,
  Archive, Activity, Settings, HelpCircle, LogOut, ChevronRight
} from "lucide-react";

export type DoctorScreen =
  | "home"
  | "create-consent"
  | "consent-records"
  | "approved-forms"
  | "anesthesia-queue"
  | "patient-education"
  | "compliance-review"
  | "audit-trail"
  | "settings";

interface Props {
  active: DoctorScreen;
  onNavigate: (s: DoctorScreen) => void;
  lang: "en" | "ar";
}

const navItems = [
  { id: "home", icon: FileText, en: "Create Consent", ar: "إنشاء موافقة" },
  { id: "create-consent", icon: Clock, en: "Pending Consents", ar: "الموافقات المعلقة" },
  { id: "consent-records", icon: Archive, en: "Consent Records", ar: "سجلات الموافقة" },
  { id: "approved-forms", icon: CheckSquare, en: "Approved Forms", ar: "النماذج المعتمدة" },
  { id: "anesthesia-queue", icon: Wind, en: "Anesthesia Queue", ar: "قائمة التخدير" },
  { id: "patient-education", icon: BookOpen, en: "Patient Education", ar: "تثقيف المريض" },
  { id: "compliance-review", icon: Shield, en: "Compliance Review", ar: "مراجعة الامتثال" },
  { id: "audit-trail", icon: Activity, en: "Audit Trail", ar: "مسار التدقيق" },
  { id: "settings", icon: Settings, en: "Settings & Support", ar: "الإعدادات والدعم" },
] as const;

export function DoctorSidebar({ active, onNavigate, lang }: Props) {
  return (
    <aside
      className="w-64 h-screen flex flex-col border-r"
      style={{ background: "#ffffff", borderColor: "#D8E8EF" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "#D8E8EF" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "linear-gradient(135deg, #123B5C 0%, #2F90C7 100%)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 3a2 2 0 110 4 2 2 0 010-4zm0 11c-2.67 0-5.03-1.34-6.42-3.37C4.79 10.82 8.17 10 10 10c1.83 0 5.21.82 6.42 2.63C14.03 14.66 11.67 16 10 16z" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "#123B5C" }}>WathiqCare</div>
            <div className="text-xs" style={{ color: "#64798B" }}>
              {lang === "en" ? "Doctor Workspace" : "مساحة الطبيب"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="mb-2 px-3 text-xs font-semibold tracking-wider uppercase" style={{ color: "#64798B" }}>
          {lang === "en" ? "Services" : "الخدمات"}
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id as DoctorScreen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
                  style={{
                    background: isActive ? "linear-gradient(90deg, #EAF6FF 0%, #EAFFFB 100%)" : "transparent",
                    color: isActive ? "#123B5C" : "#64798B",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  <item.icon size={16} style={{ color: isActive ? "#2F90C7" : "#64798B" }} />
                  <span className="flex-1 text-left">{lang === "en" ? item.en : item.ar}</span>
                  {isActive && <ChevronRight size={14} style={{ color: "#2F90C7" }} />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t" style={{ borderColor: "#D8E8EF" }}>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #123B5C 0%, #2F90C7 100%)" }}
          >
            AK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "#102A43" }}>
              {lang === "en" ? "Dr. Ahmad Khalil" : "د. أحمد خليل"}
            </div>
            <div className="text-xs truncate" style={{ color: "#64798B" }}>
              {lang === "en" ? "Surgeon · ICU" : "جراح · العناية المركزة"}
            </div>
          </div>
          <button className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <LogOut size={14} style={{ color: "#64798B" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
