"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import CaseExecutionWorkspaceLayout from "@/components/cases/CaseExecutionWorkspaceLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/card";
import { Button } from "@/components/design-system/button";
import { SkeletonCard, SkeletonHeader } from "@/components/ui/SkeletonLoading";
import { useUiPermissions } from "@/hooks/useUiPermissions";
import { useI18n } from "@/i18n/I18nProvider";
import type { UiCaseAccessContext } from "@/lib/permissions/ui-rbac";
import {
  trackApiError,
  trackCaseOpened,
  trackLegalPackageGenerated,
  trackPdfGenerated,
} from "@/lib/tracking";

type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

type CaseData = {
  id: string;
  mrn: string;
  patient: string;
  physician: string;
  diagnosis: string;
  status: string;
};

type PresentationPayload = {
  language: string;
  interpreter_used: boolean;
  presented_to: string;
  presented_by: string;
};

type SignatureOutcome = "signed" | "refused_to_sign" | "unable_to_sign";
type PatientDecision = "accepted" | "refused";

type SignaturePayload = {
  patient_decision: PatientDecision | "";
  outcome: SignatureOutcome;
  signer_name: string;
  reason: string;
};

type LayoutWitnessPayload = {
  witness_id?: string;
  full_name: string;
  role: string;
  role_category: "clinical" | "non_clinical";
  id_type: string;
  id_number: string;
  mobile_number: string;
  attestation_confirmed: boolean;
  attestation_language: "en" | "ar";
  attestation_version: string;
  signature_type: "DIGITAL_SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
  signature_hash: string;
  otp_reference: string;
  verification_status: "VERIFIED" | "PENDING" | "FAILED";
  manual_fallback_used: boolean;
};

type WitnessPayload = LayoutWitnessPayload;

type WitnessRecord = WitnessPayload & {
  witness_id: string;
};

type ConsentFormPayload = {
  processingPurpose: string;
  lawfulBasis: string;
  consentType: string;
  consentMethod: string;
  documentVersion: string;
  witnessName: string;
  otpReference: string;
};

type ReadinessState = {
  ready_for_legal: boolean;
  reason?: string;
};

type LegalPackageMeta = {
  version: number;
  download_url: string;
};

