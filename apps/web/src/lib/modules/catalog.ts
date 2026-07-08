import { canonicalizeUserRole } from "@/lib/server/roles";
import { INFORMED_CONSENTS_ALLOWED_ROLES } from "@/lib/modules/informed-consents-release";

export type ModuleKey = "informed-consents" | "promissory-notes" | "discharge-refusal" | "wathiqnote";

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
    arabicTitle: "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø§Ù„Ù…Ø³ØªÙ†ÙŠØ±Ø©",
    englishTitle: "Informed Consents",
    shortDescription: {
      ar: "Ø¥Ø¯Ø§Ø±Ø© Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ù…Ø³ØªÙ†ÙŠØ±Ø©ØŒ Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ø¥Ù‚Ø±Ø§Ø±ØŒ Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ØŒ ÙˆØ§Ù„Ø£Ø±Ø´ÙØ© Ø§Ù„Ø·Ø¨ÙŠØ© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©.",
      en: "Manage informed-consent workflows, patient acknowledgment, signature capture, and medico-legal archiving.",
    },
    executiveDescription: {
      ar: "Ù…Ø³Ø§Ø±Ø§Øª Ø±Ù‚Ù…ÙŠØ© Ù…Ù†Ø¸Ù…Ø© Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø§Ù„Ù…Ø³ØªÙ†ÙŠØ±Ø©ØŒ Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±ÙŠØ¶ØŒ ÙˆØ§Ø¹ØªÙ…Ø§Ø¯Ø§Øª Ø§Ù„Ø±Ø¹Ø§ÙŠØ© Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØªØ¨Ø¹ Ù‚Ø§Ù†ÙˆÙ†ÙŠØ§Ù‹.",
      en: "Structured digital workflows for secure informed-consent management, patient acknowledgment, and legally traceable healthcare approvals.",
    },
    status: "live",
    href: "/modules/informed-consents",
    allowedRoles: INFORMED_CONSENTS_ALLOWED_ROLES,
  },
  {
    key: "wathiqnote",
    slug: "wathiqnote",
    arabicTitle: "ÙˆØ«ÙŠÙ‚ Ù†ÙˆØª Ù„Ù„Ù…Ø¤Ø³Ø³Ø§Øª",
    englishTitle: "WathiqNote Enterprise Workspace",
    shortDescription: {
      ar: "Ù…Ø³Ø§Ø­Ø© Ø¹Ù…Ù„ Ù‚Ø§Ù†ÙˆÙ†ÙŠØ© Ù…Ø§Ù„ÙŠØ© Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø³Ù†Ø¯Ø§ØªØŒ Ø§Ù„ÙÙˆØªØ±Ø©ØŒ Ø§Ù„Ù…Ø·Ø§Ù„Ø¨Ø§ØªØŒ ÙˆØ§Ù„Ø£Ø¯Ù„Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ©.",
      en: "Legal-financial workspace for note issuance, billing, claims, and digital evidence.",
    },
    executiveDescription: {
      ar: "Ù…Ù†ØµØ© Ù…ÙˆØ­Ø¯Ø© Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ©ØŒ Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø­Ø§Ù„Ø©ØŒ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†ØŒ ÙˆØ§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ø¶Ù…Ù† Ø¨ÙŠØ¦Ø© Ø§Ù„Ù…Ø¤Ø³Ø³Ø©.",
      en: "Unified platform for electronic note issuance, status tracking, user management, and legal audit within the enterprise.",
    },
    status: "live",
    href: "/modules/wathiqnote",
    allowedRoles: ["tenant_owner", "tenant_admin", "legal_admin", "finance_officer", "compliance"],
  },
  {
    key: "promissory-notes",
    slug: "promissory-notes",
    arabicTitle: "ÙˆØ«ÙŠÙ‚ Ù†ÙˆØª Ù„Ù„Ù…Ø¤Ø³Ø³Ø§Øª â€” Ø§Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ù‚Ø¯ÙŠÙ…",
    englishTitle: "WathiqNote Enterprise Workspace (Legacy)",
    shortDescription: {
      ar: "Ù…Ø³Ø§Ø± ØªÙˆØ§ÙÙ‚ÙŠ Ù‚Ø¯ÙŠÙ… Ù„ÙˆØ«ÙŠÙ‚ Ù†ÙˆØª. ÙŠÙÙØ¶Ù‘Ù„ Ø§Ø³ØªØ®Ø¯Ø§Ù… /modules/wathiqnote.",
      en: "Legacy compatibility path for WathiqNote. Prefer /modules/wathiqnote.",
    },
    executiveDescription: {
      ar: "Ù…Ø³Ø§Ø± ØªÙˆØ§ÙÙ‚ÙŠ ÙŠØ­Ø§ÙØ¸ Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙˆØ§Ø¨Ø· Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© /modules/promissory-notes/enterprise.",
      en: "Compatibility path preserving legacy /modules/promissory-notes/enterprise links.",
    },
    status: "live",
    href: "/modules/wathiqnote",
    allowedRoles: ["tenant_owner", "tenant_admin", "legal_admin", "finance_officer", "compliance"],
  },
  {
    key: "discharge-refusal",
    slug: "discharge-refusal",
    arabicTitle: "Ù…Ù†ØµØ© Ø±ÙØ¶ Ø§Ù„Ø®Ø±ÙˆØ¬",
    englishTitle: "Discharge Refusal Platform",
    shortDescription: {
      ar: "Ø¥Ø¯Ø§Ø±Ø© Ø­Ø§Ù„Ø§Øª Ø±ÙØ¶ Ø§Ù„Ø®Ø±ÙˆØ¬ØŒ Ø¥Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±ÙŠØ¶ØŒ Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ØŒ ÙˆØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø­Ø²Ù… Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©.",
      en: "Manage discharge refusal cases, secure patient acknowledgment, audit trails, and legal package generation.",
    },
    executiveDescription: {
      ar: "Ø¥Ø¯Ø§Ø±Ø© Ø­Ø§Ù„Ø§Øª Ø±ÙØ¶ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø¨Ù…Ø³Ø§Ø±Ø§Øª Ø³Ø±ÙŠØ±ÙŠØ© ÙˆÙ‚Ø§Ù†ÙˆÙ†ÙŠØ© Ù…Ø¤Ù…Ù†Ø© ØªØ´Ù…Ù„ Ø§Ù„Ø¥Ù‚Ø±Ø§Ø±ØŒ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ØŒ ÙˆØ§Ù„Ø£Ø¯Ù„Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ© Ø§Ù„Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¯ÙØ§Ø¹.",
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
      return isRtl ? "ØªØ´ØºÙŠÙ„ÙŠ" : "Operational";
    case "ready":
      return isRtl ? "Ø¬Ø§Ù‡Ø²" : "Ready";
    default:
      return isRtl ? "Ù‡ÙŠÙƒÙ„ Ø¬Ø§Ù‡Ø²" : "Structure Ready";
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
  return MODULE_DEFINITIONS.filter((moduleDefinition) => moduleDefinition.key !== "promissory-notes" && canAccessModule(moduleDefinition.key, access));
}

export function resolveModuleKeyFromPath(pathname: string): ModuleKey | null {
  if (pathname.startsWith("/modules/informed-consents")) {
    return "informed-consents";
  }
  if (pathname.startsWith("/modules/wathiqnote")) {
    return "wathiqnote";
  }
  if (pathname.startsWith("/modules/promissory-notes")) { return "wathiqnote"; }
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

