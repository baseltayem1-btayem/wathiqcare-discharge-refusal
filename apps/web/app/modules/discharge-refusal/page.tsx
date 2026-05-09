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
      <div className="space-y-4">
        <section className="wc-panel space-y-2">
          <div className="wc-panel-heading">Module Overview</div>
          <p className="text-sm leading-6 text-slate-700">
            This module governs discharge-refusal workflows, including refusal capture, case progression, and legally auditable evidence preparation.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/dashboard" className="wc-link-card">
            <span>Case Dashboard</span>
          </Link>
          <Link href="/cases" className="wc-link-card">
            <span>Case Registry</span>
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
