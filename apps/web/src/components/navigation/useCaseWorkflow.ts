"use client";

import { useEffect, useMemo, useState } from "react";
import type { SmartBackendWorkflowPayload } from "@/components/navigation/smartNavigation";

type UseCaseWorkflowResult = {
  workflow: SmartBackendWorkflowPayload | null;
  loading: boolean;
  error: string | null;
  source: "backend-driven" | "frontend-fallback";
  caseId: string | null;
};

function resolveCaseId(pathname: string): string | null {
  const match = pathname.match(/^\/cases\/([^/?#]+)/);
  if (!match || !match[1] || match[1] === "new") {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function useCaseWorkflow(pathname: string): UseCaseWorkflowResult {
  const caseId = useMemo(() => resolveCaseId(pathname), [pathname]);
  const [workflow, setWorkflow] = useState<SmartBackendWorkflowPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"backend-driven" | "frontend-fallback">("frontend-fallback");

  useEffect(() => {
    if (!caseId) {
      return;
    }

    const controller = new AbortController();
    Promise.resolve()
      .then(async () => {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/workflow`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`workflow_fetch_failed_${response.status}`);
        }

        const payload = (await response.json().catch(() => null)) as {
          workflow?: SmartBackendWorkflowPayload;
        } | null;

        if (!payload?.workflow) {
          throw new Error("workflow_payload_missing");
        }

        setWorkflow(payload.workflow);
        setSource("backend-driven");
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.warn("[workflow] backend workflow unavailable; using frontend fallback");
          void fetchError;
        }

        setWorkflow(null);
        setSource("frontend-fallback");
        setError("workflow_unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [caseId]);

  return {
    workflow: caseId ? workflow : null,
    loading: caseId ? loading : false,
    error: caseId ? error : null,
    source: caseId ? source : "frontend-fallback",
    caseId,
  };
}
