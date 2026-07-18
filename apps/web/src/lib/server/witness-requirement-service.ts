import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireTenantId } from "@/lib/server/auth";
import { canonicalizeUserRole } from "@/lib/server/roles";
import { writeConsentAuditInTx } from "@/lib/server/consent-audit-service";
import {
  deriveChildIdempotencyKey,
  validateIdempotencyKey,
} from "@/lib/server/idempotency-core";
import { computeDocumentHash } from "@/lib/server/public-signing-decision-service";
import {
  DEFAULT_REQUIRED_WITNESS_ROLES,
  evaluateWitnessPolicy,
  extractStoredPolicyDecision,
  extractWitnessTriggerFacts,
  parseTemplateWitnessPolicy,
  type WitnessPolicyDecision,
  type WitnessRole,
} from "@/lib/server/witness-policy-service";

const prisma = () => getPrisma();

export const WITNESS_ATTESTATION_VERSION = "1.0.0";

export type WitnessRequirementStatus = "PENDING" | "ASSIGNED" | "SIGNED" | "REVOKED";

/**
 * Which canonical operational roles may sign in each witness role.
 * Hospital staff authenticate through their institutional session; no SMS
 * verification is required for staff witnesses.
 */
export const WITNESS_ROLE_AUTHORIZATION: Record<WitnessRole, readonly string[]> = {
  NURSING_REPRESENTATIVE: ["nursing", "nurse"],
  PATIENT_EXPERIENCE_REPRESENTATIVE: ["patient_affairs", "patient_experience"],
};

export function resolveAuthorizedWitnessRoles(
  canonicalRole: string | null | undefined,
): WitnessRole[] {
  const normalized = (canonicalRole ?? "").trim().toLowerCase();
  return (Object.keys(WITNESS_ROLE_AUTHORIZATION) as WitnessRole[]).filter((role) =>
    WITNESS_ROLE_AUTHORIZATION[role].includes(normalized),
  );
}

export function assertWitnessRoleAuthorized(
  canonicalRole: string | null | undefined,
  witnessRole: WitnessRole,
): void {
  if (!resolveAuthorizedWitnessRoles(canonicalRole).includes(witnessRole)) {
    throw new ApiError(
      403,
      `Role ${canonicalRole ?? "unknown"} is not authorized to sign as witness role ${witnessRole}`,
      { code: "WITNESS_ROLE_UNAUTHORIZED" },
    );
  }
}

