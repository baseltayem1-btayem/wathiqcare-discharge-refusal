"use client";

import { useState } from "react";
import {
  Gavel,
  LifeBuoy,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

type PanelMode = "settings" | "legal-support" | "legal-consultation" | "technical-ticket";

type EnterpriseSupportSettingsPanelProps = {
  lang?: "en" | "ar";
  caseId?: string;
  tenantId?: string;
  actorUserId?: string;
};

const panelCards: Array<{
  key: PanelMode;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: typeof Settings;
}> = [
  {
    key: "settings",
    title: "Settings",
    titleAr: "الإعدادات",
    description: "Configure collaboration, notification, and consent workflow behavior.",
    descriptionAr: "ضبط إعدادات التعاون والإشعارات وسلوك رحلة الموافقات.",
    icon: SlidersHorizontal,
  },
  {
    key: "legal-support",
    title: "Legal Support",
    titleAr: "الدعم القانوني",
    description: "Review legal guidance, consent wording safeguards, and medico-legal escalation rules.",
    descriptionAr: "مراجعة الإرشادات القانونية وضوابط صياغة الموافقة وقواعد التصعيد الطبي القانوني.",
    icon: Gavel,
  },
  {
    key: "legal-consultation",
    title: "Legal Consultation",
    titleAr: "طلب استشارة قانونية",
    description: "Submit a legal consultation request related to consent wording, risk, or sufficiency.",
    descriptionAr: "إرسال طلب استشارة قانونية متعلق بصياغة الموافقة أو المخاطر أو الكفاية النظامية.",
    icon: LifeBuoy,
  },
  {
    key: "technical-ticket",
    title: "Technical Support Ticket",
    titleAr: "فتح تذكرة دعم فني",
    description: "Report technical issues in signing, PDF rendering, SMS, email, or workflow behavior.",
    descriptionAr: "الإبلاغ عن مشاكل تقنية في التوقيع أو عرض PDF أو الرسائل أو سلوك الرحلة.",
    icon: Wrench,
  },
];

export function EnterpriseSupportSettingsPanel({
  lang = "en",
  caseId,
  tenantId,
  actorUserId,
}: EnterpriseSupportSettingsPanelProps) {
  const isAr = lang === "ar";
  const [activeMode, setActiveMode] = useState<PanelMode>("settings");
  const [priority, setPriority] = useState("Normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function submitSupportRequest(requestType: "LEGAL_CONSULTATION" | "TECHNICAL_SUPPORT" | "MEDICAL_COMMUNICATION") {
    setStatusMessage("");

    if (!subject.trim() || !message.trim()) {
      setStatusMessage(isAr ? "يرجى إدخال الموضوع والتفاصيل قبل الإرسال." : "Please enter the subject and details before submission.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/modules/informed-consents/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          priority,
          subject,
          message,
          caseId,
          tenantId,
          actorUserId,
          source: "PHYSICIAN_ENTERPRISE_WORKFLOW",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setStatusMessage(payload?.message || (isAr ? "تعذر إرسال الطلب." : "Failed to submit request."));
        return;
      }

      setSubject("");
      setMessage("");
      setPriority("Normal");
      setStatusMessage(payload.message || (isAr ? "تم إرسال الطلب بنجاح." : "Request submitted successfully."));
    } catch {
      setStatusMessage(isAr ? "فشل الاتصال بخدمة الدعم." : "Support service communication failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {panelCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeMode === card.key;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setActiveMode(card.key);
                setStatusMessage("");
              }}
              className={[
                "rounded-2xl border p-5 text-start shadow-sm transition",
                isActive
                  ? "border-[#002B5C] bg-[#EEF5FF]"
                  : "border-[#D8DCE3] bg-white hover:border-[#4B9CD3]",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-[#002B5C] p-2 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-[#002B5C]">
                    {isAr ? card.titleAr : card.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#4B5563]">
                    {isAr ? card.descriptionAr : card.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeMode === "settings" ? (
        <div className="rounded-2xl border border-[#D8DCE3] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#002B5C]">
                {isAr ? "إعدادات رحلة الموافقة المستنيرة" : "Informed Consent Workflow Settings"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                {isAr
                  ? "هذه الإعدادات مؤقتة داخل الواجهة لحين ربطها بإعدادات المستأجر والفريق من قاعدة البيانات."
                  : "These settings are UI-ready and can later be connected to tenant and team configuration APIs."}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isAr ? "Enterprise-ready" : "Enterprise-ready"}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingToggle label={isAr ? "تفعيل مراجعة التخدير قبل الإرسال" : "Require anesthesia review before sending"} defaultChecked />
            <SettingToggle label={isAr ? "تفعيل الإشعار الموحد للمريض" : "Enable unified patient notification"} defaultChecked />
            <SettingToggle label={isAr ? "إظهار مسودة PDF في المراجعة" : "Show draft PDF during review"} defaultChecked />
            <SettingToggle label={isAr ? "تفعيل سجل التدقيق للتعاون الداخلي" : "Enable audit trail for internal collaboration"} defaultChecked />
          </div>

          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#002B5C] px-5 py-3 text-sm font-bold text-white hover:bg-[#001F42]"
          >
            <Save className="h-4 w-4" />
            {isAr ? "حفظ الإعدادات" : "Save Settings"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#D8DCE3] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-[#002B5C]" />
            <h3 className="text-lg font-bold text-[#002B5C]">
              {activeMode === "legal-support"
                ? isAr ? "الدعم القانوني" : "Legal Support"
                : activeMode === "legal-consultation"
                  ? isAr ? "طلب استشارة قانونية" : "Legal Consultation Request"
                  : isAr ? "فتح تذكرة دعم فني" : "Technical Support Ticket"}
            </h3>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <label className="block">
              <span className="text-sm font-bold text-[#002B5C]">{isAr ? "الأولوية" : "Priority"}</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D8DCE3] bg-white px-4 py-3 text-sm outline-none focus:border-[#002B5C]"
              >
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#002B5C]">{isAr ? "الموضوع" : "Subject"}</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D8DCE3] bg-white px-4 py-3 text-sm outline-none focus:border-[#002B5C]"
                placeholder={isAr ? "مثال: مراجعة صياغة موافقة التخدير" : "Example: Review anesthesia consent wording"}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#002B5C]">{isAr ? "التفاصيل" : "Details"}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-xl border border-[#D8DCE3] bg-white px-4 py-3 text-sm outline-none focus:border-[#002B5C]"
                placeholder={isAr ? "اكتب تفاصيل الطلب..." : "Write request details..."}
              />
            </label>

            {statusMessage ? (
              <div className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] px-4 py-3 text-sm text-[#374151]">
                {statusMessage}
              </div>
            ) : null}

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                submitSupportRequest(
                  activeMode === "technical-ticket"
                    ? "TECHNICAL_SUPPORT"
                    : "LEGAL_CONSULTATION",
                )
              }
              className="w-fit rounded-xl bg-[#002B5C] px-5 py-3 text-sm font-bold text-white hover:bg-[#001F42] disabled:opacity-60"
            >
              {saving ? (isAr ? "جارٍ الإرسال..." : "Submitting...") : isAr ? "إرسال الطلب" : "Submit Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingToggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] px-4 py-3 text-sm">
      <span className="font-semibold text-[#374151]">{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4" />
    </label>
  );
}



