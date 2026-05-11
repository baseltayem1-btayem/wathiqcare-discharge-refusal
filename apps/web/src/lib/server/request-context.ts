import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { resolveModuleKeyFromPath, type ModuleKey } from "@/lib/modules/catalog";

export type RequestContext = {
  requestId: string;
  correlationId: string;
  tenantId: string | null;
  moduleKey: ModuleKey | null;
  actorId: string | null;
  path: string;
};

function buildId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function readHeader(request: NextRequest, name: string): string | null {
  const value = request.headers.get(name);
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getRequestContext(request: NextRequest, auth?: AuthContext | null, moduleKey?: ModuleKey | null): RequestContext {
  const requestId = readHeader(request, "x-request-id") ?? buildId("req");
  const correlationId = readHeader(request, "x-correlation-id") ?? requestId;
  const path = request.nextUrl.pathname;
  const resolvedModuleKey = moduleKey ?? resolveModuleKeyFromPath(path);

  return {
    requestId,
    correlationId,
    tenantId: auth?.tenant_id ?? null,
    moduleKey: resolvedModuleKey,
    actorId: auth?.sub ?? null,
    path,
  };
}

export function getRequestTraceContext(request: NextRequest, auth?: AuthContext | null, moduleKey?: ModuleKey | null) {
  const ctx = getRequestContext(request, auth, moduleKey);
  return {
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    tenantId: ctx.tenantId,
    moduleKey: ctx.moduleKey,
    actorId: ctx.actorId,
    path: ctx.path,
  };
}

export function buildScopedCacheKey(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join("::");
}

export function buildTenantModuleStoragePrefix(tenantId: string, moduleKey: string, documentId: string): string {
  const safeTenantId = tenantId.trim();
  const safeModuleKey = moduleKey.trim();
  const safeDocumentId = documentId.trim();
  return `${safeTenantId}/${safeModuleKey}/${safeDocumentId}`;
}