/** SHA-256 fingerprint for IP / user-agent evidence. Never logs raw values. */
export function hashRequestFingerprint(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/** Saudi Arabia is fixed UTC+03:00 (no DST), so conversion is deterministic. */
export function formatSaudiArabiaTimestamp(date: Date): string {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return shifted.toISOString().replace("Z", "+03:00");
}

export type WitnessEligibilityInput = {
  candidateUserId: string;
  candidateRole: WitnessRole;
  requiredRole: WitnessRole;
  clinicianUserId?: string | null;
  patientUserId?: string | null;
  existingWitnesses: { userId: string; role: WitnessRole }[];
  allowSamePersonMultipleRoles: boolean;
};

/**
 * Fail-closed eligibility guard for a human witness:
 * - no self-witnessing by the patient or the responsible clinician;
 * - the same person may not fill two required witness roles unless the
 *   evaluated policy explicitly allows it;
 * - the witness must sign in the exact role the requirement demands;
 * - duplicate witness signatures are rejected.
 */
export function assertWitnessEligibility(input: WitnessEligibilityInput): void {
  if (input.clinicianUserId && input.candidateUserId === input.clinicianUserId) {
    throw new ApiError(409, "The responsible clinician cannot act as a witness", {
      code: "WITNESS_SELF_WITNESSING",
    });
  }
  if (input.patientUserId && input.candidateUserId === input.patientUserId) {
    throw new ApiError(409, "The patient cannot act as their own witness", {
      code: "WITNESS_SELF_WITNESSING",
    });
  }
  if (input.candidateRole !== input.requiredRole) {
    throw new ApiError(
      409,
      `Witness must sign in role ${input.requiredRole}, not ${input.candidateRole}`,
      { code: "WITNESS_ROLE_MISMATCH" },
    );
  }
  for (const existing of input.existingWitnesses) {
    if (existing.userId !== input.candidateUserId) {
      continue;
    }
    if (existing.role === input.candidateRole) {
      throw new ApiError(409, "Duplicate witness signature for this role", {
        code: "WITNESS_DUPLICATE_SIGNATURE",
      });
    }
    if (!input.allowSamePersonMultipleRoles) {
      throw new ApiError(
        409,
        "The same person cannot fill two required witness roles",
        { code: "WITNESS_DUPLICATE_ROLE_SAME_PERSON" },
      );
    }
  }
}

export type WitnessAttestationInput = {
  identityChecked: boolean;
  signatureInPresence: boolean;
  noObjectionOrCoercion: boolean;
  attestationVersion?: string;
};

export function assertWitnessAttestation(attestation: WitnessAttestationInput): void {
  if (
    attestation.identityChecked !== true ||
    attestation.signatureInPresence !== true ||
    attestation.noObjectionOrCoercion !== true
  ) {
    throw new ApiError(
      400,
      "Witness attestation must confirm identity check, signature in presence, and absence of objection or coercion",
      { code: "WITNESS_ATTESTATION_INCOMPLETE" },
    );
  }
}

function resolveDocumentHash(document: {
  id: string;
  consentReference: string;
  status: string;
  diagnosis?: string | null;
  plannedProcedure?: string | null;
  templateVersionId: string;
  updatedAt: Date;
  auditChecksum?: string | null;
  immutablePdfHash?: string | null;
}): string {
  // Prefer finalized hashes when present; otherwise bind to the exact
  // current document content hash — stale presentations are rejected.
  return (
    document.auditChecksum ||
    document.immutablePdfHash ||
    computeDocumentHash({
      documentId: document.id,
      consentReference: document.consentReference,
      status: document.status,
      diagnosis: document.diagnosis ?? null,
      plannedProcedure: document.plannedProcedure ?? null,
      templateVersionId: document.templateVersionId,
      updatedAt: document.updatedAt.toISOString(),
    })
  );
}

/**
 * Create the independent witness requirement records for a document whose
 * evaluated policy requires human witnesses. Idempotent per (document, index).
 */
export async function ensureWitnessRequirementsForDocument(
  db: Prisma.TransactionClient,
  params: {
    tenantId: string;
    documentId: string;
    decision: WitnessPolicyDecision;
    rootIdempotencyKey: string;
  },
): Promise<void> {
  const { tenantId, documentId, decision } = params;
  if (decision.requiredWitnessCount <= 0) {
    return;
  }
  for (let index = 0; index < decision.requiredWitnessCount; index += 1) {
    const role =
      decision.requiredWitnessRoles[index] ??
      DEFAULT_REQUIRED_WITNESS_ROLES[index % DEFAULT_REQUIRED_WITNESS_ROLES.length];
    const idempotencyKey = deriveChildIdempotencyKey(
      `${params.rootIdempotencyKey}:${documentId}`,
      `WITNESS_REQUIREMENT_CREATE:${index + 1}`,
    );
    const existing = await db.consentWitnessRequirement.findFirst({
      where: { tenantId, consentDocumentId: documentId, witnessIndex: index + 1 },
    });
    if (existing) {
      continue;
    }
    await db.consentWitnessRequirement.create({
      data: {
        tenantId,
        consentDocumentId: documentId,
        witnessIndex: index + 1,
        requiredRole: role,
        status: "PENDING",
        policyVersion: decision.policyVersion,
        idempotencyKey,
      },
    });
  }
}

export type RecordWitnessSignatureParams = {
  auth: AuthContext;
  documentId: string;
  request?: NextRequest;
  payload: {
    witnessRequirementId?: string;
    witnessRole: WitnessRole;
    employeeId?: string;
    department?: string;
    attestation: WitnessAttestationInput;
    /** SHA-256 of the exact document version presented to the witness. */
    documentHash: string;
    signatureImageDataUrl?: string;
    idempotencyKey: string;
  };
};

export type RecordWitnessSignatureResult = {
  witnessSignatureId: string;
  signatureId: string;
  witnessRequirementId: string;
  idempotentReplay: boolean;
};

/**
 * Complete human-witness signature capture. Enforces RBAC, self-witnessing
 * and duplicate protections, document-hash binding and idempotency, and
 * records independent witness evidence plus a backward-compatible
 * ConsentDocumentSignature (role WITNESS) row.
 */
export async function recordWitnessSignature(
  params: RecordWitnessSignatureParams,
): Promise<RecordWitnessSignatureResult> {
  const { auth, documentId, payload, request } = params;
  const tenantId = requireTenantId(auth);
  validateIdempotencyKey(payload.idempotencyKey);
  assertWitnessAttestation(payload.attestation);

  if (!payload.documentHash || typeof payload.documentHash !== "string") {
    throw new ApiError(400, "documentHash of the presented document version is required", {
      code: "WITNESS_DOCUMENT_HASH_REQUIRED",
    });
  }

  // Idempotent replay: same idempotency key returns the original record.
  const replay = await prisma().consentWitnessSignature.findFirst({
    where: { tenantId, idempotencyKey: payload.idempotencyKey },
  });
  if (replay) {
    return {
      witnessSignatureId: replay.id,
      signatureId: replay.signatureId,
      witnessRequirementId: replay.witnessRequirementId,
      idempotentReplay: true,
    };
  }

  const canonicalRole = canonicalizeUserRole(auth.role);
  assertWitnessRoleAuthorized(canonicalRole, payload.witnessRole);

  const document = await prisma().consentDocument.findFirst({
    where: { tenantId, id: documentId },
    include: { template: true, signatures: true },
  });
  if (!document) {
    throw new ApiError(404, "Consent document not found");
  }
  if (document.status === "FINALIZED" || document.status === "VOID") {
    throw new ApiError(409, "Document can no longer accept witness signatures", {
      code: "WITNESS_DOCUMENT_NOT_SIGNABLE",
    });
  }

  const signatorySignature = document.signatures.find(
    (item) => item.role === "PATIENT" || item.role === "GUARDIAN",
  );
  if (!signatorySignature) {
    throw new ApiError(
      409,
      "The signatory event being witnessed must exist before a witness can sign",
      { code: "WITNESS_SIGNATORY_EVENT_MISSING" },
    );
  }

  const decision =
    extractStoredPolicyDecision(document.metadata) ??
    evaluateWitnessPolicy({
      templateRequiresWitness: document.template.requiresWitness,
      templateRiskLevel: document.template.riskLevel,
      templatePolicy: parseTemplateWitnessPolicy(document.template.metadata),
      triggers: extractWitnessTriggerFacts({
        metadata: document.metadata,
        hasGuardianSignature: document.signatures.some((item) => item.role === "GUARDIAN"),
      }),
    });
  const reevaluated = evaluateWitnessPolicy({
    templateRequiresWitness: document.template.requiresWitness,
    templateRiskLevel: document.template.riskLevel,
    templatePolicy: parseTemplateWitnessPolicy(document.template.metadata),
    triggers: extractWitnessTriggerFacts({
      metadata: document.metadata,
      hasGuardianSignature: document.signatures.some((item) => item.role === "GUARDIAN"),
    }),
  });
  const effectiveDecision =
    reevaluated.requiredWitnessCount > decision.requiredWitnessCount ? reevaluated : decision;
  if (effectiveDecision.requiredWitnessCount <= 0) {
    throw new ApiError(409, "The evaluated policy does not require a human witness", {
      code: "WITNESS_NOT_REQUIRED",
    });
  }

  const requirement = payload.witnessRequirementId
    ? await prisma().consentWitnessRequirement.findFirst({
        where: { tenantId, id: payload.witnessRequirementId, consentDocumentId: documentId },
      })
    : await prisma().consentWitnessRequirement.findFirst({
        where: {
          tenantId,
          consentDocumentId: documentId,
          requiredRole: payload.witnessRole,
          status: { in: ["PENDING", "ASSIGNED"] },
          OR: [{ assignedUserId: null }, { assignedUserId: auth.sub }],
        },
        orderBy: { witnessIndex: "asc" },
      });
  if (!requirement) {
    throw new ApiError(404, "No open witness requirement matches this witness role", {
      code: "WITNESS_REQUIREMENT_NOT_FOUND",
    });
  }
  if (requirement.status === "SIGNED") {
    throw new ApiError(409, "This witness requirement is already signed", {
      code: "WITNESS_DUPLICATE_SIGNATURE",
    });
  }
  if (requirement.assignedUserId && requirement.assignedUserId !== auth.sub) {
    throw new ApiError(409, "This witness task is assigned to another staff member", {
      code: "WITNESS_TASK_ASSIGNED_TO_OTHER",
    });
  }

  const clinicianSignature = document.signatures.find((item) => item.role === "PHYSICIAN");
  const clinicianUserId =
    (clinicianSignature?.metadata as Record<string, unknown> | null)?.authenticatedUserId?.toString() ??
    (clinicianSignature?.metadata as Record<string, unknown> | null)?.capturedBy?.toString() ??
    document.approvedByUserId ??
    null;
  const patientUserId =
    (signatorySignature.metadata as Record<string, unknown> | null)?.authenticatedUserId?.toString() ??
    null;

  const existingWitnessSignatures = await prisma().consentWitnessSignature.findMany({
    where: { tenantId, consentDocumentId: documentId },
    select: { witnessUserId: true, witnessRole: true },
  });

  assertWitnessEligibility({
    candidateUserId: auth.sub,
    candidateRole: payload.witnessRole,
    requiredRole: requirement.requiredRole as WitnessRole,
    clinicianUserId,
    patientUserId,
    existingWitnesses: existingWitnessSignatures.map((item) => ({
      userId: item.witnessUserId,
      role: item.witnessRole as WitnessRole,
    })),
    allowSamePersonMultipleRoles: effectiveDecision.allowSamePersonMultipleRoles,
  });

  // Bind the witness signature to the exact document version presented.
  const currentHash = resolveDocumentHash(document);
  if (payload.documentHash !== currentHash) {
    throw new ApiError(
      409,
      "The document version presented to the witness is outdated; the witness must review the current version",
      { code: "WITNESS_STALE_DOCUMENT_HASH" },
    );
  }

  const signedAt = new Date();
  const signedAtKsa = formatSaudiArabiaTimestamp(signedAt);
  const ipHash = hashRequestFingerprint(
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  const userAgentHash = hashRequestFingerprint(request?.headers.get("user-agent") ?? null);
  const signerName =
    (typeof auth.email === "string" && auth.email.trim().length > 0
      ? auth.email.trim()
      : `staff:${auth.sub}`);

  const result = await prisma().$transaction(async (tx) => {
    const signatureHash = crypto
      .createHash("sha256")
      .update(
        [
          "WITNESS",
          signerName,
          auth.sub,
          payload.documentHash,
          signedAt.toISOString(),
          payload.attestation.attestationVersion ?? WITNESS_ATTESTATION_VERSION,
        ].join("|"),
        "utf8",
      )
      .digest("hex");

    const signature = await tx.consentDocumentSignature.create({
      data: {
        tenantId,
        consentDocumentId: documentId,
        role: "WITNESS",
        signerName,
        signerIdNumber: payload.employeeId?.trim() || null,
        signatureMethod: "ELECTRONIC_SIGNATURE",
        signedAt,
        signatureHash,
        metadata: {
          captureSource: "institutional-staff-session",
          identitySource: "authenticated-session",
          authenticatedUserId: auth.sub,
          witnessRole: payload.witnessRole,
          witnessAttestation: {
            version: payload.attestation.attestationVersion ?? WITNESS_ATTESTATION_VERSION,
            identityChecked: true,
            signatureInPresence: true,
            noObjectionOrCoercion: true,
          },
          documentHash: payload.documentHash,
        } as Prisma.InputJsonValue,
      },
    });

    const authenticationReference = crypto
      .createHash("sha256")
      .update([signature.id, payload.documentHash, signatureHash].join("|"), "utf8")
      .digest("hex");

    const witnessSignature = await tx.consentWitnessSignature.create({
      data: {
        tenantId,
        consentDocumentId: documentId,
        witnessRequirementId: requirement.id,
        witnessUserId: auth.sub,
        employeeId: payload.employeeId?.trim() || null,
        witnessRole: payload.witnessRole,
        department: payload.department?.trim() || null,
        attestationVersion: payload.attestation.attestationVersion ?? WITNESS_ATTESTATION_VERSION,
        signatureId: signature.id,
        authenticationReference,
        signedAt,
        signedAtKsa,
        documentHash: payload.documentHash,
        ipHash,
        userAgentHash,
        idempotencyKey: payload.idempotencyKey,
      },
    });

    await tx.consentWitnessRequirement.update({
      where: { id: requirement.id },
      data: {
        status: "SIGNED",
        assignedUserId: auth.sub,
        assignedAt: requirement.assignedAt ?? signedAt,
      },
    });

    await writeConsentAuditInTx(tx, {
      tenantId,
      actorUserId: auth.sub,
      actorRole: canonicalRole,
      action: "WITNESS_SIGNATURE_CAPTURED",
      summary: `Human witness signature captured (${payload.witnessRole}) for consent ${document.consentReference}`,
      source: "signature",
      consentDocumentId: documentId,
      caseId: document.caseId,
      metadata: {
        witnessSignatureId: witnessSignature.id,
        witnessRequirementId: requirement.id,
        witnessRole: payload.witnessRole,
        attestationVersion: witnessSignature.attestationVersion,
        authenticationReference,
        documentHash: payload.documentHash,
        policyVersion: effectiveDecision.policyVersion,
      },
    });

    return {
      witnessSignatureId: witnessSignature.id,
      signatureId: signature.id,
      witnessRequirementId: requirement.id,
      idempotentReplay: false,
    };
  });

  return result;
}

export type WitnessTaskAssignmentParams = {
  auth: AuthContext;
  witnessRequirementId: string;
  /** Assign to another staff member; omit to claim the task. */
  assigneeUserId?: string;
};

/** Assign or claim a witness task. Claiming binds the task to the caller. */
export async function assignWitnessRequirement(
  params: WitnessTaskAssignmentParams,
): Promise<{ witnessRequirementId: string; assignedUserId: string; status: string }> {
  const { auth, witnessRequirementId } = params;
  const tenantId = requireTenantId(auth);
  const requirement = await prisma().consentWitnessRequirement.findFirst({
    where: { tenantId, id: witnessRequirementId },
  });
  if (!requirement) {
    throw new ApiError(404, "Witness requirement not found");
  }
  if (requirement.status === "SIGNED" || requirement.status === "REVOKED") {
    throw new ApiError(409, "Witness requirement is no longer assignable", {
      code: "WITNESS_REQUIREMENT_CLOSED",
    });
  }
  const assigneeUserId = params.assigneeUserId?.trim() || auth.sub;
  const updated = await prisma().consentWitnessRequirement.update({
    where: { id: requirement.id },
    data: {
      status: "ASSIGNED",
      assignedUserId: assigneeUserId,
      assignedAt: new Date(),
    },
  });
  return {
    witnessRequirementId: updated.id,
    assignedUserId: updated.assignedUserId ?? assigneeUserId,
    status: updated.status,
  };
}

export async function listWitnessRequirementsForDocument(
  auth: AuthContext,
  documentId: string,
) {
  const tenantId = requireTenantId(auth);
  return prisma().consentWitnessRequirement.findMany({
    where: { tenantId, consentDocumentId: documentId },
    include: { signatures: true },
    orderBy: { witnessIndex: "asc" },
  });
}

/**
 * Send-for-signature gate: evaluate the witness policy (stored snapshot or
 * deterministic re-evaluation) and issue the independent witness requirement
 * records. Sending is not blocked by an unsatisfied witness — the witness
 * signs after the signatory event — but an invalid policy configuration
 * fails closed. Idempotent per requirement.
 */
export async function enforceWitnessPolicyAtSend(params: {
  auth: AuthContext;
  documentId: string;
  request?: NextRequest;
}): Promise<WitnessPolicyDecision> {
  const tenantId = requireTenantId(params.auth);
  const document = await prisma().consentDocument.findFirst({
    where: { tenantId, id: params.documentId },
    include: { template: true },
  });
  if (!document) {
    throw new ApiError(404, "Consent document not found");
  }
  const decision =
    extractStoredPolicyDecision(document.metadata) ??
    evaluateWitnessPolicy({
      templateRequiresWitness: document.template.requiresWitness,
      templateRiskLevel: document.template.riskLevel,
      templatePolicy: parseTemplateWitnessPolicy(document.template.metadata),
    });
  if (decision.requiredWitnessCount <= 0) {
    return decision;
  }
  await prisma().$transaction(async (tx) => {
    await ensureWitnessRequirementsForDocument(tx, {
      tenantId,
      documentId: document.id,
      decision,
      rootIdempotencyKey: `${tenantId}:witness-requirements`,
    });
    await writeConsentAuditInTx(tx, {
      tenantId,
      actorUserId: params.auth.sub,
      actorRole: params.auth.role ?? null,
      action: "WITNESS_REQUIREMENTS_ISSUED",
      summary: `Witness requirements issued for consent ${document.consentReference}: ${decision.requiredWitnessCount} witness(es) required`,
      source: "policy",
      consentDocumentId: document.id,
      caseId: document.caseId,
      metadata: {
        requiredWitnessCount: decision.requiredWitnessCount,
        requiredWitnessRoles: decision.requiredWitnessRoles,
        policyVersion: decision.policyVersion,
        policySource: decision.policySource,
        triggerCodes: decision.triggerCodes,
      },
    });
  });
  return decision;
}
