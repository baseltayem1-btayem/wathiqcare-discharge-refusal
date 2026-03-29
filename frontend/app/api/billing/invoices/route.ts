import { InvoiceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

function parseInvoiceStatus(value: string | null): InvoiceStatus | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(InvoiceStatus).includes(normalized as InvoiceStatus)
    ? (normalized as InvoiceStatus)
    : null;
}

try {
  const prisma = getPrisma();
  const auth = requireAuth(request);
  const url = new URL(request.url);
  const status = parseInvoiceStatus(url.searchParams.get("status"));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 200);

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: auth.tenant_id,
      ...(status ? { status } : {}),
    },
    include: {
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
