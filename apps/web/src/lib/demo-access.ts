import { ALL_MODULE_KEYS, getAccessibleModules, type ModuleKey } from "@/lib/modules/catalog";

export type DemoAccountProfile = {
  key:
    | "platform-admin"
    | "legal-affairs"
    | "doctor"
    | "nurse"
    | "medical-director"
    | "quality-compliance"
    | "finance-admin";
  label: string;
  labelAr: string;
  email: string;
  role: string;
  tenantCode: string;
  scopeLabel: string;
  scopeLabelAr: string;
  mustChangePassword: boolean;
  expectedModules: readonly ModuleKey[];
};

export const DEMO_ACCOUNT_PROFILES: readonly DemoAccountProfile[] = [
  {
    key: "platform-admin",
    label: "Platform Admin",
    labelAr: "مدير المنصة",
    email: "demo.platform.admin@wathiqcare.local",
    role: "platform_admin",
    tenantCode: "wathiqcare-demo-platform",
    scopeLabel: "Platform-wide access",
    scopeLabelAr: "صلاحية على مستوى المنصة",
    mustChangePassword: false,
    expectedModules: ALL_MODULE_KEYS,
  },
  {
    key: "legal-affairs",
    label: "Legal Affairs User",
    labelAr: "مستخدم الشؤون القانونية",
    email: "demo.legal.affairs@demo-imc.local",
    role: "legal_admin",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped medico-legal access",
    scopeLabelAr: "وصول طبي قانوني ضمن المستأجر",
    mustChangePassword: false,
    expectedModules: ALL_MODULE_KEYS,
  },
  {
    key: "doctor",
    label: "Doctor User",
    labelAr: "مستخدم طبيب",
    email: "demo.doctor@demo-imc.local",
    role: "doctor",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped clinical access",
    scopeLabelAr: "وصول سريري ضمن المستأجر",
    mustChangePassword: false,
    expectedModules: ["informed-consents", "discharge-refusal", "incident-reports"],
  },
  {
    key: "nurse",
    label: "Nurse User",
    labelAr: "مستخدم تمريض",
    email: "demo.nurse@demo-imc.local",
    role: "nursing",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped nursing access",
    scopeLabelAr: "وصول تمريضي ضمن المستأجر",
    mustChangePassword: false,
    expectedModules: ["informed-consents", "discharge-refusal", "incident-reports"],
  },
  {
    key: "medical-director",
    label: "Medical Director User",
    labelAr: "مستخدم المدير الطبي",
    email: "demo.medical.director@demo-imc.local",
    role: "medical_director",
    tenantCode: "demo-imc",
    scopeLabel: "Clinical governance oversight",
    scopeLabelAr: "إشراف الحوكمة السريرية",
    mustChangePassword: false,
    expectedModules: ["informed-consents", "discharge-refusal", "legal-cases", "legal-documents", "incident-reports", "risk-management", "approvals"],
  },
  {
    key: "quality-compliance",
    label: "Quality / Compliance User",
    labelAr: "مستخدم الجودة والامتثال",
    email: "demo.compliance@demo-imc.local",
    role: "compliance",
    tenantCode: "demo-imc",
    scopeLabel: "Audit and governance review",
    scopeLabelAr: "مراجعة التدقيق والحوكمة",
    mustChangePassword: false,
    expectedModules: ALL_MODULE_KEYS,
  },
  {
    key: "finance-admin",
    label: "Finance / Authorized Admin User",
    labelAr: "مستخدم المالية / الإدارة المخولة",
    email: "demo.finance@demo-imc.local",
    role: "finance_officer",
    tenantCode: "demo-imc",
    scopeLabel: "Financial undertaking workflows",
    scopeLabelAr: "مسارات التعهدات المالية",
    mustChangePassword: false,
    expectedModules: ["promissory-notes", "legal-documents", "approvals"],
  },
] as const;

export function getExpectedHiddenModules(profile: DemoAccountProfile): ModuleKey[] {
  const allowed = new Set(profile.expectedModules);
  return [...ALL_MODULE_KEYS].filter(
    (moduleKey) => !allowed.has(moduleKey as ModuleKey),
  ) as ModuleKey[];
}

export function getVisibleModulesForRole(role: string, platformRole: string | null = null): ModuleKey[] {
  return getAccessibleModules({ role, platformRole }).map((moduleItem) => moduleItem.key);
}
