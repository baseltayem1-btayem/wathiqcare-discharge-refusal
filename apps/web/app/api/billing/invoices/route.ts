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

<<<<<<< HEAD
export async function GET(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
  const invoices = await getPrisma().invoice.findMany({
=======
  const invoices = await prisma.invoice.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
