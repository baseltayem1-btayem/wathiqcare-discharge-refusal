"use client";

import Link from "next/link";
import { BriefcaseBusiness, FileSignature, Landmark, Scale, ShieldCheck, Stethoscope, Workflow } from "lucide-react";

import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { getAccessibleModules, moduleStatusLabel, type ModuleDefinition, type ModuleKey } from "@/lib/modules/catalog";

type PortalAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

const CAPABILITIES = [
  {
    icon: Scale,
    enTitle: "Medico-Legal Governance",
    arTitle: "الحوكمة الطبية القانونية",
    enText: "Structured governance controls for clinical decisions, legal accountability, and defensible records.",
    arText: "ضوابط حوكمة منظمة للقرارات السريرية، المساءلة القانونية، والسجلات القابلة للدفاع.",
  },
  {
    icon: Workflow,
    enTitle: "Digital Compliance Automation",
    arTitle: "أتمتة الامتثال الرقمي",
    enText: "Automated workflows that reduce manual handoffs while preserving procedural precision.",
    arText: "مسارات عمل مؤتمتة تقلل التدخلات اليدوية مع الحفاظ على الانضباط الإجرائي.",
  },
  {
    icon: FileSignature,
    enTitle: "Secure Patient Acknowledgment",
    arTitle: "الإقرار الآمن من المريض",
    enText: "Secure acknowledgment journeys with signature, OTP, and identity-sensitive evidence capture.",
    arText: "رحلات إقرار آمنة تتضمن التوقيع، رمز التحقق، والتقاط أدلة رقمية مرتبطة بالهوية.",
  },
  {
    icon: ShieldCheck,
    enTitle: "Audit & Evidence Management",
    arTitle: "إدارة التدقيق والأدلة",
    enText: "Audit-grade timelines, evidence bundles, and traceable operational records.",
    arText: "تسلسل زمني بدرجة تدقيقية، حزم أدلة، وسجلات تشغيلية قابلة للتتبع.",
  },
  {
    icon: Stethoscope,
    enTitle: "Healthcare Legal Workflow Engineering",
    arTitle: "هندسة المسارات القانونية الصحية",
    enText: "Operational design for clinical-legal processes across care, consent, and medico-legal escalation.",
    arText: "تصميم تشغيلي للمسارات السريرية القانونية عبر الرعاية، الموافقات، والتصعيد الطبي القانوني.",
  },
  {
    icon: BriefcaseBusiness,
    enTitle: "Enterprise Operational Risk Control",
    arTitle: "التحكم في المخاطر التشغيلية المؤسسية",
    enText: "Enterprise-grade oversight for risk control, accountability, and compliance execution.",
    arText: "إشراف مؤسسي عالي الانضباط للتحكم بالمخاطر، المساءلة، وتنفيذ الامتثال.",
  },
] as const;

const GOVERNANCE_STRIP = [
  { en: "Audit-Ready", ar: "جاهز للتدقيق" },
  { en: "PDPL-Aware", ar: "مراعٍ لمتطلبات PDPL" },
  { en: "Medico-Legal", ar: "طبي قانوني" },
  { en: "Secure Digital Evidence", ar: "أدلة رقمية مؤمنة" },
  { en: "Healthcare Governance", ar: "حوكمة صحية" },
  { en: "Enterprise Workflow Automation", ar: "أتمتة مؤسسية للمسارات" },
] as const;

function ModuleIcon({ moduleKey }: { moduleKey: ModuleKey }) {
  if (moduleKey === "promissory-notes") {
    return <Landmark className="h-5 w-5 text-[var(--primary)]" />;
  }
  if (moduleKey === "discharge-refusal") {
    return <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />;
  }
  return <FileSignature className="h-5 w-5 text-[var(--primary)]" />;
}

function ModuleCard({ moduleItem, isRtl }: { moduleItem: ModuleDefinition; isRtl: boolean }) {
  return (
    <div className="wc-panel space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <ModuleIcon moduleKey={moduleItem.key} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">{isRtl ? moduleItem.arabicTitle : moduleItem.englishTitle}</div>
            <div className="text-xs text-slate-500">{isRtl ? moduleItem.englishTitle : moduleItem.arabicTitle}</div>
          </div>
        </div>
        <span className="wc-module-pill">{moduleStatusLabel(moduleItem.status, isRtl)}</span>
      </div>
      <p className="text-sm leading-6 text-slate-700">{isRtl ? moduleItem.executiveDescription.ar : moduleItem.executiveDescription.en}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <span className="text-xs text-slate-500">{isRtl ? moduleItem.shortDescription.ar : moduleItem.shortDescription.en}</span>
        <Link href={moduleItem.href} className="toolbar-btn toolbar-btn-primary">
          {isRtl ? "فتح الوحدة" : "Open Module"}
        </Link>
      </div>
    </div>
  );
}

