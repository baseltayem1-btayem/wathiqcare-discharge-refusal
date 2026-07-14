import { ApiError } from "@/lib/server/http";
import type { AuthContext } from "@/lib/server/auth";

export type InformedConsentPermission =
  | "template:create"
  | "template:edit"
  | "template:submit_review"
  | "template:approve_legal"
  | "template:approve_medical"
  | "template:approve_compliance"
  | "template:activate"
  | "template:retire"
  | "wording:create"
  | "wording:review"
  | "wording:approve"
  | "consent:create"
  | "consent:review"
  | "consent:approve"
  | "consent:send_signature"
  | "consent:witness_attest"
  | "consent:finalize"
  | "consent:view_evidence"
  | "consent:export"
  | "governance:view"
  | "audit:view";

const BASE_PERMISSIONS: InformedConsentPermission[] = [
  "consent:create",
  "consent:review",
  "consent:send_signature",
  "audit:view",
];

const ROLE_PERMISSIONS: Record<string, InformedConsentPermission[]> = {
  platform_admin: [
    ...BASE_PERMISSIONS,
    "template:create",
    "template:edit",
    "template:submit_review",
    "template:approve_legal",
    "template:approve_medical",
    "template:approve_compliance",
    "template:activate",
    "template:retire",
    "wording:create",
    "wording:review",
    "wording:approve",
    "consent:approve",
    "consent:finalize",
    "consent:view_evidence",
    "consent:export",
    "governance:view",
  ],
  subscriber_admin: [
    ...BASE_PERMISSIONS,
    "template:create",
    "template:edit",
    "template:submit_review",
    "template:activate",
    "template:retire",
    "wording:create",
    "wording:review",
    "consent:approve",
    "consent:finalize",
    "consent:view_evidence",
    "consent:export",
    "governance:view",
  ],
  consent_admin: [
    ...BASE_PERMISSIONS,
    "template:create",
    "template:edit",
    "template:submit_review",
    "template:activate",
    "template:retire",
    "wording:create",
    "wording:review",
    "consent:approve",
    "consent:finalize",
    "consent:view_evidence",
    "consent:export",
    "governance:view",
  ],
  consent_physician: [
    ...BASE_PERMISSIONS,
    "consent:approve",
  ],
  consent_legal_reviewer: [
    "template:approve_legal",
    "wording:review",
    "wording:approve",
    "governance:view",
    "audit:view",
    "consent:view_evidence",
  ],
  consent_medical_reviewer: [
    "template:approve_medical",
    "wording:review",
    "wording:approve",
    "governance:view",
    "audit:view",
    "consent:view_evidence",
  ],
  consent_compliance_reviewer: [
    "template:approve_compliance",
    "wording:review",
    "wording:approve",
    "governance:view",
    "audit:view",
    "consent:view_evidence",
  ],
  consent_viewer: [
    "governance:view",
    "audit:view",
    "consent:view_evidence",
  ],
  consent_nursing_witness: [
    "consent:review",
    "consent:witness_attest",
    "audit:view",
  ],
  consent_patient_experience_witness: [
    "consent:review",
    "consent:witness_attest",
    "audit:view",
  ],
  tenant_admin: [
    ...BASE_PERMISSIONS,
    "template:create",
    "template:edit",
    "template:submit_review",
    "template:activate",
    "template:retire",
    "wording:create",
    "wording:review",
    "consent:approve",
    "consent:finalize",
    "consent:view_evidence",
    "consent:export",
    "governance:view",
  ],
};

// Maps canonical operational roles (as stored in auth.role / DB) to their
// consent-module RBAC equivalents. Operational role names do not match the
// consent-specific keys above, so this bridge is required.
const OPERATIONAL_CONSENT_ROLE_MAP: Record<string, string> = {
  doctor:           "consent_physician",
  nursing:          "consent_physician",
  nurse:            "consent_physician",
  medical_director: "consent_medical_reviewer",
  legal_admin:      "consent_legal_reviewer",
  legal:            "consent_legal_reviewer",
  compliance:       "consent_compliance_reviewer",
  auditor:          "consent_viewer",
  quality:          "consent_viewer",
};

// Additional witness-attestation grants keyed by canonical operational role.
// These are unioned with (never replace) the primary consent role mapping so
// that authorized witness roles receive only the extra witness permission.
const OPERATIONAL_WITNESS_ROLE_MAP: Record<string, string> = {
  nursing:         "consent_nursing_witness",
  nurse:           "consent_nursing_witness",
  patient_affairs: "consent_patient_experience_witness",
};

function normalizeRole(role: string | null | undefined): string {
  return (role || "").trim().toLowerCase();
}

export function listInformedConsentPermissions(auth: AuthContext): Set<InformedConsentPermission> {
  const set = new Set<InformedConsentPermission>();

  const rawRole = normalizeRole(auth.role);
  const resolvedConsentRole = OPERATIONAL_CONSENT_ROLE_MAP[rawRole] ?? rawRole;
  const witnessGrantRole = OPERATIONAL_WITNESS_ROLE_MAP[rawRole];

  const candidates = [
    normalizeRole(auth.platform_role),
    normalizeRole(auth.user_type),
    rawRole,
    resolvedConsentRole,
    ...(witnessGrantRole ? [witnessGrantRole] : []),
  ];

  for (const role of candidates) {
    const perms = ROLE_PERMISSIONS[role] || [];
    for (const permission of perms) {
      set.add(permission);
    }
  }

  // Backward-compatible aliases from older tenant roles.
  if (normalizeRole(auth.role) === "admin" || normalizeRole(auth.role) === "owner") {
    for (const permission of ROLE_PERMISSIONS.tenant_admin) {
      set.add(permission);
    }
  }

  return set;
}

export function hasInformedConsentPermission(
  auth: AuthContext,
  permission: InformedConsentPermission,
): boolean {
  return listInformedConsentPermissions(auth).has(permission);
}

export function requireInformedConsentPermission(
  auth: AuthContext,
  permission: InformedConsentPermission,
): void {
  if (!hasInformedConsentPermission(auth, permission)) {
    throw new ApiError(403, `Missing permission: ${permission}`);
  }
}
