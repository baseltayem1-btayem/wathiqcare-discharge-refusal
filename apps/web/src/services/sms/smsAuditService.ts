import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";

const prisma = () => getPrisma();

const NOTIFICATION_AUDIT_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
      id VARCHAR PRIMARY KEY,
      tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      case_id VARCHAR,
      alert_id VARCHAR,
      channel VARCHAR NOT NULL,
      provider VARCHAR,
      recipient VARCHAR NOT NULL,
      notification_type VARCHAR NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      status_code INTEGER,
      failure_reason TEXT,
      attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      metadata_json JSONB
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_tenant_channel_status
      ON notification_delivery_attempts(tenant_id, channel, status)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_tenant_case_attempted
      ON notification_delivery_attempts(tenant_id, case_id, attempted_at DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_alert_id
      ON notification_delivery_attempts(alert_id)
  `,
];

let notificationAuditSchemaBootstrapPromise: Promise<void> | null = null;

export async function ensureNotificationDeliveryAttemptSchema(
  client: PrismaClient | Prisma.TransactionClient = prisma(),
): Promise<void> {
  if (!notificationAuditSchemaBootstrapPromise) {
    notificationAuditSchemaBootstrapPromise = (async () => {
      for (const statement of NOTIFICATION_AUDIT_SCHEMA_STATEMENTS) {
        await client.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      notificationAuditSchemaBootstrapPromise = null;
      throw error;
    });
  }

  return notificationAuditSchemaBootstrapPromise;
}

export type SmsProvider = "taqnyat" | "sms_proxy";

export type SmsAuditArgs = {
  tenantId: string;
  recipient: string;
  caseId?: string | null;
  status: "sent" | "failed" | "pending";
  statusCode?: number | null;
  failureReason?: string | null;
  notificationType: string;
  provider?: SmsProvider | null;
  metadata?: Record<string, unknown>;
};

export async function recordSmsAuditAttempt(
  args: SmsAuditArgs,
  tx?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma();
  await ensureNotificationDeliveryAttemptSchema(client);
  await client.notificationDeliveryAttempt.create({
    data: {
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      channel: "sms",
      provider: args.provider ?? "taqnyat",
      recipient: args.recipient,
      notificationType: args.notificationType,
      status: args.status,
      statusCode: args.statusCode ?? null,
      failureReason: args.failureReason ?? null,
      metadataJson: (args.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
