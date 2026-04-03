import { InvoiceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

function parseInvoiceStatus(value: string | null): InvoiceStatus | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(InvoiceStatus).includes(normalized as InvoiceStatus)
    ? (normalized as InvoiceStatus)
    : null;
}

export async function GET(request: NextRequest) {
try {
  const prisma = getPrisma();
  const auth = await requireAuth(request);
  const platformAccess = hasPlatformAccess(auth);
  const url = new URL(request.url);
  const status = parseInvoiceStatus(url.searchParams.get("status"));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 200);

  if (!platformAccess && !auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required for invoice access");
  }

  const invoices = await getPrisma().invoice.findMany({
    where: {
      ...(platformAccess ? {} : { tenantId: auth.tenant_id }),
      ...(status ? { status } : {}),
    },
    include: {
      tenant: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      subscription: {
        include: {
          plan: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(toJsonSafe(invoices));
} catch (error) {
  return handleApiError(error);
}
}
