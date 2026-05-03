import RoleDashboard from "@/components/RoleDashboard";
import { ClipboardList, FileText, BarChart2, Receipt } from "lucide-react";

export default function FinanceDashboardPage() {
  return (
    <RoleDashboard
      roleTitle="Finance Dashboard"
      roleTitleAr="لوحة تحكم المالية"
      roleColor="#ca8a04"
      quickActions={[
        { label: "All Cases", labelAr: "جميع الحالات", href: "/cases", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Reports", labelAr: "التقارير", href: "/reports", icon: <BarChart2 className="h-4 w-4" /> },
        { label: "Refusal Forms", labelAr: "نماذج الرفض", href: "/refusal-forms", icon: <FileText className="h-4 w-4" /> },
        { label: "Bundles", labelAr: "الحزم", href: "/bundles", icon: <Receipt className="h-4 w-4" /> },
      ]}
    />
  );
}
