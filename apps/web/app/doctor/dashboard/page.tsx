import RoleDashboard from "@/components/RoleDashboard";
import { FileText, PlusCircle, ClipboardList, AlertTriangle, BookOpen } from "lucide-react";

export default function DoctorDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Doctor Dashboard"
      roleTitleAr="لوحة تحكم الطبيب"
      roleColor="#0891b2"
      quickActions={[
        { label: "New Case", labelAr: "حالة جديدة", href: "/cases/new", icon: <PlusCircle className="h-4 w-4" /> },
        { label: "My Cases", labelAr: "حالاتي", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Refusal Forms", labelAr: "نماذج الرفض", href: "/refusal-forms", icon: <FileText className="h-4 w-4" /> },
        { label: "ICD-11 Validator", labelAr: "التحقق من ICD-11", href: "/icd11-validator", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Escalations", labelAr: "التصعيدات", href: "/legal-escalation", icon: <AlertTriangle className="h-4 w-4" /> },
      ]}
    />
  );
}
