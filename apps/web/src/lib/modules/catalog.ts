import { canonicalizeUserRole } from "@/lib/server/roles";
import { INFORMED_CONSENTS_ALLOWED_ROLES } from "@/lib/modules/informed-consents-release";

export type ModuleKey = "informed-consents" | "promissory-notes" | "discharge-refusal";

export type ModuleAccessContext = {
  role?: string | null;
  platformRole?: string | null;
};

export type ModuleStatus = "ready" | "planned" | "live";

export type ModuleDefinition = {
  key: ModuleKey;
  slug: ModuleKey;
  arabicTitle: string;
  englishTitle: string;
  shortDescription: {
    ar: string;
    en: string;
  };
  executiveDescription: {
    ar: string;
    en: string;
  };
  status: ModuleStatus;
  href: string;
  allowedRoles: readonly string[];
};

const HEALTHCARE_WORKFLOW_ROLES = [
  "tenant_owner",
  "tenant_admin",
  "legal_admin",
  "doctor",
  "nursing",
  "medical_director",
  "patient_affairs",
  "social_services",
  "quality",
  "compliance",
] as const;

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: "informed-consents",
    slug: "informed-consents",
    arabicTitle: "الموافقات المستنيرة",
    englishTitle: "Informed Consents",
    shortDescription: {
      ar: "إدارة نماذج الموافقة المستنيرة، مسارات الإقرار، التوقيع، والأرشفة الطبية القانونية.",
      en: "Manage informed-consent workflows, patient acknowledgment, signature capture, and medico-legal archiving.",
    },
    executiveDescription: {
      ar: "مسارات رقمية منظمة لإدارة الموافقات المستنيرة، إقرار المريض، واعتمادات الرعاية الصحية القابلة للتتبع قانونياً.",
      en: "Structured digital workflows for secure informed-consent management, patient acknowledgment, and legally traceable healthcare approvals.",
    },
    status: "live",
    href: "/modules/informed-consents",
    allowedRoles: INFORMED_CONSENTS_ALLOWED_ROLES,
  },
  {
    key: "promissory-notes",
    slug: "promissory-notes",
    arabicTitle: "تطبيق السندات لأمر الإلكترونية",
    englishTitle: "Electronic Promissory Notes",
    shortDescription: {
      ar: "إدارة السندات لأمر الإلكترونية، التعهدات المالية، الإقرارات الرقمية، والأرشفة النظامية الداعمة.",
      en: "Manage electronic promissory notes, financial undertakings, digital acknowledgments, and supporting legal records.",
    },
    executiveDescription: {
      ar: "عمليات رقمية منضبطة للسندات لأمر والتعهدات المالية مع إقرار إلكتروني وأرشفة قانونية قابلة للإثبات.",
      en: "Governed digital workflows for promissory notes and financial undertakings with secure acknowledgments and defensible legal archiving.",
    },
    status: "live",
    href: "/modules/promissory-notes/enterprise",
    allowedRoles: ["tenant_owner", "tenant_admin", "legal_admin", "finance_officer", "compliance"],
  },
  {
    key: "discharge-refusal",
    slug: "discharge-refusal",
    arabicTitle: "منصة رفض الخروج",
    englishTitle: "Discharge Refusal Platform",
    shortDescription: {
      ar: "إدارة حالات رفض الخروج، إقرار المريض، مسارات التدقيق، وتوليد الحزم القانونية.",
      en: "Manage discharge refusal cases, secure patient acknowledgment, audit trails, and legal package generation.",
    },
    executiveDescription: {
      ar: "إدارة حالات رفض الخروج بمسارات سريرية وقانونية مؤمنة تشمل الإقرار، التدقيق، والأدلة الرقمية القابلة للدفاع.",
      en: "Operational discharge-refusal workflows covering patient acknowledgment, audit sequencing, secure evidence, and legal package output.",
    },
    status: "live",
    href: "/modules/discharge-refusal",
    allowedRoles: HEALTHCARE_WORKFLOW_ROLES,
  },
];

export function getModuleDefinition(moduleKey: ModuleKey): ModuleDefinition {
  const definition = MODULE_DEFINITIONS.find((item) => item.key === moduleKey);
  if (!definition) {
    throw new Error(`Unknown module: ${moduleKey}`);
  }
  return definition;
}

export function moduleStatusLabel(status: ModuleStatus, isRtl: boolean): string {
  switch (status) {
    case "live":
      return isRtl ? "تشغيلي" : "Operational";
    case "ready":
      return isRtl ? "جاهز" : "Ready";
    default:
      return isRtl ? "هيكل جاهز" : "Structure Ready";
  }
}

export function canAccessModule(moduleKey: ModuleKey, access: ModuleAccessContext): boolean {
  if ((access.platformRole || "").trim()) {
    return true;
  }

  const role = canonicalizeUserRole(access.role);
  const definition = getModuleDefinition(moduleKey);
  return definition.allowedRoles.includes(role);
}

export function getAccessibleModules(access: ModuleAccessContext): ModuleDefinition[] {
  return MODULE_DEFINITIONS.filter((moduleDefinition) => canAccessModule(moduleDefinition.key, access));
}

export function resolveModuleKeyFromPath(pathname: string): ModuleKey | null {
  if (pathname.startsWith("/modules/informed-consents")) {
    return "informed-consents";
  }
  if (pathname.startsWith("/modules/promissory-notes")) {
    return "promissory-notes";
  }
  if (pathname.startsWith("/modules/discharge-refusal")) {
    return "discharge-refusal";
  }
  if (
    pathname === "/dashboard"
    || pathname.startsWith("/cases")
    || pathname.startsWith("/documents")
    || pathname.startsWith("/alerts")
    || pathname.startsWith("/legal-risk")
    || pathname.startsWith("/reports")
    || pathname.startsWith("/dashboards")
    || pathname.startsWith("/bundles")
  ) {
    return "discharge-refusal";
  }
  return null;
}
