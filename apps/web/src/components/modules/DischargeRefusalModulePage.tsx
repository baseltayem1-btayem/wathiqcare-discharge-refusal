"use client";

import Link from "next/link";
import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

export default function DischargeRefusalModulePage({ auth }: { auth: ModuleAuth }) {
  const { isRtl } = useI18n();

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
      nextAction={{ href: "/dashboard", label: isRtl ? "فتح لوحة الحالات" : "Open Case Dashboard", variant: "primary" }}
    >
      <div className="space-y-4">
        <section className="wc-panel space-y-3">
          <div className="wc-panel-heading">{isRtl ? "ملخص الوحدة" : "Module Summary"}</div>
          <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <li className="wc-panel wc-panel-inline">{isRtl ? "الغرض: إدارة قرارات رفض الخروج مع توثيق قانوني قابل للتتبع." : "Purpose: manage discharge-refusal decisions with legally traceable records."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "سير العمل: تسجيل الحالة، إقرار المريض، التصعيد، وإغلاق الملف." : "Workflow: case capture, patient acknowledgment, escalation, and closure evidence."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "الوظائف الأساسية: نماذج الرفض، توثيق الشهود، وتجهيز الحزم القانونية." : "Key functions: refusal forms, witness capture, document packaging, and dashboard monitoring."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "الضوابط: تشغيل مبني على الأدوار، تسلسل تدقيقي، وجاهزية الأدلة." : "Controls: role-scoped operations, audit timeline, and evidence readiness."}</li>
          </ul>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/dashboard" className="wc-link-card">
            <span>{isRtl ? "لوحة الحالات" : "Case Dashboard"}</span>
          </Link>
          <Link href="/cases" className="wc-link-card">
            <span>{isRtl ? "سجل الحالات" : "Case Registry"}</span>
          </Link>
        </div>
      </div>
    </ModuleShell>
  );
}