type CaseApiRecord = {
  id: string;
  medicalRecordNo?: string | null;
  patientName?: string | null;
  status?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WorkflowApiRecord = {
  attending_physician?: string | null;
  discussion_summary?: string | null;
  refusal_reason?: string | null;
  escalation_required?: boolean;
  refusal_form_generated_at?: string | null;
  financial_notice_generated_at?: string | null;
  documents?: Array<{ templateKey?: string; template_key?: string }>;
};

type ConsentRecordSummary = {
  id: string;
  processingPurpose?: string;
  lawfulBasis?: string;
  consentMethod?: string;
  documentHash?: string | null;
  consentedAt?: string;
};

type LegalReadinessReport = {
  status: string;
  readyForLegal: boolean;
  blockers: string[];
  checklist: Array<{
    key: string;
    label: string;
    required: boolean;
    satisfied: boolean;
    reason: string;
  }>;
  evidence?: {
    consentCount?: number;
    documentCount?: number;
    auditChainVerified?: boolean;
  };
};

type AuditChainResponse = {
  events: Array<{
    id: string;
    eventType: string;
    actorRole?: string | null;
    payloadSummary: string;
    currentHash: string;
    previousHash?: string | null;
    createdAt: string;
  }>;
  verification?: {
    verified: boolean;
    totalEvents: number;
  };
};

type DocumentSummary = {
  id: string;
  template_key?: string;
  title?: string;
  generationStatus?: string;
  generated_at?: string;
};

type CasePdfValidationResult = {
  canFinalize: boolean;
  missingRequired: string[];
  checklist: Array<{
    key: string;
    label: string;
    required: boolean;
    satisfied: boolean;
    reason: string;
  }>;
};

type CasePdfVersionSummary = {
  id: string;
  version: number;
  fileName: string;
  generatedAt: string;
  status: "draft" | "final" | "failed";
  isFinal: boolean;
  templateVersion: string;
  language: string;
  fileSize: number;
  sha256Hash: string | null;
};

type CasePdfLatestResponse = {
  latest: CasePdfVersionSummary | null;
  validation: CasePdfValidationResult;
};

type CasePdfVersionsResponse = {
  versions: CasePdfVersionSummary[];
};

type CasePdfGenerateResponse = {
  report: CasePdfVersionSummary;
  validation: CasePdfValidationResult;
  previewUrl: string;
  downloadUrl: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getBoolean(record: Record<string, unknown> | null | undefined, key: string, fallback = false): boolean {
  if (!record) {
    return fallback;
  }

  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function parseWitnesses(metadata: Record<string, unknown> | null | undefined): WitnessRecord[] {
  const witnesses = Array.isArray(metadata?.witnesses) ? metadata.witnesses : [];
  if (witnesses.length > 0) {
    return witnesses
      .map((entry, index) => {
        const witness = asRecord(entry);
        if (!witness) {
          return null;
        }

        return {
          witness_id: getString(witness, "witness_id") || `witness-${index + 1}`,
          full_name: getString(witness, "full_name", "witness_name"),
          role: getString(witness, "role", "witness_role"),
          role_category: getString(witness, "role_category") === "clinical" ? "clinical" : "non_clinical",
          id_type: getString(witness, "id_type") || "NATIONAL_ID",
          id_number: getString(witness, "id_number"),
          mobile_number: getString(witness, "mobile_number"),
          attestation_confirmed: getBoolean(witness, "attestation_confirmed", false),
          attestation_language: getString(witness, "attestation_language") === "ar" ? "ar" : "en",
          attestation_version: getString(witness, "attestation_version") || "1.0",
          signature_type:
            getString(witness, "signature_type") === "OTP"
              ? "OTP"
              : getString(witness, "signature_type") === "MANUAL_CONFIRMATION"
                ? "MANUAL_CONFIRMATION"
                : "DIGITAL_SIGNATURE",
          signature_hash: getString(witness, "signature_hash"),
          otp_reference: getString(witness, "otp_reference"),
          verification_status:
            getString(witness, "verification_status") === "VERIFIED"
              ? "VERIFIED"
              : getString(witness, "verification_status") === "FAILED"
                ? "FAILED"
                : "PENDING",
          manual_fallback_used: getBoolean(witness, "manual_fallback_used", false),
        } satisfies WitnessRecord;
      })
      .filter((entry): entry is WitnessRecord => Boolean(entry));
  }

  const legacyWitness = asRecord(metadata?.witness);
  const legacyName = getString(legacyWitness, "witness_name");
  if (!legacyName) {
    return [];
  }

  return [
    {
      witness_id: "legacy-witness-1",
      full_name: legacyName,
      role: getString(legacyWitness, "witness_role"),
      role_category: "non_clinical",
      id_type: "NATIONAL_ID",
      id_number: getString(legacyWitness, "id_number"),
      mobile_number: getString(legacyWitness, "mobile_number"),
      attestation_confirmed: getBoolean(legacyWitness, "attestation_confirmed", false),
      attestation_language: "en",
      attestation_version: getString(legacyWitness, "attestation_version") || "1.0",
      signature_type: "DIGITAL_SIGNATURE",
      signature_hash: getString(legacyWitness, "signature_hash", "signature"),
      otp_reference: getString(legacyWitness, "otp_reference"),
      verification_status: "PENDING",
      manual_fallback_used: false,
    },
  ];
}

function hasMinimumWitnesses(records: WitnessRecord[]): boolean {
  return records.length >= 2;
}

function mapCaseRecordToCaseData(record: CaseApiRecord, isArabic: boolean): CaseData {
  const metadata = asRecord(record.metadata);
  const workflow = asRecord(metadata?.workflow);

  return {
    id: record.id,
    mrn:
      (typeof record.medicalRecordNo === "string" && record.medicalRecordNo.trim()) ||
      getString(metadata, "mrn", "medical_record_number") ||
      (isArabic ? "غير متوفر" : "N/A"),
    patient:
      (typeof record.patientName === "string" && record.patientName.trim()) ||
      getString(metadata, "patient_name") ||
      (isArabic ? "مريض غير معروف" : "Unknown Patient"),
    physician:
      getString(workflow, "attending_physician") ||
      getString(metadata, "attending_physician") ||
      (isArabic ? "غير محدد" : "Not assigned"),
    diagnosis:
      getString(workflow, "discussion_summary", "refusal_reason") ||
      (typeof record.title === "string" && record.title.trim()) ||
      (isArabic ? "مسار رفض الخروج" : "Discharge refusal workflow"),
    status:
      (typeof record.status === "string" && record.status.trim()) ||
      "OPEN",
  };
}

function toReadinessState(workflow: WorkflowApiRecord | null, isArabic: boolean): ReadinessState {
  if (!workflow) {
    return {
      ready_for_legal: false,
      reason: isArabic ? "أنشئ حزمة الأدلة القانونية لاستكمال الجاهزية." : "Generate the legal evidence bundle to complete readiness.",
    };
  }

  const hasRequiredEvidence = Boolean(
    workflow.refusal_form_generated_at ||
    workflow.financial_notice_generated_at ||
    workflow.documents?.length,
  );

  if (workflow.escalation_required) {
    return {
      ready_for_legal: false,
      reason: isArabic ? "ما يزال التصعيد القانوني مطلوبًا قبل الإغلاق." : "Legal escalation is still required before closure.",
    };
  }

  return {
    ready_for_legal: hasRequiredEvidence,
    reason: hasRequiredEvidence
      ? undefined
      : (isArabic ? "أنشئ نموذج الرفض أو الحزمة القانونية لاستكمال أدلة الحالة." : "Generate the refusal form or legal package to complete the case evidence."),
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorPayload | null = null;

    try {
      errorPayload = (await response.json()) as ApiErrorPayload;
    } catch {
      errorPayload = null;
    }

    throw new Error(
      errorPayload?.detail ||
        errorPayload?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  return error instanceof Error ? error.message : fallback;
}

export default function WorkspaceV2Page() {
  const { isRtl } = useI18n();
  const permissions = useUiPermissions();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = typeof params?.id === "string" ? params.id : "";
  const txt = useCallback((en: string, ar: string) => (isRtl ? ar : en), [isRtl]);

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [presentation, setPresentation] = useState<PresentationPayload>({
    language: "",
    interpreter_used: false,
    presented_to: "",
    presented_by: "",
  });
  const [signature, setSignature] = useState<SignaturePayload>({
    patient_decision: "",
    outcome: "signed",
    signer_name: "",
    reason: "",
  });
  const [witness, setWitness] = useState<WitnessPayload>({
    full_name: "",
    role: "",
    role_category: "non_clinical",
    id_type: "NATIONAL_ID",
    id_number: "",
    mobile_number: "",
    attestation_confirmed: false,
    attestation_language: isRtl ? "ar" : "en",
    attestation_version: "1.0",
    signature_type: "DIGITAL_SIGNATURE",
    signature_hash: "",
    otp_reference: "",
    verification_status: "PENDING",
    manual_fallback_used: false,
  });
  const [witnessRecords, setWitnessRecords] = useState<WitnessRecord[]>([]);
  const [consentForm, setConsentForm] = useState<ConsentFormPayload>({
    processingPurpose: txt("Discharge refusal medico-legal processing", "المعالجة القانونية الطبية لرفض الخروج"),
    lawfulBasis: txt("PDPL healthcare and legal obligation basis", "أساس الالتزام القانوني والرعاية الصحية وفق نظام حماية البيانات الشخصية"),
    consentType: "informed_refusal_consent",
    consentMethod: "ELECTRONIC_SIGNATURE",
    documentVersion: "1.0",
    witnessName: "",
    otpReference: "",
  });
  const [readiness, setReadiness] = useState<ReadinessState | null>(null);
  const [legalReadinessReport, setLegalReadinessReport] = useState<LegalReadinessReport | null>(null);
  const [consentRecords, setConsentRecords] = useState<ConsentRecordSummary[]>([]);
  const [auditChain, setAuditChain] = useState<AuditChainResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [legalPackage, setLegalPackage] = useState<LegalPackageMeta | null>(null);
  const [caseAccessContext, setCaseAccessContext] = useState<UiCaseAccessContext | null>(null);
  const [pdfLatest, setPdfLatest] = useState<CasePdfVersionSummary | null>(null);
  const [pdfValidation, setPdfValidation] = useState<CasePdfValidationResult | null>(null);
  const [pdfVersions, setPdfVersions] = useState<CasePdfVersionSummary[]>([]);
  const [pdfLanguage, setPdfLanguage] = useState<"en" | "ar">("en");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deferredDataLoading, setDeferredDataLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  async function reloadComplianceState(targetCaseId: string) {
    const [readinessReport, consentList, auditInfo, docs, pkg] = await Promise.all([
      apiFetch<LegalReadinessReport>(`/api/discharge/cases/${targetCaseId}/legal-readiness`).catch(() => null),
      apiFetch<ConsentRecordSummary[]>(`/api/discharge/cases/${targetCaseId}/consent`).catch(() => []),
      apiFetch<AuditChainResponse>(`/api/discharge/cases/${targetCaseId}/audit-chain`).catch(() => null),
      apiFetch<DocumentSummary[]>(`/api/discharge/cases/${targetCaseId}/documents`).catch(() => []),
      apiFetch<LegalPackageMeta>(`/api/discharge/cases/${targetCaseId}/legal-package`).catch(() => null),
    ]);

    setLegalReadinessReport(readinessReport);
    setConsentRecords(consentList ?? []);
    setAuditChain(auditInfo);
    setDocuments(docs ?? []);
    setLegalPackage(pkg);

    if (readinessReport) {
      setReadiness({
        ready_for_legal: readinessReport.readyForLegal,
        reason: readinessReport.blockers?.[0],
      });
      return;
    }

    if (docs?.length || pkg) {
      setReadiness({
        ready_for_legal: true,
      });
    }
  }

  async function reloadCasePdfState(targetCaseId: string): Promise<void> {
    const [latestPayload, versionsPayload] = await Promise.all([
      apiFetch<CasePdfLatestResponse>(`/api/cases/${targetCaseId}/pdf`).catch(() => null),
      apiFetch<CasePdfVersionsResponse>(`/api/cases/${targetCaseId}/pdf/versions`).catch(() => ({ versions: [] })),
    ]);

    setPdfLatest(latestPayload?.latest ?? null);
    setPdfValidation(latestPayload?.validation ?? null);
    setPdfVersions(versionsPayload?.versions ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDeferredPanels(targetCaseId: string): Promise<void> {
      setDeferredDataLoading(true);

      try {
        const [existingPackage, consentList, auditInfo, docs, pdfVersionList] = await Promise.all([
          apiFetch<LegalPackageMeta>(`/api/discharge/cases/${targetCaseId}/legal-package`).catch(() => null),
          apiFetch<ConsentRecordSummary[]>(`/api/discharge/cases/${targetCaseId}/consent`).catch(() => []),
          apiFetch<AuditChainResponse>(`/api/discharge/cases/${targetCaseId}/audit-chain`).catch(() => null),
          apiFetch<DocumentSummary[]>(`/api/discharge/cases/${targetCaseId}/documents`).catch(() => []),
          apiFetch<CasePdfVersionsResponse>(`/api/cases/${targetCaseId}/pdf/versions`).catch(() => ({ versions: [] })),
        ]);

        if (cancelled) {
          return;
        }

        setLegalPackage(existingPackage);
        setConsentRecords(consentList ?? []);
        setAuditChain(auditInfo);
        setDocuments(docs ?? []);
        setPdfVersions(pdfVersionList?.versions ?? []);
      } finally {
        if (!cancelled) {
          setDeferredDataLoading(false);
        }
      }
    }

    async function loadPage(): Promise<void> {
      if (!caseId) {
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      setError("");

      try {
        const [
          caseRecord,
          workflow,
          readinessReport,
          readinessResponse,
          latestPdf,
        ] = await Promise.all([
          apiFetch<CaseApiRecord>(`/api/cases/${caseId}`),
          apiFetch<WorkflowApiRecord>(`/api/discharge/cases/${caseId}/workflow`).catch(() => null),
          apiFetch<LegalReadinessReport>(`/api/discharge/cases/${caseId}/legal-readiness`).catch(() => null),
          apiFetch<ReadinessState>(`/api/discharge/cases/${caseId}/readiness`).catch(() => null),
          apiFetch<CasePdfLatestResponse>(`/api/cases/${caseId}/pdf`).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const caseMetadata = asRecord(caseRecord.metadata);
        const presentationMeta = asRecord(caseMetadata?.presentation);
        const signatureMeta = asRecord(caseMetadata?.signature);
        const witnessMeta = asRecord(caseMetadata?.witness);

        setPresentation({
          language: getString(presentationMeta, "language"),
          interpreter_used: getBoolean(presentationMeta, "interpreter_used", false),
          presented_to: getString(presentationMeta, "presented_to"),
          presented_by: getString(presentationMeta, "presented_by"),
        });

        const signatureOutcome = getString(signatureMeta, "outcome") as SignatureOutcome;
        const signatureDecision = getString(signatureMeta, "patient_decision");
        const normalizedDecision: SignaturePayload["patient_decision"] =
          signatureDecision === "accepted" || signatureDecision === "refused"
            ? signatureDecision
            : signatureOutcome === "signed"
              ? "accepted"
              : signatureOutcome === "refused_to_sign" || signatureOutcome === "unable_to_sign"
                ? "refused"
                : "";
        setSignature({
          patient_decision: normalizedDecision,
          outcome:
            signatureOutcome === "refused_to_sign" ||
            signatureOutcome === "unable_to_sign" ||
            signatureOutcome === "signed"
              ? signatureOutcome
              : "signed",
          signer_name: getString(signatureMeta, "signer_name"),
          reason: getString(signatureMeta, "reason"),
        });

        const hydratedWitnessName = getString(witnessMeta, "witness_name");
        const parsedWitnesses = parseWitnesses(caseMetadata);
        setWitnessRecords(parsedWitnesses);
        const primaryWitness = parsedWitnesses[0];
        setWitness({
          witness_id: primaryWitness?.witness_id,
          full_name: primaryWitness?.full_name || hydratedWitnessName,
          role: primaryWitness?.role || getString(witnessMeta, "witness_role"),
          role_category: primaryWitness?.role_category || "non_clinical",
          id_type: primaryWitness?.id_type || "NATIONAL_ID",
          id_number: primaryWitness?.id_number || "",
          mobile_number: primaryWitness?.mobile_number || "",
          attestation_confirmed: primaryWitness?.attestation_confirmed || false,
          attestation_language: primaryWitness?.attestation_language || (isRtl ? "ar" : "en"),
          attestation_version: primaryWitness?.attestation_version || "1.0",
          signature_type: primaryWitness?.signature_type || "DIGITAL_SIGNATURE",
          signature_hash: primaryWitness?.signature_hash || "",
          otp_reference: primaryWitness?.otp_reference || "",
          verification_status: primaryWitness?.verification_status || "PENDING",
          manual_fallback_used: primaryWitness?.manual_fallback_used || false,
        });

        setConsentForm((previous) => ({
          ...previous,
          witnessName: previous.witnessName || hydratedWitnessName,
        }));

        setCaseData(mapCaseRecordToCaseData(caseRecord, isRtl));
        const accessContext: UiCaseAccessContext = {
          metadata: caseMetadata,
          attendingPhysicianUserId: getString(asRecord(caseMetadata?.workflow), "attending_physician_user_id"),
          assignedUserId: getString(asRecord(caseMetadata?.workflow), "assigned_user_id", "assigned_to_user_id"),
          createdByUserId: getString(caseMetadata, "created_by", "created_by_user_id"),
          ownerUserId: getString(caseMetadata, "owner_user_id"),
        };
        setCaseAccessContext(accessContext);
        setReadiness(
          readinessReport
            ? {
                ready_for_legal: readinessReport.readyForLegal,
                reason: readinessReport.blockers?.[0],
              }
            : readinessResponse ?? toReadinessState(workflow, isRtl),
        );
        setLegalReadinessReport(readinessReport);
        setConsentRecords([]);
        setAuditChain(null);
        setDocuments([]);
        setLegalPackage(null);
        setPdfLatest(latestPdf?.latest ?? null);
        setPdfValidation(latestPdf?.validation ?? null);
        setPdfVersions([]);

        void loadDeferredPanels(caseId);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        trackApiError({ operation: "load_workspace_v2", surface: "workspace_v2", role: permissions.auth.role ?? undefined });

        setError(getErrorMessage(err, txt("Failed to load case", "فشل تحميل الحالة")));
        setCaseData(null);
        setReadiness(null);
        setLegalReadinessReport(null);
        setConsentRecords([]);
        setAuditChain(null);
        setDocuments([]);
        setLegalPackage(null);
        setCaseAccessContext(null);
        setPdfLatest(null);
        setPdfValidation(null);
        setPdfVersions([]);
          setDeferredDataLoading(false);
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [caseId, isRtl, permissions.auth.role, txt]);

  useEffect(() => {
    if (!caseId || !caseData) {
      return;
    }

    trackCaseOpened({ workspace: "v2", role: permissions.auth.role ?? undefined });
  }, [caseData, caseId, permissions.auth.role]);

  async function refreshReadinessAndPackage(): Promise<void> {
    if (!caseId) return;

    await Promise.all([
      reloadComplianceState(caseId),
      reloadCasePdfState(caseId),
    ]);
  }

  async function handleGenerateCasePdf(mode: "draft" | "final", regenerate = false): Promise<void> {
    if (!caseId) return;

    setPdfBusy(true);
    setError("");

    try {
      const generated = await apiFetch<CasePdfGenerateResponse>(`/api/cases/${caseId}/generate-pdf`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          regenerate,
          language: pdfLanguage,
        }),
      });

      setPdfLatest(generated.report);
      setPdfValidation(generated.validation);
      await Promise.all([
        reloadCasePdfState(caseId),
        reloadComplianceState(caseId),
      ]);
      trackPdfGenerated({ mode, regenerate, workspace: "v2", role: permissions.auth.role ?? undefined });
    } catch (err: unknown) {
      trackApiError({ operation: "generate_pdf", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to generate legal case PDF", "فشل إنشاء ملف PDF القانوني للحالة")));
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleGenerateLegalPackage(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      const pkg = await apiFetch<LegalPackageMeta>(
        `/api/discharge/cases/${caseId}/legal-package`,
        { method: "POST" },
      );
      setLegalPackage(pkg);
      await reloadComplianceState(caseId);
      trackLegalPackageGenerated({ workspace: "v2", role: permissions.auth.role ?? undefined });
    } catch (err: unknown) {
      trackApiError({ operation: "generate_legal_package", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to generate legal package", "فشل إنشاء الحزمة القانونية")));
    } finally {
      setLoading(false);
    }
  }

  async function handlePresentation(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/presentation`, {
        method: "POST",
        body: JSON.stringify(presentation),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      trackApiError({ operation: "record_presentation", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to record presentation", "فشل تسجيل العرض الطبي")));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignature(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/signature`, {
        method: "POST",
        body: JSON.stringify(signature),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      trackApiError({ operation: "record_signature", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to record signature", "فشل تسجيل التوقيع")));
    } finally {
      setLoading(false);
    }
  }

  async function handleWitness(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      const updatedCase = await apiFetch<CaseApiRecord>(`/api/discharge/cases/${caseId}/witness`, {
        method: "POST",
        body: JSON.stringify({
          ...witness,
          action: witness.witness_id ? "update" : "add",
          witness_id: witness.witness_id,
        }),
      });

      const refreshedWitnesses = parseWitnesses(asRecord(updatedCase.metadata));
      setWitnessRecords(refreshedWitnesses);
      const latestWitness = refreshedWitnesses[0];
      if (latestWitness) {
        setWitness((previous) => ({
          ...previous,
          witness_id: latestWitness.witness_id,
          full_name: latestWitness.full_name,
          role: latestWitness.role,
          role_category: latestWitness.role_category,
        }));
      }

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      trackApiError({ operation: "record_witness", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to record witness", "فشل تسجيل الشاهد")));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordConsent(): Promise<void> {
    if (!caseId) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch(`/api/discharge/cases/${caseId}/consent`, {
        method: "POST",
        body: JSON.stringify({
          ...consentForm,
          witnessName: consentForm.witnessName || witness.full_name || undefined,
          otpReference: consentForm.otpReference || undefined,
          documentSnapshot: {
            presentation,
            signature,
            witness,
            consentForm,
          },
        }),
      });

      await refreshReadinessAndPackage();
    } catch (err: unknown) {
      trackApiError({ operation: "record_consent", surface: "workspace_v2", role: permissions.auth.role ?? undefined });
      setError(getErrorMessage(err, txt("Failed to record consent", "فشل تسجيل الموافقة")));
    } finally {
      setLoading(false);
    }
  }

  const canMedicalActions =
    permissions.canAccessCase(caseAccessContext, "cases.update.medical") ||
    permissions.canAccessCase(caseAccessContext, "cases.record.risk") ||
    permissions.canAccessCase(caseAccessContext, "cases.record.decision");
  const canOperationalActions = permissions.canAccessCase(caseAccessContext, "cases.update.operational");
  const canWitnessAction =
    permissions.canAccessCase(caseAccessContext, "cases.add.witness") || canOperationalActions;
  const canLegalApprove = permissions.canAccessCase(caseAccessContext, "legal.approve.readiness");
  const canGenerateBundle = permissions.canAccessCase(caseAccessContext, "documents.generate_pdf");
  const canGeneratePdf = permissions.canAccessCase(caseAccessContext, "documents.generate_pdf");
  const canDownloadFinalDocs = permissions.canAccessCase(caseAccessContext, "documents.download.final");
  const canReadAudit = permissions.canAccessCase(caseAccessContext, "audit.read");
  const canReadSmsEvidence = permissions.canAccessCase(caseAccessContext, "sms.evidence.read");
  const witnessMinimumMet = hasMinimumWitnesses(witnessRecords);
  const witnessGateMessage = txt(
    "At least two witnesses must be recorded before proceeding.",
    "يجب تسجيل شاهدين على الأقل قبل المتابعة",
  );

  if (!caseId) {
    return (
      <div className="p-8 text-center text-lg text-red-600">
        {txt("Invalid case route.", "مسار الحالة غير صالح.")}
      </div>
    );
  }

  if (pageLoading) {
    return (
      <AuthGuard>
        <AppShell title={txt("Case Execution Workspace V2", "مساحة تنفيذ الحالة")}>
          <div className="space-y-4">
            <SkeletonHeader />
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>{txt("Case Execution Workspace V2", "مساحة تنفيذ الحالة")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 font-medium text-red-600">
              {error || txt("Case could not be loaded.", "تعذر تحميل الحالة.")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Case Execution Workspace V2", "مساحة تنفيذ الحالة")}
        breadcrumbCaseLabel={caseData?.mrn ? `${txt("Case", "الحالة")}: ${caseData.mrn}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/cases")}>
              <ArrowLeft className="h-4 w-4" />
              {txt("Back to Cases", "العودة إلى الحالات")}
            </Button>
          </div>
        }
      >
        <CaseExecutionWorkspaceLayout
          caseId={caseId}
          caseData={caseData}
          error={error}
          loading={loading}
          pdfBusy={pdfBusy}
          role={permissions.auth.role}
          presentation={presentation}
          setPresentation={setPresentation}
          signature={signature}
          setSignature={setSignature}
          witness={witness}
          setWitness={setWitness}
          witnessRecords={witnessRecords}
          witnessMinimumMet={witnessMinimumMet}
          witnessGateMessage={witnessGateMessage}
          consentForm={consentForm}
          setConsentForm={setConsentForm}
          readiness={readiness}
          legalReadinessReport={legalReadinessReport}
          consentRecords={consentRecords}
          auditChain={auditChain}
          documents={documents}
          legalPackage={legalPackage}
          pdfLatest={pdfLatest}
          pdfValidation={pdfValidation}
          pdfVersions={pdfVersions}
          pdfLanguage={pdfLanguage}
          setPdfLanguage={setPdfLanguage}
          canMedicalActions={canMedicalActions}
          canWitnessAction={canWitnessAction}
          canLegalApprove={canLegalApprove}
          canGenerateBundle={canGenerateBundle}
          canGeneratePdf={canGeneratePdf}
          canDownloadFinalDocs={canDownloadFinalDocs}
          canReadAudit={canReadAudit}
          canReadSmsEvidence={canReadSmsEvidence}
          deniedMessage={permissions.deniedMessage}
          onRecordPresentation={handlePresentation}
          onRecordSignature={handleSignature}
          onRecordWitness={handleWitness}
          onRecordConsent={handleRecordConsent}
          onGenerateLegalPackage={handleGenerateLegalPackage}
          onGenerateCasePdf={handleGenerateCasePdf}
        />
        {deferredDataLoading ? (
          <div className="mt-3 text-xs text-slate-500">{txt("Loading secondary workspace panels...", "جار تحميل لوحات مساحة العمل الثانوية...")}</div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
