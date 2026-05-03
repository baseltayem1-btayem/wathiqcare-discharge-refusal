import RoleDashboard from "@/components/RoleDashboard";
import { ClipboardList, BarChart2, Users, AlertTriangle, ShieldCheck } from "lucide-react";

export default function MedicalDirectorDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Medical Director Dashboard"
      roleTitleAr="لوحة تحكم المدير الطبي"
      roleColor="#dc2626"
      quickActions={[
        { label: "All Cases", labelAr: "جميع الحالات", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Dashboard Analytics", labelAr: "تحليلات لوحة التحكم", href: "/dashboard", icon: <BarChart2 className="h-4 w-4" /> },
        { label: "Compliance", labelAr: "الامتثال", href: "/compliance", icon: <ShieldCheck className="h-4 w-4" /> },
        { label: "Escalations", labelAr: "التصعيدات", href: "/legal-escalation", icon: <AlertTriangle className="h-4 w-4" /> },
        { label: "Team Users", labelAr: "المستخدمون", href: "/tenant/users", icon: <Users className="h-4 w-4" /> },
      ]}
    />
  );
}
