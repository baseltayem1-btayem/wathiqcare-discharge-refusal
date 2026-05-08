import { getAccessibleModules, type ModuleKey } from "@/lib/modules/catalog";

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
    email: "platform.admin@wathiqcare.online",
    role: "platform_admin",
    tenantCode: "wathiqcare-demo-platform",
    scopeLabel: "Platform-wide access",
    scopeLabelAr: "صلاحية على مستوى المنصة",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "legal-affairs",
    label: "Legal Affairs",
    labelAr: "الشؤون القانونية",
    email: "legal.affairs@pilot.imc.wathiqcare.online",
    role: "legal_admin",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped medico-legal access",
    scopeLabelAr: "وصول طبي قانوني ضمن المستأجر",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "doctor",
    label: "Doctor",
    labelAr: "طبيب",
    email: "doctor@pilot.imc.wathiqcare.online",
    role: "doctor",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped clinical access",
    scopeLabelAr: "وصول سريري ضمن المستأجر",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "nurse",
    label: "Nurse",
    labelAr: "ممرض/ممرضة",
    email: "nurse@pilot.imc.wathiqcare.online",
    role: "nursing",
    tenantCode: "demo-imc",
    scopeLabel: "Tenant-scoped nursing access",
    scopeLabelAr: "وصول تمريضي ضمن المستأجر",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "medical-director",
    label: "Medical Director",
    labelAr: "المدير الطبي",
    email: "medical.director@pilot.imc.wathiqcare.online",
    role: "medical_director",
    tenantCode: "demo-imc",
    scopeLabel: "Clinical governance oversight",
    scopeLabelAr: "إشراف الحوكمة السريرية",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "quality-compliance",
    label: "Quality / Compliance",
    labelAr: "الجودة / الامتثال",
    email: "quality.compliance@pilot.imc.wathiqcare.online",
    role: "compliance",
    tenantCode: "demo-imc",
    scopeLabel: "Audit and governance review",
    scopeLabelAr: "مراجعة التدقيق والحوكمة",
    mustChangePassword: true,
    expectedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "finance-admin",
    label: "Finance / Authorized Admin",
    labelAr: "المالية / الإدارة المخولة",
    email: "finance.admin@pilot.imc.wathiqcare.online",
    role: "finance_officer",
    tenantCode: "demo-imc",
    scopeLabel: "Financial undertaking workflows",
    scopeLabelAr: "مسارات التعهدات المالية",
    mustChangePassword: true,
    expectedModules: ["promissory-notes"],
  },
] as const;

export function getExpectedHiddenModules(profile: DemoAccountProfile): ModuleKey[] {
  const allowed = new Set(profile.expectedModules);
  return ["informed-consents", "promissory-notes", "discharge-refusal"].filter(
    (moduleKey) => !allowed.has(moduleKey as ModuleKey),
  ) as ModuleKey[];
}

export function getVisibleModulesForRole(role: string, platformRole: string | null = null): ModuleKey[] {
  return getAccessibleModules({ role, platformRole }).map((moduleItem) => moduleItem.key);
}
