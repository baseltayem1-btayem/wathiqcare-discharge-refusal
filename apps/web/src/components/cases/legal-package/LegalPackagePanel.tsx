"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import LegalPackageReadinessChecklist from "@/components/cases/legal-package/LegalPackageReadinessChecklist";
import LegalPackageActions from "@/components/cases/legal-package/LegalPackageActions";
import LegalPackageDocumentsList from "@/components/cases/legal-package/LegalPackageDocumentsList";
import SignatureStatusCard from "@/components/cases/legal-package/SignatureStatusCard";
import CourtBundleSummary from "@/components/cases/legal-package/CourtBundleSummary";
import SecureSigningStatusBadges from "@/components/signing/SecureSigningStatusBadges";
import type { SecureSigningWorkflow } from "@/lib/server/module-secure-signing-service";

type ValidationItem = {
  key: string;
  label: string;
  passed: boolean;
  reason: string;
};

type PackageResponse = {
  package_status: string;
  package_hash: string | null;
  validation: {
    canGenerate: boolean;
    missing: ValidationItem[];
    checklist: ValidationItem[];
  };
  documents: Array<{
    document_type: string;
    document_version: number;
    document_hash: string;
    file_name: string;
    generated_at: string;
  }>;
  signature_request: {
    signature_status: "PENDING" | "SENT" | "SIGNED" | "FAILED";
    pdffiller_signature_request_id: string | null;
    signer_mobile: string | null;
    sms_sent_at: string | null;
    signed_at: string | null;
    signing_link: string | null;
    external_message: string | null;
  };
  integration_status: {
    pdffiller_configured: boolean;
    taqnyat_configured: boolean;
  } | null;
  signed_document_download_url: string | null;
  court_bundle_download_url: string | null;
};

type Props = {
  caseId: string;
};

export default function LegalPackagePanel({ caseId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PackageResponse | null>(null);
  const [secureSigning, setSecureSigning] = useState<SecureSigningWorkflow | null>(null);

  const load = useCallback(async () => {
    const [response, secureResponse] = await Promise.all([
      fetch(`/api/cases/${caseId}/legal-package`, {
        credentials: "include",
      }),
      fetch(`/api/cases/${caseId}/legal-package/secure-signing`, {
        credentials: "include",
      }).catch(() => null),
    ]);

    if (!response.ok) {
      throw new Error(`Failed to load legal package: ${response.status}`);
    }

    const json = (await response.json()) as PackageResponse;
    setData(json);

    if (secureResponse?.ok) {
      const secureJson = (await secureResponse.json()) as { workflow?: SecureSigningWorkflow | null };
      setSecureSigning(secureJson.workflow || null);
    }
  }, [caseId]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load legal package"));
  }, [load]);

  async function runAction(path: string, method: "GET" | "POST" = "POST") {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(path, {
        method,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  const checklist = data?.validation.checklist ?? [];
  const missing = data?.validation.missing ?? [];
  const canGenerate = Boolean(data?.validation.canGenerate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>الحزمة القانونية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

        <LegalPackageReadinessChecklist
          canGenerate={canGenerate}
          checklist={checklist}
          missing={missing}
        />

        <LegalPackageActions
          busy={busy}
          canGenerate={canGenerate}
          hasSignedDownload={Boolean(data?.signed_document_download_url)}
          hasCourtDownload={Boolean(data?.court_bundle_download_url)}
          onGenerate={() => runAction(`/api/cases/${caseId}/legal-package/generate`, "POST")}
          onSendForSignature={() => runAction(`/api/cases/${caseId}/legal-package/send-signature`, "POST")}
          onRefreshSignature={() => runAction(`/api/cases/${caseId}/legal-package/signature-status`, "GET")}
          onDownloadSigned={() => {
            window.open(`/api/cases/${caseId}/legal-package/download?kind=signed`, "_blank", "noopener,noreferrer");
          }}
          onGenerateCourtBundle={() => runAction(`/api/cases/${caseId}/legal-package/court-bundle`, "POST")}
          onDownloadCourtBundle={() => {
            window.open(`/api/cases/${caseId}/legal-package/court-bundle`, "_blank", "noopener,noreferrer");
          }}
        />

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Secure Signing Workflow</h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void runAction(`/api/cases/${caseId}/legal-package/secure-signing`, "POST");
              }}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              Send Secure Signing Link / إرسال رابط التوقيع الآمن
            </button>
          </div>
          {secureSigning ? (
            <>
              <SecureSigningStatusBadges status={secureSigning.status} />
              <div className="text-xs text-slate-600 break-all">{secureSigning.signingUrl}</div>
            </>
          ) : (
            <div className="text-sm text-slate-600">No secure signing link has been created yet.</div>
          )}
        </section>

        <SignatureStatusCard
          packageStatus={data?.package_status || "DRAFT"}
          signature={data?.signature_request || {
            signature_status: "PENDING",
            pdffiller_signature_request_id: null,
            signer_mobile: null,
            sms_sent_at: null,
            signed_at: null,
            signing_link: null,
            external_message: null,
          }}
          integrationStatus={data?.integration_status ?? undefined}
        />

        <LegalPackageDocumentsList documents={data?.documents || []} />

        <CourtBundleSummary
          packageHash={data?.package_hash || null}
          courtBundleDownloadUrl={data?.court_bundle_download_url || null}
        />
      </CardContent>
    </Card>
  );
}
