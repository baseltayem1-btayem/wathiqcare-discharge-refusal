export type LoginPlatformModule = {
  id: "consents" | "promissory" | "discharge";
  title: string;
  summary: string;
};

export type LoginPlatformBranding = {
  platformName: string;
  platformTitle: string;
  platformHeadline: string;
  platformDescription: string;
  licensedSubscriberLabel: string;
  licensedSubscriberValue: string;
  versionLabel: string;
  versionValue: string;
  secureWorkspaceTitle: string;
  secureWorkspaceSubtitle: string;
  modulesTitle: string;
  modulesSubtitle: string;
  footer: string;
  modules: LoginPlatformModule[];
};

const PLATFORM_VERSION = "7.2.4";
const LICENSED_SUBSCRIBER = "International Medical Center (IMC)";

const EN_BRANDING: LoginPlatformBranding = {
  platformName: "WathiqCare™",
  platformTitle: "Enterprise Healthcare Legal SaaS Platform",
  platformHeadline:
    "Healthcare Legal Workflows, Digital Evidence & Secure Medical Documentation",
  platformDescription:
    "A secure enterprise platform for healthcare legal workflows, informed consents, promissory notes, discharge refusal management, digital signatures, medico-legal evidence, and compliance-driven medical documentation.",
  licensedSubscriberLabel: "Licensed Subscriber",
  licensedSubscriberValue: LICENSED_SUBSCRIBER,
  versionLabel: "Platform Version",
  versionValue: PLATFORM_VERSION,
  secureWorkspaceTitle: "Active Workspace",
  secureWorkspaceSubtitle:
    "Secure enterprise workspace with tenant-isolated healthcare legal workflows.",
  modulesTitle: "Platform Modules",
  modulesSubtitle:
    "Isolated applications managed under one subscriber-secured enterprise environment.",
  footer: "WathiqCare™ Enterprise Healthcare Legal SaaS Platform",
  modules: [
    {
      id: "consents",
      title: "Informed Consents",
      summary:
        "Digital informed consent workflows, AI-assisted medical/legal documentation, and secure patient signatures.",
    },
    {
      id: "promissory",
      title: "Promissory Notes",
      summary:
        "Electronic promissory notes with QR verification and secure financial/legal workflow controls.",
    },
    {
      id: "discharge",
      title: "Discharge Refusal / DAMA",
      summary:
        "Legal discharge refusal documentation, escalation workflows, and medico-legal evidence preservation.",
    },
  ],
};

const AR_BRANDING: LoginPlatformBranding = {
  platformName: "واثق كير™",
  platformTitle: "منصة SaaS مؤسسية للرعاية الصحية القانونية",
  platformHeadline:
    "سير عمل قانوني صحي، أدلة رقمية، وتوثيق طبي آمن",
  platformDescription:
    "منصة مؤسسية آمنة لإدارة سير العمل القانوني الصحي، والموافقات المستنيرة، والسندات لأمر، وإدارة رفض الخروج، والتوقيعات الرقمية، والأدلة الطبية القانونية، والتوثيق الطبي المدفوع بالامتثال.",
  licensedSubscriberLabel: "الجهة المرخّص لها",
  licensedSubscriberValue: LICENSED_SUBSCRIBER,
  versionLabel: "إصدار المنصة",
  versionValue: PLATFORM_VERSION,
  secureWorkspaceTitle: "بيئة العمل النشطة",
  secureWorkspaceSubtitle:
    "بيئة مؤسسية آمنة بسير عمل قانوني صحي مع عزل كامل للمستأجر.",
  modulesTitle: "وحدات المنصة",
  modulesSubtitle:
    "تطبيقات معزولة تعمل تحت بيئة مؤسسية واحدة مؤمنة للمشترك.",
  footer: "واثق كير™ منصة SaaS مؤسسية للرعاية الصحية القانونية",
  modules: [
    {
      id: "consents",
      title: "الموافقات المستنيرة",
      summary:
        "سير عمل رقمي للموافقات المستنيرة، وصياغة طبية/قانونية مدعومة بالذكاء الاصطناعي، وتوقيعات مرضى آمنة.",
    },
    {
      id: "promissory",
      title: "السندات لأمر",
      summary:
        "سندات لأمر إلكترونية مع تحقق QR وضوابط آمنة لسير العمل المالي والقانوني.",
    },
    {
      id: "discharge",
      title: "رفض الخروج / DAMA",
      summary:
        "توثيق قانوني لرفض الخروج، ومسارات تصعيد، وحفظ الأدلة الطبية القانونية.",
    },
  ],
};

export function getLoginPlatformBranding(isArabic: boolean): LoginPlatformBranding {
  return isArabic ? AR_BRANDING : EN_BRANDING;
}