export default function ModulePortalPage({ auth }: { auth: PortalAuth }) {
  const { isRtl } = useI18n();
  const availableModules = getAccessibleModules({ role: auth.role, platformRole: auth.platform_role });

  return (
    <ModuleShell
      auth={auth}
      title={{
        ar: "بوابة منصة وثيق كير",
        en: "WathiqCare Platform Portal",
      }}
      subtitle={{
        ar: "منصة تنفيذية متخصصة في الهندسة القانونية للقطاعين الصحي والقانوني.",
        en: "A specialized legal-engineering platform for healthcare and legal-sector compliance operations.",
      }}
      eyebrow={{
        ar: "الامتثال والحوكمة الطبية القانونية",
        en: "Medico-Legal Compliance & Governance",
      }}
    >
      <div className="space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div className="wc-panel space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">WathiqCare</div>
              <h2 className="text-2xl font-semibold leading-tight text-slate-900">
                {isRtl
                  ? "واثق كير هي منصة متخصصة في الهندسة القانونية للقطاعين الصحي والقانوني، تقدم حلولاً مؤتمتة عالية الاحترافية لإدارة الامتثال القانوني، الحوكمة الطبية القانونية، الأدلة الرقمية، وإدارة المخاطر التشغيلية."
                  : "WathiqCare is a specialized legal-engineering platform focused on the healthcare and legal sectors, delivering highly automated compliance, medico-legal governance, digital evidence, and operational risk-management solutions."}
              </h2>
            </div>
            <p className="text-sm leading-7 text-slate-700">
              {isRtl
                ? "تم تصميم المنصة لتمكين مسارات عمل رقمية منضبطة تشمل التوثيق الطبي القانوني، الإقرار الآمن من المرضى، الامتثال الرقمي، الأرشفة القانونية، وإنتاج الأدلة التشغيلية القابلة للدفاع المؤسسي."
                : "The platform is designed to operationalize legally structured digital processes across medico-legal workflow automation, secure patient acknowledgment, digital compliance, legal archiving, and defensible operational evidence."}
            </p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {[
                { en: "Medico-Legal Workflow Automation", ar: "أتمتة المسارات الطبية القانونية" },
                { en: "Digital Compliance", ar: "الامتثال الرقمي" },
                { en: "Legal Defensibility", ar: "القابلية للدفاع القانوني" },
                { en: "Secure Patient Acknowledgment", ar: "الإقرار الآمن من المريض" },
                { en: "Audit-Grade Operational Workflows", ar: "مسارات تشغيلية بدرجة تدقيقية" },
                { en: "Healthcare Governance Enablement", ar: "تمكين الحوكمة الصحية" },
              ].map((item) => (
                <div key={item.en} className="wc-data-chip justify-start">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{isRtl ? item.ar : item.en}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="wc-panel space-y-3">
            <div className="wc-panel-heading">{isRtl ? "التموضع المؤسسي" : "Executive Positioning"}</div>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="wc-panel wc-panel-inline">
                <Scale className="h-4 w-4 text-[var(--primary)]" />
                <span>{isRtl ? "منصة تشغيلية منضبطة للحوكمة والامتثال الطبي القانوني" : "A governed operating platform for medico-legal compliance and healthcare governance"}</span>
              </div>
              <div className="wc-panel wc-panel-inline">
                <Workflow className="h-4 w-4 text-[var(--primary)]" />
                <span>{isRtl ? "مبنية لرحلات عمل قابلة للتوسع والتدقيق عبر وحدات تطبيقية متخصصة" : "Built for scalable, audit-ready workflows across specialized application modules"}</span>
              </div>
              <div className="wc-panel wc-panel-inline">
                <Landmark className="h-4 w-4 text-[var(--primary)]" />
                <span>{isRtl ? "تركز على الأدلة الرقمية، السيطرة التشغيلية، والامتثال القابل للإثبات" : "Focused on digital evidence, operational control, and defensible compliance execution"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="wc-panel space-y-4">
          <div className="wc-panel-heading">{isRtl ? "قدرات الشركة" : "Company Capabilities"}</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <div key={capability.enTitle} className="wc-panel space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <Icon className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{isRtl ? capability.arTitle : capability.enTitle}</div>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{isRtl ? capability.arText : capability.enText}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="wc-panel-heading">{isRtl ? "وحدات المنصة" : "Platform Modules"}</div>
          <div className="grid gap-3 xl:grid-cols-3">
            {availableModules.map((moduleItem) => (
              <ModuleCard key={moduleItem.key} moduleItem={moduleItem} isRtl={isRtl} />
            ))}
          </div>
        </section>

        <section className="wc-panel">
          <div className="flex flex-wrap gap-2">
            {GOVERNANCE_STRIP.map((item) => (
              <span key={item.en} className="wc-module-pill">{isRtl ? item.ar : item.en}</span>
            ))}
          </div>
        </section>

        <section className="wc-panel text-center">
          <div className="text-sm font-semibold text-slate-900">{isRtl ? "واثق كير" : "WathiqCare"}</div>
          <div className="mt-1 text-xs text-slate-600">
            {isRtl
              ? "الهندسة القانونية للامتثال والحوكمة الصحية المؤسسية"
              : "Legal Engineering for Healthcare & Enterprise Compliance"}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}