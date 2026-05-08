import { NextRequest, NextResponse } from "next/server";
import { type AuthContext } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

type ConsentPayload = {
  caseId?: string;
  processingPurpose?: string;
  lawfulBasis?: string;
  consentType?: string;
  consentMethod?: string;
  documentVersion?: string;
  witnessName?: string;
  otpReference?: string;
  documentSnapshot?: Record<string, unknown>;
};

type PromissoryPayload = {
  caseId?: string;
  debtorName?: string;
  debtorIdNumber?: string;
  issuerName?: string;
  amount?: number | string;
  currency?: string;
  dueDate?: string;
  documentVersion?: string;
  metadata?: Record<string, unknown>;
};

type BaseRouteDependencies = {
  requireAuthFn: (request: NextRequest) => Promise<AuthContext>;
  requireTenantOperationalAccessFn: (auth: AuthContext) => void;
};

type InformedConsentsRouteDependencies = BaseRouteDependencies & {
  listTenantConsentRecordsFn: (
    auth: AuthContext,
    query: { caseId?: string; status?: string; limit?: number },
  ) => Promise<unknown>;
  createTenantConsentRecordFn: (
    auth: AuthContext,
    payload: ConsentPayload,
    request: NextRequest,
  ) => Promise<unknown>;
};

type PromissoryRouteDependencies = BaseRouteDependencies & {
  listTenantPromissoryNotesFn: (
    auth: AuthContext,
    query: { caseId?: string; status?: string; limit?: number },
  ) => Promise<unknown>;
  createTenantPromissoryNoteFn: (
    auth: AuthContext,
    payload: PromissoryPayload,
    request: NextRequest,
  ) => Promise<unknown>;
};

export function createInformedConsentsRouteHandlers(
  dependencies: InformedConsentsRouteDependencies,
) {
  async function GET(request: NextRequest) {
    try {
      const auth = await dependencies.requireAuthFn(request);
      dependencies.requireTenantOperationalAccessFn(auth);
      const url = new URL(request.url);

      const records = await dependencies.listTenantConsentRecordsFn(auth, {
        caseId: url.searchParams.get("caseId") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? "50"),
      });

      return NextResponse.json(toJsonSafe(records));
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function POST(request: NextRequest) {
    try {
      const auth = await dependencies.requireAuthFn(request);
      dependencies.requireTenantOperationalAccessFn(auth);
      const payload = (await request.json().catch(() => null)) as ConsentPayload | null;

      const created = await dependencies.createTenantConsentRecordFn(auth, payload ?? {}, request);
      return NextResponse.json(toJsonSafe(created), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  return { GET, POST };
}

export function createPromissoryNotesRouteHandlers(dependencies: PromissoryRouteDependencies) {
  async function GET(request: NextRequest) {
    try {
      const auth = await dependencies.requireAuthFn(request);
      dependencies.requireTenantOperationalAccessFn(auth);
      const url = new URL(request.url);

      const records = await dependencies.listTenantPromissoryNotesFn(auth, {
        caseId: url.searchParams.get("caseId") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? "50"),
      });

      return NextResponse.json(toJsonSafe(records));
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function POST(request: NextRequest) {
    try {
      const auth = await dependencies.requireAuthFn(request);
      dependencies.requireTenantOperationalAccessFn(auth);
      const payload = (await request.json().catch(() => null)) as PromissoryPayload | null;

      const created = await dependencies.createTenantPromissoryNoteFn(auth, payload ?? {}, request);
      return NextResponse.json(toJsonSafe(created), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }

  return { GET, POST };
}
