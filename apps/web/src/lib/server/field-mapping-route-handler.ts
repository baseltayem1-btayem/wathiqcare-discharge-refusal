/**
 * Testable core for the informed-consents field-mapping API route.
 *
 * The GET handler is intentionally schema-independent for read operations:
 * the governed source-controlled mapping and AcroForm manifest are authoritative,
 * while the optional ConsentForm table is only queried for persisted verification
 * metadata. If the persistence table is unavailable (Prisma P2021 for
 * clinical_consent_forms), the route falls back to the static mapping and
 * reports a safe persistence diagnostic.
 *
 * Write operations (POST verify) remain fail-closed because durable storage is
 * required for those.
 */

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import {
  extractFieldMappingVerification,
  getConsentFieldMappingReadiness,
  persistFieldMappingVerification,
  type PersistedFieldMappingVerification,
} from "@/lib/server/consent-field-mappings";
import { mergeAcroFormReadinessIntoFieldMappingReadiness } from "@/lib/server/acroform/acroform-readiness-adapter";

export type FieldMappingRouteAuth = {
  sub?: string | null;
  tenant_id?: string | null;
};

export type FieldMappingRouteDependencies = {
  requireModuleOperationalAccess: (request: NextRequest, moduleKey: "informed-consents") => Promise<FieldMappingRouteAuth>;
  getPrisma: () => PrismaClient;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isConsentFormTableUnavailableError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021") {
    return false;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return /clinical_consent_forms/i.test(message);
}

export async function loadPersistedVerification(args: {
  formId: string;
  tenantId: string;
  prisma: PrismaClient;
}): Promise<{
  persistedVerification: PersistedFieldMappingVerification | null;
  persistence: { available: boolean; reason?: string };
}> {
  const { formId, tenantId, prisma } = args;

  try {
    const form = await prisma.consentForm.findFirst({
      where: { id: formId, tenantId },
      select: { id: true, metadata: true },
    });

    return {
      persistedVerification: extractFieldMappingVerification(form?.metadata),
      persistence: { available: true },
    };
  } catch (error) {
    if (isConsentFormTableUnavailableError(error)) {
      return {
        persistedVerification: null,
        persistence: { available: false, reason: "CONSENT_FORM_TABLE_UNAVAILABLE" },
      };
    }
    throw error;
  }
}

export function createFieldMappingRouteHandlers(deps: FieldMappingRouteDependencies) {
  async function GET(request: NextRequest, context: { params: Promise<{ formId: string }> }) {
    try {
      const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
      const tenantId = auth.tenant_id || "";
      const { formId } = await context.params;
      const decodedFormId = decodeURIComponent(formId);

      if (!tenantId) {
        return Response.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
      }

      const prisma = deps.getPrisma();
      const { persistedVerification, persistence } = await loadPersistedVerification({
        formId: decodedFormId,
        tenantId,
        prisma,
      });

      const baseReadiness = getConsentFieldMappingReadiness(decodedFormId, persistedVerification);
      const readiness = mergeAcroFormReadinessIntoFieldMappingReadiness(baseReadiness, persistedVerification);

      return Response.json({
        ok: true,
        source: "consent-field-mapping-foundation",
        persistence,
        ...readiness,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load field mapping readiness";
      const status = (error as { status?: number }).status || 500;
      return Response.json({ ok: false, error: message }, { status });
    }
  }

  async function POST(request: NextRequest, context: { params: Promise<{ formId: string }> }) {
    try {
      const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
      const tenantId = auth.tenant_id || "";
      const actorUserId = auth.sub?.trim() || "";
      const { formId } = await context.params;

      if (!tenantId) {
        return Response.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
      }

      if (!actorUserId) {
        return Response.json(
          { ok: false, error: "Authenticated actor identity is unavailable" },
          { status: 401 },
        );
      }

      const body = asRecord(await request.json().catch(() => ({}))) || {};
      const action = String(body.action || "").toLowerCase();

      if (action !== "verify") {
        return Response.json({ ok: false, error: "Unsupported action" }, { status: 422 });
      }

      const prisma = deps.getPrisma();
      const baseReadiness = await persistFieldMappingVerification({
        tenantId,
        formId: decodeURIComponent(formId),
        approvedByUserId: actorUserId,
        prisma,
      });
      const readiness = mergeAcroFormReadinessIntoFieldMappingReadiness(baseReadiness);

      return Response.json({
        ok: true,
        source: "consent-field-mapping-foundation",
        action: "verify",
        ...readiness,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify field mapping";
      const status = (error as { status?: number }).status || 500;
      return Response.json({ ok: false, error: message }, { status });
    }
  }

  return { GET, POST };
}
