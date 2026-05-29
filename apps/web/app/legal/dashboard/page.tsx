import RoleDashboard from "@/components/RoleDashboard";
import { ClipboardList, FileText, AlertTriangle, Scale, BookOpen, ShieldCheck } from "lucide-react";

export default function LegalDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Legal Dashboard"
      roleTitleAr="لوحة تحكم القانونية"
      roleColor="#7c3aed"
      quickActions={[
        { label: "Compliance Review", labelAr: "مراجعة الامتثال", href: "/legal/compliance", icon: <ShieldCheck className="h-4 w-4" /> },
        { label: "Legal Cases", labelAr: "القضايا القانونية", href: "/legal-case-file", icon: <Scale className="h-4 w-4" /> },
        { label: "Escalations", labelAr: "التصعيدات", href: "/legal-escalation", icon: <AlertTriangle className="h-4 w-4" /> },
        { label: "Escalation Timeline", labelAr: "جدول التصعيدات", href: "/escalation-timeline", icon: <FileText className="h-4 w-4" /> },
        { label: "All Cases", labelAr: "جميع الحالات", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Legal Alerts", labelAr: "التنبيهات القانونية", href: "/legal-alerts", icon: <BookOpen className="h-4 w-4" /> },
      ]}
    />
  );
}
