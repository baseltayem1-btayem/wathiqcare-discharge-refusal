import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";

const prisma = () => getPrisma();

export type SmsAuditArgs = {
  tenantId: string;
  recipient: string;
  caseId?: string | null;
  status: "sent" | "failed" | "pending";
  statusCode?: number | null;
  failureReason?: string | null;
  notificationType: string;
  metadata?: Record<string, unknown>;
};

export async function recordSmsAuditAttempt(
  args: SmsAuditArgs,
  tx?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma();
  await client.notificationDeliveryAttempt.create({
    data: {
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      channel: "sms",
      provider: "taqnyat",
      recipient: args.recipient,
      notificationType: args.notificationType,
      status: args.status,
      statusCode: args.statusCode ?? null,
      failureReason: args.failureReason ?? null,
      metadataJson: (args.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
