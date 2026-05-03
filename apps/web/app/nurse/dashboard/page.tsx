import RoleDashboard from "@/components/RoleDashboard";
import { ClipboardList, FileText, AlertTriangle, Activity } from "lucide-react";

export default function NurseDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Nurse Dashboard"
      roleTitleAr="لوحة تحكم التمريض"
      roleColor="#0f766e"
      quickActions={[
        { label: "My Cases", labelAr: "الحالات", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Refusal Forms", labelAr: "نماذج الرفض", href: "/refusal-forms", icon: <FileText className="h-4 w-4" /> },
        { label: "Escalations", labelAr: "التصعيدات", href: "/legal-escalation", icon: <AlertTriangle className="h-4 w-4" /> },
        { label: "Dashboard", labelAr: "لوحة التحكم", href: "/dashboard", icon: <Activity className="h-4 w-4" /> },
      ]}
    />
  );
}
