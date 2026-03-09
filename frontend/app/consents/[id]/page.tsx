"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import ArchiveStatusCard from "@/components/governance/ArchiveStatusCard";
import ConsentLifecycleCard from "@/components/governance/ConsentLifecycleCard";
import DocumentActionsCard from "@/components/governance/DocumentActionsCard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import SmsOtpVerificationPanel from "@/components/governance/SmsOtpVerificationPanel";
import TabletSignaturePad from "@/components/governance/TabletSignaturePad";
import TemplatePreviewCard from "@/components/governance/TemplatePreviewCard";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type ConsentResponse = {
  consent: Record<string, unknown>;
  signature: Record<string, unknown> | null;
  archive: Record<string, unknown> | null;
};

export default function ConsentDetailPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ConsentResponse | null>(null);
  const [otpCode, setOtpCode] = useState("");

  async function load() {
    if (!enabled || !params.id) return;
    const row = await apiFetch<ConsentResponse>(`/api/v1/consents/${params.id}`);
    setData(row);
  }

  useEffect(() => {
    void load();
  }, [enabled, params.id]);

  async function runAction(path: string) {
    await apiFetch(path, { method: "POST" });
    await load();
  }

  return (
    <AuthGuard>
      <AppShell title="Consent Detail" subtitle="Template, signature proof, PDF, archive and audit timeline">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled && data ? (
          <div className="space-y-4">
            <TemplatePreviewCard
              templateName={String(data.consent.templateId ?? "Template")}
              templateType={String(data.consent.consentTypeId ?? "-")}
              version={String(data.consent.version ?? "1")}
            />

            <ConsentLifecycleCard
              status={String(data.consent.status ?? "-")}
              signatureStatus={String(data.consent.signatureStatus ?? "-")}
              archiveStatus={String(data.consent.archiveStatus ?? "-")}
            />

            <SmsOtpVerificationPanel
              phone={(data.signature?.phoneMasked as string | null | undefined) ?? null}
              code={otpCode}
              setCode={setOtpCode}
              onSend={() => void runAction(`/api/v1/consents/${params.id}/send-for-signature`)}
              onVerify={() => void runAction(`/api/v1/consents/${params.id}/finalize`)}
            />

            <TabletSignaturePad onAccept={() => void runAction(`/api/v1/consents/${params.id}/finalize`)} />

            <ArchiveStatusCard
              status={String(data.archive?.archiveStatus ?? data.consent.archiveStatus ?? "-")}
              archiveReferenceId={String(data.archive?.archiveReferenceId ?? "-")}
              indexedAt={String(data.archive?.indexedAt ?? "-")}
            />

            <DocumentActionsCard
              onGeneratePdf={() => void runAction(`/api/v1/consents/${params.id}/finalize`)}
              onArchive={() => void runAction(`/api/v1/consents/${params.id}/finalize`)}
              onReindex={() => void runAction(`/api/v1/consents/${params.id}/finalize`)}
            />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/send-for-signature`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Send for Signature</button>
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/finalize`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Verify</button>
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/finalize`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Generate Final PDF</button>
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/finalize`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Archive</button>
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/revoke`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Revoke</button>
              <button type="button" onClick={() => void runAction(`/api/v1/consents/${params.id}/review`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">New Version</button>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
