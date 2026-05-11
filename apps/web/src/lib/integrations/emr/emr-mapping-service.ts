import type { EmrAdapter, EmrSyncContext, EmrSyncResult } from "@/lib/integrations/emr/emr-adapter";
import { TrakCareAdapter } from "@/lib/integrations/emr/trakcare-adapter";
import { ApiError } from "@/lib/server/http";

function resolveAdapter(key?: string): EmrAdapter {
  const normalized = (key || process.env.EMR_ADAPTER || "trakcare").trim().toLowerCase();

  if (normalized === "trakcare") {
    return new TrakCareAdapter();
  }

  throw new ApiError(400, `Unsupported EMR adapter: ${normalized}`);
}

function createCorrelationId(input: Pick<EmrSyncContext, "tenantId" | "patientId" | "encounterId">): string {
  return `emr-${input.tenantId}-${input.patientId}-${input.encounterId}-${Date.now()}`;
}

export async function syncEncounterFromEmr(args: {
  tenantId: string;
  patientId: string;
  encounterId: string;
  adapterKey?: string;
}): Promise<EmrSyncResult & { adapterKey: string }> {
  const adapter = resolveAdapter(args.adapterKey);

  const context: EmrSyncContext = {
    tenantId: args.tenantId,
    patientId: args.patientId,
    encounterId: args.encounterId,
    correlationId: createCorrelationId(args),
  };

  const result = await adapter.syncEncounterContext(context);
  return {
    ...result,
    adapterKey: adapter.adapterKey,
  };
}
