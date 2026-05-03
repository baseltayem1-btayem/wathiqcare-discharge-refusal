import RoleDashboard from "@/components/RoleDashboard";
import { Users, Settings, ClipboardList, ShieldCheck, BarChart2 } from "lucide-react";

export default function TenantDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Hospital Admin Dashboard"
      roleTitleAr="لوحة تحكم مدير المستشفى"
      roleColor="#2563eb"
      quickActions={[
        { label: "Manage Users", labelAr: "إدارة المستخدمين", href: "/tenant/users", icon: <Users className="h-4 w-4" /> },
        { label: "All Cases", labelAr: "جميع الحالات", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Compliance", labelAr: "الامتثال", href: "/compliance", icon: <ShieldCheck className="h-4 w-4" /> },
        { label: "Reports", labelAr: "التقارير", href: "/reports", icon: <BarChart2 className="h-4 w-4" /> },
        { label: "Security Settings", labelAr: "إعدادات الأمان", href: "/tenant/security", icon: <Settings className="h-4 w-4" /> },
      ]}
    />
  );
}
