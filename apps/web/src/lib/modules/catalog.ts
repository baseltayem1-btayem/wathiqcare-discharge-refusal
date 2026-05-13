import { canonicalizeUserRole } from "@/lib/server/roles";
import { INFORMED_CONSENTS_ALLOWED_ROLES } from "@/lib/modules/informed-consents-release";

export const ALL_MODULE_KEYS = [
  "informed-consents",
  "discharge-refusal",
  "promissory-notes",
  "legal-cases",
  "legal-documents",
  "incident-reports",
  "risk-management",
  "approvals",
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

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

const ENTERPRISE_GOVERNANCE_ROLES = [
  "tenant_owner",
  "tenant_admin",
  "legal_admin",
  "medical_director",
  "doctor",
  "nursing",
  "patient_affairs",
  "social_services",
  "quality",
  "compliance",
  "risk_manager",
  "external_reviewer",
  "read_only_auditor",
] as const;

const LEGAL_GOVERNANCE_ROLES = [
  "tenant_owner",
  "tenant_admin",
  "legal_admin",
  "medical_director",
  "quality",
  "compliance",
  "risk_manager",
  "patient_affairs",
  "external_reviewer",
  "read_only_auditor",
] as const;

const FINANCIAL_GOVERNANCE_ROLES = [
  "tenant_owner",
  "tenant_admin",
  "legal_admin",
  "finance_officer",
  "compliance",
  "quality",
  "read_only_auditor",
] as const;

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: "informed-consents",
    slug: "informed-consents",
    arabicTitle: "الموافقات المستنيرة",
    englishTitle: "Informed Consents",
    shortDescription: {
      ar: "إدارة الموافقات الطبية متعددة الأطراف مع التوقيع، التدقيق، وسلسلة الاعتماد.",
      en: "Govern multi-party informed consent with signatures, audit visibility, and routed approvals.",
    },
    executiveDescription: {
      ar: "مسار موافقات سريري قانوني مؤسسي يدعم التوجيه الديناميكي، التوقيع، والأدلة القانونية.",
      en: "Enterprise clinical-legal consent workflows with dynamic routing, signatures, and defensible evidence.",
    },
    status: "live",
    href: "/modules/informed-consents",
    allowedRoles: INFORMED_CONSENTS_ALLOWED_ROLES,
  },
  {
    key: "discharge-refusal",
    slug: "discharge-refusal",
    arabicTitle: "رفض الخروج",
    englishTitle: "Discharge Refusal",
    shortDescription: {
      ar: "حوكمة مسارات رفض الخروج مع تصعيدات قانونية، موافقات، وأدلة رقمية.",
      en: "Govern discharge-refusal workflows with legal escalation, approvals, and digital evidence.",
    },
    executiveDescription: {
      ar: "منصة تشغيلية مؤسسية لمسار رفض الخروج الطبي وربط السريرية بالشؤون القانونية والحوكمة.",
      en: "Enterprise operating model for discharge refusal bridging clinical, legal, and governance teams.",
    },
    status: "live",
    href: "/modules/discharge-refusal",
    allowedRoles: ENTERPRISE_GOVERNANCE_ROLES,
  },
  {
    key: "promissory-notes",
    slug: "promissory-notes",
    arabicTitle: "السندات لأمر الإلكترونية",
    englishTitle: "Electronic Promissory Notes",
    shortDescription: {
      ar: "إدارة التعهدات المالية الرقمية مع الأرشفة القانونية وسلسلة الاعتماد.",
      en: "Manage digital financial undertakings with legal archive controls and approval governance.",
    },
    executiveDescription: {
      ar: "وحدة مالية قانونية لسندات إلكترونية قابلة للتدقيق مع تفويض واعتمادات متسلسلة.",
      en: "Financial-legal module for auditable digital promissory notes with delegation and sequenced approvals.",
    },
    status: "live",
    href: "/modules/promissory-notes",
    allowedRoles: FINANCIAL_GOVERNANCE_ROLES,
  },
  {
    key: "legal-cases",
    slug: "legal-cases",
    arabicTitle: "القضايا القانونية",
    englishTitle: "Legal Cases",
    shortDescription: {
      ar: "إدارة القضايا الطبية القانونية مع مسارات مراجعة واعتماد متعددة الأطراف.",
      en: "Coordinate medico-legal case workspaces with multi-party review and approval routing.",
    },
    executiveDescription: {
      ar: "نظام قضايا مؤسسي يربط التدقيق، التصعيد، سلسلة الاعتماد، والدفاع القانوني.",
      en: "Enterprise case management connecting audit, escalation, approval chains, and legal defensibility.",
    },
    status: "live",
    href: "/modules/legal-cases",
    allowedRoles: LEGAL_GOVERNANCE_ROLES,
  },
  {
    key: "legal-documents",
    slug: "legal-documents",
    arabicTitle: "المستندات القانونية",
    englishTitle: "Legal Documents",
    shortDescription: {
      ar: "حوكمة المستندات القانونية مع الإصدار النهائي، الحفظ، والتتبع غير القابل للتغيير.",
      en: "Control legal document issuance, finalization, retention, and tamper-evident audit history.",
    },
    executiveDescription: {
      ar: "مركز مؤسسي للمستندات القانونية يشمل التوقيع، النسخ، العلامات المائية، وسلسلة الأدلة.",
      en: "Enterprise legal document hub with signatures, versioning, watermarking, and evidence chain.",
    },
    status: "live",
    href: "/modules/legal-documents",
    allowedRoles: [...LEGAL_GOVERNANCE_ROLES, "finance_officer"],
  },
  {
    key: "incident-reports",
    slug: "incident-reports",
    arabicTitle: "تقارير الحوادث",
    englishTitle: "Incident Reports",
    shortDescription: {
      ar: "إدارة الحوادث مع SLA، التصعيد، المراجعة، والتنسيق مع المخاطر والامتثال.",
      en: "Manage incidents with SLA timers, escalation, review workflows, and risk/compliance coordination.",
    },
    executiveDescription: {
      ar: "طبقة تشغيلية مؤسسية للحوادث تدعم التبليغ، التحقيق، الاعتماد، والأرشفة القانونية.",
      en: "Enterprise incident operations supporting reporting, investigation, approvals, and legal archive control.",
    },
    status: "live",
    href: "/modules/incident-reports",
    allowedRoles: [...ENTERPRISE_GOVERNANCE_ROLES, "auditor"],
  },
  {
    key: "risk-management",
    slug: "risk-management",
    arabicTitle: "إدارة المخاطر",
    englishTitle: "Risk Management",
    shortDescription: {
      ar: "رؤية مؤسسية لمخاطر القضايا والاعتمادات، مؤشرات الاختناق، والتنبيهات القانونية.",
      en: "Enterprise visibility into case risk, approval bottlenecks, and legal governance alerts.",
    },
    executiveDescription: {
      ar: "لوحة مخاطر مؤسسية تربط التعرضات، التصعيد، الامتثال، وسجل الأدلة القانونية.",
      en: "Enterprise risk cockpit linking exposure, escalation, compliance posture, and defensible evidence.",
    },
    status: "live",
    href: "/modules/risk-management",
    allowedRoles: [...LEGAL_GOVERNANCE_ROLES, "auditor"],
  },
  {
    key: "approvals",
    slug: "approvals",
    arabicTitle: "الاعتمادات",
    englishTitle: "Approvals",
    shortDescription: {
      ar: "مركز الاعتمادات المؤسسي للاعتماد المتسلسل، المتوازي، التفويض، والتصعيد.",
      en: "Enterprise approvals center for sequential, parallel, delegated, and escalated decisions.",
    },
    executiveDescription: {
      ar: "محرك اعتماد مؤسسي ينسق سلاسل الموافقة، SLA، والحوكمة متعددة الأدوار.",
      en: "Enterprise approval engine coordinating routing, SLA monitoring, and multi-role governance.",
    },
    status: "live",
    href: "/modules/approvals",
    allowedRoles: [
      "tenant_owner",
      "tenant_admin",
      "legal_admin",
      "medical_director",
      "finance_officer",
      "quality",
      "compliance",
      "risk_manager",
      "read_only_auditor",
      "external_reviewer",
    ],
  },
];

export function isModuleKey(value: string): value is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(value);
}

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
  const matchedModule = MODULE_DEFINITIONS.find((moduleDefinition) =>
    pathname === moduleDefinition.href || pathname.startsWith(`${moduleDefinition.href}/`),
  );

  if (matchedModule) {
    return matchedModule.key;
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
