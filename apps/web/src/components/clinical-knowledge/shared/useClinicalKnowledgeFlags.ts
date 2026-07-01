"use client";

import { useCallback, useEffect, useState } from "react";

export type ClinicalKnowledgeFlagState = {
  masterEnabled: boolean;
  procedureCatalogEnabled: boolean;
  packageAssemblyEnabled: boolean;
  decisionRulesEnabled: boolean;
  informedConsentUiEnabled: boolean;
  governanceUiEnabled: boolean;
  loading: boolean;
  error: string | null;
};

export function useClinicalKnowledgeFlags(
  tenantId: string | null | undefined,
): ClinicalKnowledgeFlagState {
  const [state, setState] = useState<ClinicalKnowledgeFlagState>({
    masterEnabled: false,
    procedureCatalogEnabled: false,
    packageAssemblyEnabled: false,
    decisionRulesEnabled: false,
    informedConsentUiEnabled: false,
    governanceUiEnabled: false,
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
        throw new Error(payload?.error || "Failed to load clinical knowledge flags");
      }

      const flags = Array.isArray(payload.flags) ? payload.flags : [];
      const getFlag = (key: string) =>
        flags.find((f: { key: string; resolvedValue: boolean }) => f.key === key)?.resolvedValue ??
        false;

      setState({
        masterEnabled: getFlag("ENABLE_CLINICAL_KNOWLEDGE_ENGINE"),
        procedureCatalogEnabled: getFlag("ENABLE_CKE_PROCEDURE_CATALOG"),
        packageAssemblyEnabled: getFlag("ENABLE_CKE_PACKAGE_ASSEMBLY"),
        decisionRulesEnabled: getFlag("ENABLE_CKE_DECISION_RULES"),
        informedConsentUiEnabled: getFlag("ENABLE_CKE_INFORMED_CONSENT_UI"),
        governanceUiEnabled: getFlag("ENABLE_CKE_GOVERNANCE_UI"),
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
