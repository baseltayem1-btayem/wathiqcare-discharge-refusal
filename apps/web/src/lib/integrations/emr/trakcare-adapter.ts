import type { EmrAdapter, EmrSyncContext, EmrSyncResult } from "@/lib/integrations/emr/emr-adapter";
import { MockEmrAdapter } from "@/lib/integrations/emr/mock-emr-adapter";

// TrakCare adapter shell. Until secure credentials and mappings are configured,
// it delegates to mock data while preserving production adapter boundaries.
export class TrakCareAdapter implements EmrAdapter {
  readonly adapterKey = "trakcare";
  readonly sourceSystem = "InterSystems TrakCare";

  async syncEncounterContext(context: EmrSyncContext): Promise<EmrSyncResult> {
    const endpoint = (process.env.TRAKCARE_BASE_URL || "").trim();

    if (!endpoint) {
      const fallback = await new MockEmrAdapter().syncEncounterContext(context);
      return {
        ...fallback,
        sourceSystem: this.sourceSystem,
        status: "PARTIAL",
        failedFields: ["source_endpoint"],
        error: "TRAKCARE_BASE_URL is not configured; using safe mock fallback",
      };
    }

    // TODO: replace fallback with real TrakCare API call using secure credentials.
    const fallback = await new MockEmrAdapter().syncEncounterContext(context);
    return {
      ...fallback,
      sourceSystem: this.sourceSystem,
      status: "PARTIAL",
      failedFields: ["live_sync_not_implemented"],
      error: "TrakCare live sync adapter handshake pending secure integration",
    };
  }
}
