"use client";

import { useCallback, useEffect, useState } from "react";

type ClinicalContentFlags = {
  enabled: boolean;
  flags: Array<{ key: string; resolvedValue: boolean; envDefault: boolean }>;
  envDefaults: Record<string, boolean>;
  loading: boolean;
  error: string | null;
};

export function useClinicalContentFlags(tenantId: string | null | undefined): ClinicalContentFlags {
  const [state, setState] = useState<ClinicalContentFlags>({
    enabled: false,
    flags: [],
    envDefaults: {},
    loading: true,
    error: null,
  });

  const fetchFlags = useCallback(async () => {
    if (!tenantId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    try {
      const response = await fetch(
        `/api/modules/clinical-content/feature-flag?tenantId=${encodeURIComponent(tenantId)}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to load clinical content flags");
      }

      setState({
        enabled: Boolean(payload.enabled),
        flags: Array.isArray(payload.flags) ? payload.flags : [],
        envDefaults: payload.envDefaults || {},
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load flags",
      }));
    }
  }, [tenantId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return state;
}

export function useFlag(
  flags: ClinicalContentFlags["flags"],
  key: string,
  envDefault = false,
): boolean {
  const override = flags.find((f) => f.key === key);
  return override?.resolvedValue ?? envDefault;
}
