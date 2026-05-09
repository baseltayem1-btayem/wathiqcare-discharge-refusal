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
        ar: "وحدة تشغيلية لإدارة حالات رفض الخروج مع التوثيق والتصعيد القانوني.",
        en: "Operational module for discharge-refusal cases, documentation, and legal escalation.",
      }}
      menuItems={[
        { href: "/modules/discharge-refusal", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
        { href: "/modules/discharge-refusal/dashboard", label: { ar: "لوحة الحالات", en: "Case Dashboard" } },
        { href: "/modules/discharge-refusal/cases", label: { ar: "سجل الحالات", en: "Case Registry" } },
      ]}
      nextAction={{ href: "/dashboard", label: "Open Case Dashboard", variant: "primary" }}
    >
      <div className="space-y-4">
        <section className="wc-panel space-y-3">
          <div className="wc-panel-heading">Module Summary / ملخص الوحدة</div>
          <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <li className="wc-panel wc-panel-inline">Purpose / الغرض: manage discharge-refusal decisions with legally traceable records.</li>
            <li className="wc-panel wc-panel-inline">Workflow / سير العمل: case capture, patient acknowledgment, escalation, and closure evidence.</li>
            <li className="wc-panel wc-panel-inline">Key Functions / الوظائف: refusal forms, witness capture, document packaging, and dashboard monitoring.</li>
            <li className="wc-panel wc-panel-inline">Controls / الضوابط: role-scoped operations, audit timeline, and evidence readiness.</li>
          </ul>
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
