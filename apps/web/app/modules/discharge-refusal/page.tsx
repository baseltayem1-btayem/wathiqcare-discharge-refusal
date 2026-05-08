import Link from "next/link";
import ModuleShell from "@/components/ModuleShell";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function DischargeRefusalModulePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/discharge-refusal");

  return (
    <ModuleShell
      auth={auth}
      moduleKey="discharge-refusal"
      title={{ ar: "منصة رفض الخروج", en: "Discharge Refusal Platform" }}
      subtitle={{
        ar: "نقطة دخول توافقية للمسارات التشغيلية المعتمدة لرفض الخروج.",
        en: "Compatibility entry point for the approved discharge refusal operations stack.",
      }}
      menuItems={[
        { href: "/modules/discharge-refusal", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
        { href: "/modules/discharge-refusal/dashboard", label: { ar: "لوحة الحالات", en: "Case Dashboard" } },
        { href: "/modules/discharge-refusal/cases", label: { ar: "سجل الحالات", en: "Case Registry" } },
      ]}
      nextAction={{ href: "/dashboard", label: "Open Case Dashboard", variant: "primary" }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/dashboard" className="wc-link-card">
          <span>Case Dashboard</span>
        </Link>
        <Link href="/cases" className="wc-link-card">
          <span>Case Registry</span>
        </Link>
      </div>
    </ModuleShell>
  );
}
