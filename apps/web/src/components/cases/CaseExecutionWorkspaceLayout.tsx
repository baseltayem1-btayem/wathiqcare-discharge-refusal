"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Package,
  RefreshCw,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/card";
import { Input, Select } from "@/components/design-system/input";
import { Progress } from "@/components/design-system/progress";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupLabel,
} from "@/components/design-system/radio-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/design-system/tabs";
import {
  buildCaseExecutionWorkspaceFlow,
  type CaseWorkspaceStep,
  type CaseWorkspaceStepKey,
} from "@/components/cases/caseExecutionWorkspaceFlow";
import { getLegalReadinessDecisionIndicator } from "@/components/cases/legalReadinessDecision";

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

type WitnessPayload = {
  witness_name: string;
  witness_role: string;
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

type LayoutProps = {
  caseId: string;
  caseData: CaseData;
  error: string;
  loading: boolean;
  pdfBusy: boolean;
  role: string | null;
  presentation: PresentationPayload;
  setPresentation: React.Dispatch<React.SetStateAction<PresentationPayload>>;
  signature: SignaturePayload;
  setSignature: React.Dispatch<React.SetStateAction<SignaturePayload>>;
  witness: WitnessPayload;
  setWitness: React.Dispatch<React.SetStateAction<WitnessPayload>>;
  consentForm: ConsentFormPayload;
  setConsentForm: React.Dispatch<React.SetStateAction<ConsentFormPayload>>;
  readiness: ReadinessState | null;
  legalReadinessReport: LegalReadinessReport | null;
  consentRecords: ConsentRecordSummary[];
  auditChain: AuditChainResponse | null;
  documents: DocumentSummary[];
  legalPackage: LegalPackageMeta | null;
  pdfLatest: CasePdfVersionSummary | null;
  pdfValidation: CasePdfValidationResult | null;
  pdfVersions: CasePdfVersionSummary[];
  pdfLanguage: "en" | "ar";
  setPdfLanguage: React.Dispatch<React.SetStateAction<"en" | "ar">>;
  canMedicalActions: boolean;
  canWitnessAction: boolean;
  canLegalApprove: boolean;
  canGenerateBundle: boolean;
  canGeneratePdf: boolean;
  canDownloadFinalDocs: boolean;
  canReadAudit: boolean;
  canReadSmsEvidence: boolean;
  deniedMessage: string;
  onRecordPresentation: () => Promise<void>;
  onRecordSignature: () => Promise<void>;
  onRecordWitness: () => Promise<void>;
  onRecordConsent: () => Promise<void>;
  onGenerateLegalPackage: () => Promise<void>;
  onGenerateCasePdf: (mode: "draft" | "final", regenerate?: boolean) => Promise<void>;
};

type DetailTab = "supporting" | "documents" | "audit";

function stepBadgeVariant(step: CaseWorkspaceStep): "success" | "warning" | "outline" {
  if (step.status === "completed") {
    return "success";
  }
  return step.missingItems.length > 0 ? "warning" : "outline";
}

function stepStatusLabel(step: CaseWorkspaceStep): string {
  if (step.status === "completed") {
    return "Completed";
  }
  if (step.status === "current") {
    return "Current";
  }
  return "Upcoming";
}

function stepIcon(key: CaseWorkspaceStepKey) {
  switch (key) {
    case "case_creation":
      return ClipboardList;
    case "medical_decision":
      return Stethoscope;
    case "patient_decision":
      return UserCheck;
    case "legal_readiness":
      return Scale;
    case "legal_documents_bundle":
      return Package;
    case "closure":
      return ShieldCheck;
  }
}

function renderMissingState(message: string) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {message}
    </div>
  );
}

export default function CaseExecutionWorkspaceLayout({
  caseId,
  caseData,
  error,
  loading,
  pdfBusy,
  role,
  presentation,
  setPresentation,
  signature,
  setSignature,
  witness,
  setWitness,
  consentForm,
  setConsentForm,
  readiness,
  legalReadinessReport,
  consentRecords,
  auditChain,
  documents,
  legalPackage,
  pdfLatest,
  pdfValidation,
  pdfVersions,
  pdfLanguage,
  setPdfLanguage,
  canMedicalActions,
  canWitnessAction,
  canLegalApprove,
  canGenerateBundle,
  canGeneratePdf,
  canDownloadFinalDocs,
  canReadAudit,
  canReadSmsEvidence,
  deniedMessage,
  onRecordPresentation,
  onRecordSignature,
  onRecordWitness,
  onRecordConsent,
  onGenerateLegalPackage,
  onGenerateCasePdf,
}: LayoutProps) {
  const [manualStepKey, setSelectedStepKey] = useState<CaseWorkspaceStepKey | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("supporting");

  const refusalScenario =
    signature.patient_decision === "refused" ||
    (!signature.patient_decision && signature.outcome !== "signed");
  const financialNoticeAvailable = documents.some(
    (document) => document.template_key === "financial_responsibility_notice",
  );
  const legalDecisionIndicator = getLegalReadinessDecisionIndicator(
    signature.patient_decision || null,
  );

  const workflowFlow = useMemo(
    () =>
      buildCaseExecutionWorkspaceFlow({
        role,
        mrn: caseData.mrn,
        patientName: caseData.patient,
        physician: caseData.physician,
        diagnosis: caseData.diagnosis,
        caseStatus: caseData.status,
        presentationRecorded: Boolean(presentation.language),
        patientDecision: signature.patient_decision || null,
        patientAcknowledged: Boolean(signature.signer_name),
        witnessRecorded: Boolean(witness.witness_name),
        consentRecorded: consentRecords.length > 0,
        readinessReadyForLegal: Boolean(readiness?.ready_for_legal),
        readinessReason: readiness?.reason,
        readinessBlockers: legalReadinessReport?.blockers ?? [],
        refusalScenario,
        financialNoticeAvailable,
        pdfLatestStatus: pdfLatest?.status ?? null,
        pdfCanFinalize: Boolean(pdfValidation?.canFinalize),
        pdfVersionCount: pdfVersions.length,
        legalPackageGenerated: Boolean(legalPackage),
        documentCount: documents.length,
      }),
    [
      caseData.diagnosis,
      caseData.mrn,
      caseData.patient,
      caseData.physician,
      caseData.status,
      consentRecords.length,
      documents,
      financialNoticeAvailable,
      legalPackage,
      legalReadinessReport?.blockers,
      pdfLatest?.status,
      pdfValidation?.canFinalize,
      pdfVersions.length,
      presentation.language,
      readiness?.ready_for_legal,
      readiness?.reason,
      refusalScenario,
      role,
      signature.patient_decision,
      signature.signer_name,
      witness.witness_name,
    ],
  );

  // Derive selected step: honour manual user selection as long as the step still exists,
  // otherwise fall back to the workflow-recommended step.
  const selectedStepKey: CaseWorkspaceStepKey =
    manualStepKey && workflowFlow.steps.some((s) => s.key === manualStepKey)
      ? manualStepKey
      : workflowFlow.recommendedStepKey;

  const selectedStep =
    workflowFlow.steps.find((step) => step.key === selectedStepKey) || workflowFlow.currentStep;
  const completedSteps = workflowFlow.steps.filter((step) => step.status === "completed").length;
  const progressValue = Math.round((completedSteps / workflowFlow.steps.length) * 100);
  const viewOnlyMode =
    !canMedicalActions && !canLegalApprove && !canGeneratePdf && !canGenerateBundle;

  function renderCaseCreationStep() {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">MRN</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.mrn}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.patient}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current owner</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.physician}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Case status</div>
                <div className="mt-1"><Badge variant="outline">{caseData.status}</Badge></div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Clinical context</div>
              <div className="mt-1 text-sm text-slate-700">{caseData.diagnosis}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intake Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Case record established</span>
              <Badge variant="success">Complete</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Owner assigned</span>
              <Badge variant={caseData.physician !== "Not assigned" ? "success" : "warning"}>
                {caseData.physician !== "Not assigned" ? "Assigned" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Clinical summary present</span>
              <Badge variant={caseData.diagnosis !== "Discharge refusal workflow" ? "success" : "warning"}>
                {caseData.diagnosis !== "Discharge refusal workflow" ? "Recorded" : "Needs update"}
              </Badge>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-slate-700">
              This step now owns the old Case Summary and Assignments / SLA sections.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderMedicalDecisionStep() {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Record Medical Explanation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Select
                aria-label="Presentation language"
                value={presentation.language}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    language: event.target.value,
                  }))
                }
              >
                <option value="">Select language</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Bilingual">Bilingual</option>
              </Select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={presentation.interpreter_used}
                  onChange={(event) =>
                    setPresentation((previous) => ({
                      ...previous,
                      interpreter_used: event.target.checked,
                    }))
                  }
                />
                Interpreter used during explanation
              </label>
              <Input
                placeholder="Presented to"
                value={presentation.presented_to}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    presented_to: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Presented by"
                value={presentation.presented_by}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    presented_by: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Current clinical owner</div>
                <div className="mt-1 text-sm text-slate-600">{caseData.physician}</div>
                <div className="mt-4 text-sm font-semibold text-slate-900">Diagnosis / rationale</div>
                <div className="mt-1 text-sm text-slate-600">{caseData.diagnosis}</div>
              </div>
              <div className="space-y-2">
                <Button
                  disabled={loading || !canMedicalActions}
                  title={!canMedicalActions ? deniedMessage : undefined}
                  onClick={() => {
                    void onRecordPresentation();
                  }}
                >
                  Record Medical Decision
                </Button>
                {!canMedicalActions ? (
                  <div className="text-xs text-amber-700">{deniedMessage}</div>
                ) : null}
                <Badge variant={presentation.language ? "success" : "warning"}>
                  {presentation.language ? "Medical explanation recorded" : "Medical explanation pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Moved Here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 px-3 py-2">Old section: Presentation / Proof of Notice</div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">Old read-only case physician and diagnosis fields</div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">Only the doctor-facing explanation task is shown here to reduce noise.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPatientDecisionStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Patient Response & Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Patient Decision</div>
                  <div className="text-xs text-slate-500">Record the response to the proposed treatment path.</div>
                </div>
                <RadioGroup
                  value={signature.patient_decision}
                  onValueChange={(value) => {
                    const decision = value as PatientDecision;
                    setSignature((previous) => ({
                      ...previous,
                      patient_decision: decision,
                      outcome: decision === "accepted" ? "signed" : "refused_to_sign",
                    }));
                  }}
                >
                  <RadioGroupLabel>
                    <RadioGroupItem value="accepted" /> Accepted
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="refused" /> Refused
                  </RadioGroupLabel>
                </RadioGroup>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Attestation</div>
                  <div className="text-xs text-slate-500">Keep outcome aligned with the patient decision.</div>
                </div>
                <RadioGroup
                  value={signature.outcome}
                  onValueChange={(value) =>
                    setSignature((previous) => ({
                      ...previous,
                      outcome: value as SignatureOutcome,
                      patient_decision: value === "signed" ? "accepted" : "refused",
                    }))
                  }
                >
                  <RadioGroupLabel>
                    <RadioGroupItem value="signed" /> Signed
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="refused_to_sign" /> Refused to sign
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="unable_to_sign" /> Unable to sign
                  </RadioGroupLabel>
                </RadioGroup>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Signer</div>
                <Input
                  placeholder="Signer name"
                  value={signature.signer_name}
                  onChange={(event) =>
                    setSignature((previous) => ({
                      ...previous,
                      signer_name: event.target.value,
                    }))
                  }
                />
                {signature.outcome !== "signed" ? (
                  <Input
                    placeholder="Reason"
                    value={signature.reason}
                    onChange={(event) =>
                      setSignature((previous) => ({
                        ...previous,
                        reason: event.target.value,
                      }))
                    }
                  />
                ) : null}
                <Button
                  disabled={loading || !canMedicalActions || !signature.patient_decision}
                  title={!canMedicalActions ? deniedMessage : undefined}
                  onClick={() => {
                    void onRecordSignature();
                  }}
                >
                  Record Patient Decision
                </Button>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Witness</div>
                <Input
                  placeholder="Witness name"
                  value={witness.witness_name}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      witness_name: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Witness role"
                  value={witness.witness_role}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      witness_role: event.target.value,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  disabled={loading || !canWitnessAction}
                  title={!canWitnessAction ? deniedMessage : undefined}
                  onClick={() => {
                    void onRecordWitness();
                  }}
                >
                  Record Witness
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              aria-label="Consent method"
              value={consentForm.consentMethod}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  consentMethod: event.target.value,
                }))
              }
            >
              <option value="ELECTRONIC_SIGNATURE">Electronic signature</option>
              <option value="OTP">OTP</option>
              <option value="WITNESS_ACKNOWLEDGMENT">Witness acknowledgment</option>
              <option value="WRITTEN">Written</option>
            </Select>
            <Input
              placeholder="Processing purpose"
              value={consentForm.processingPurpose}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  processingPurpose: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Lawful basis"
              value={consentForm.lawfulBasis}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  lawfulBasis: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Witness / confirmer"
              value={consentForm.witnessName}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  witnessName: event.target.value,
                }))
              }
            />
            {consentForm.consentMethod === "OTP" ? (
              <Input
                placeholder="OTP reference"
                value={consentForm.otpReference}
                onChange={(event) =>
                  setConsentForm((previous) => ({
                    ...previous,
                    otpReference: event.target.value,
                  }))
                }
              />
            ) : null}
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                void onRecordConsent();
              }}
            >
              Record Consent Evidence
            </Button>
            <Badge variant={consentRecords.length > 0 ? "success" : "warning"}>
              {consentRecords.length > 0 ? `${consentRecords.length} consent record(s)` : "Consent evidence pending"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderLegalReadinessStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Readiness Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Ready for legal</span>
              <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>
                {readiness?.ready_for_legal ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Patient decision</span>
              <Badge variant={legalDecisionIndicator.badgeVariant}>{legalDecisionIndicator.label}</Badge>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              {legalDecisionIndicator.followUpText}
            </div>
            {readiness?.reason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                {readiness.reason}
              </div>
            ) : null}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-slate-700">
              This step now owns the old Legal Readiness card and Legal Readiness Checklist.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {legalReadinessReport ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={legalReadinessReport.readyForLegal ? "success" : "warning"}>
                    {legalReadinessReport.status}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Consent: {legalReadinessReport.evidence?.consentCount ?? 0} • Documents: {legalReadinessReport.evidence?.documentCount ?? 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {legalReadinessReport.checklist.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{item.label}</div>
                        <div className="text-slate-500">{item.reason}</div>
                      </div>
                      <Badge variant={item.satisfied ? "success" : item.required ? "warning" : "outline"}>
                        {item.satisfied ? "Compliant" : item.required ? "Blocked" : "Optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              renderMissingState("No readiness checklist has been evaluated yet.")
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderDocumentsStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Generate Legal Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="PDF language"
                className="w-auto min-w-[10rem]"
                value={pdfLanguage}
                onChange={(event) => setPdfLanguage(event.target.value === "ar" ? "ar" : "en")}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </Select>
              <Button
                disabled={pdfBusy || !canGeneratePdf}
                title={!canGeneratePdf ? deniedMessage : undefined}
                onClick={() => {
                  void onGenerateCasePdf("draft", false);
                }}
              >
                <FileText className="h-4 w-4" />
                Generate Draft PDF
              </Button>
              <Button
                variant="outline"
                disabled={pdfBusy || !canGeneratePdf || !canLegalApprove}
                title={!canGeneratePdf || !canLegalApprove ? deniedMessage : undefined}
                onClick={() => {
                  void onGenerateCasePdf("final", false);
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Generate Final PDF
              </Button>
              <Button
                variant="outline"
                disabled={pdfBusy || !canGeneratePdf}
                title={!canGeneratePdf ? deniedMessage : undefined}
                onClick={() => {
                  void onGenerateCasePdf("draft", true);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={loading || !canGenerateBundle}
                title={!canGenerateBundle ? deniedMessage : undefined}
                onClick={() => {
                  void onGenerateLegalPackage();
                }}
              >
                <Package className="h-4 w-4" />
                Generate Legal Package
              </Button>
              {legalPackage?.download_url && canDownloadFinalDocs ? (
                <a href={legalPackage.download_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
                    Download Package
                  </Button>
                </a>
              ) : null}
            </div>

            {pdfLatest ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={pdfLatest.status === "final" ? "success" : pdfLatest.status === "failed" ? "warning" : "outline"}>
                    v{pdfLatest.version} • {pdfLatest.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{pdfLatest.language.toUpperCase()}</Badge>
                  <Badge variant="outline">{Math.round((pdfLatest.fileSize || 0) / 1024)} KB</Badge>
                </div>
                <div className="text-slate-600">Generated: {new Date(pdfLatest.generatedAt).toLocaleString()}</div>
                <div className="text-slate-600">File: {pdfLatest.fileName}</div>
                <div className="text-slate-500">SHA-256: {pdfLatest.sha256Hash?.slice(0, 24) || "N/A"}</div>
              </div>
            ) : (
              renderMissingState("No legal case PDF has been generated yet.")
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness for Final Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-700">Finalization readiness</span>
              <Badge variant={pdfValidation?.canFinalize ? "success" : "warning"}>
                {pdfValidation?.canFinalize ? "Ready" : "Missing required fields"}
              </Badge>
            </div>
            {pdfValidation?.missingRequired?.length ? (
              <ul className="space-y-1 text-sm text-amber-700">
                {pdfValidation.missingRequired.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600">All required compliance fields are available.</div>
            )}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-700">
              This step now owns the old Legal Package, Legal Case PDF Reports, and document export actions.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderClosureStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Closure Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Authorized final PDF</span>
              <Badge variant={pdfLatest?.status === "final" ? "success" : "warning"}>
                {pdfLatest?.status === "final" ? "Available" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Legal package</span>
              <Badge variant={legalPackage ? "success" : "warning"}>{legalPackage ? "Generated" : "Pending"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">Case status</span>
              <Badge variant={caseData.status.toUpperCase() === "CLOSED" ? "success" : "warning"}>{caseData.status}</Badge>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              No backend closure contract is changed here. This step reorganizes the final review and sign-off presentation only.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pdfLatest ? (
              <div className="flex flex-wrap gap-2">
                <a href={`/api/cases/${caseId}/pdf/${pdfLatest.version}/preview`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Eye className="h-4 w-4" />
                    Preview Latest
                  </Button>
                </a>
                {canDownloadFinalDocs ? (
                  <a href={`/api/cases/${caseId}/pdf/${pdfLatest.version}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Download className="h-4 w-4" />
                      Download Latest
                    </Button>
                  </a>
                ) : null}
              </div>
            ) : null}
            {legalPackage?.download_url && canDownloadFinalDocs ? (
              <a href={legalPackage.download_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Package className="h-4 w-4" />
                  Download Bundle
                </Button>
              </a>
            ) : null}
            {selectedStep.missingItems.length > 0 ? (
              <ul className="space-y-1 text-sm text-amber-700">
                {selectedStep.missingItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Closure prerequisites are satisfied. Authorized signatory may complete the final workflow action.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderActiveStep(step: CaseWorkspaceStep) {
    switch (step.key) {
      case "case_creation":
        return renderCaseCreationStep();
      case "medical_decision":
        return renderMedicalDecisionStep();
      case "patient_decision":
        return renderPatientDecisionStep();
      case "legal_readiness":
        return renderLegalReadinessStep();
      case "legal_documents_bundle":
        return renderDocumentsStep();
      case "closure":
        return renderClosureStep();
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {viewOnlyMode ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="font-semibold">View-only workspace</div>
          <div className="mt-1 text-blue-600">
            You can inspect case progress and evidence, but action steps remain assigned to workflow owners.
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_55%,#f4fbf6_100%)]">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{workflowFlow.roleSummaryLabel}</Badge>
                <Badge variant={selectedStep.status === "completed" ? "success" : "warning"}>
                  {stepStatusLabel(selectedStep)} stage
                </Badge>
              </div>
              <CardTitle className="text-2xl">Case Execution Workflow</CardTitle>
              <div className="text-sm text-slate-600">
                {caseData.patient} • {caseData.mrn} • {caseData.status}
              </div>
            </div>

            <div className="min-w-[18rem] rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Workflow progress</span>
                <span>{completedSteps}/{workflowFlow.steps.length} completed</span>
              </div>
              <Progress value={progressValue} className="mb-3" />
              <div className="text-xs text-slate-500">
                One active step is shown at a time. Technical detail stays in supporting tabs below.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Stage</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.label}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Owner</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.ownerLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Next Action</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.nextAction}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Missing Items</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {selectedStep.missingItems.length === 0 ? "None" : `${selectedStep.missingItems.length} open item(s)`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Workflow Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowFlow.steps.map((step, index) => {
              const Icon = stepIcon(step.key);
              const isSelected = step.key === selectedStep.key;

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setSelectedStepKey(step.key)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-cyan-300 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isSelected ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Step {index + 1}</div>
                        <div className="font-semibold text-slate-900">{step.label}</div>
                      </div>
                    </div>
                    <Badge variant={stepBadgeVariant(step)}>{stepStatusLabel(step)}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">Owner: {step.ownerLabel}</div>
                  <div className="mt-2 flex items-center text-xs text-slate-600">
                    Open step
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={stepBadgeVariant(selectedStep)}>{stepStatusLabel(selectedStep)}</Badge>
                    <Badge variant="outline">{selectedStep.shortLabel}</Badge>
                  </div>
                  <CardTitle>{selectedStep.label}</CardTitle>
                  <div className="mt-1 text-sm text-slate-600">{selectedStep.description}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Recommended visibility</div>
                  <div className="mt-1">{selectedStep.recommendedVisibleRoles.join(" • ")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Next Action</div>
                  <div className="mt-1">{selectedStep.nextAction}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Sections moved into this step</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedStep.includedSections.map((section) => (
                      <Badge key={section} variant="outline">{section}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {selectedStep.missingItems.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="mb-2 font-semibold text-amber-900">Missing Items</div>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {selectedStep.missingItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    No missing items in this step.
                  </div>
                </div>
              )}

              {renderActiveStep(selectedStep)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supporting Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={detailTab} onValueChange={(value) => setDetailTab(value as DetailTab)}>
                <TabsList>
                  <TabsTrigger value="supporting">Supporting Evidence</TabsTrigger>
                  <TabsTrigger value="documents">Documents & Versions</TabsTrigger>
                  <TabsTrigger value="audit">Audit & Security</TabsTrigger>
                </TabsList>

                <TabsContent value="supporting" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Readiness Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">Ready for legal</span>
                          <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>{readiness?.ready_for_legal ? "Yes" : "No"}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">Patient decision</span>
                          <Badge variant={legalDecisionIndicator.badgeVariant}>{legalDecisionIndicator.label}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">Financial notice</span>
                          <Badge variant={financialNoticeAvailable ? "success" : "outline"}>{financialNoticeAvailable ? "Available" : "Not found"}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Consent Records</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {consentRecords.length === 0 ? (
                          renderMissingState("No consent records saved yet.")
                        ) : (
                          consentRecords.slice(0, 5).map((record) => (
                            <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="font-medium text-slate-800">{record.processingPurpose || "Discharge refusal consent"}</div>
                              <div className="text-slate-500">Method: {record.consentMethod || "N/A"}</div>
                              <div className="text-slate-500">Hash: {record.documentHash?.slice(0, 16) || "-"}</div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Generated Documents</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {documents.length === 0 ? (
                          renderMissingState("No generated documents found for this case yet.")
                        ) : (
                          documents.slice(0, 8).map((document) => (
                            <div key={document.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                              <div>
                                <div className="font-medium text-slate-800">{document.title || document.template_key || "Document"}</div>
                                <div className="text-slate-500">{document.generated_at ? new Date(document.generated_at).toLocaleString() : "Pending"}</div>
                              </div>
                              <Badge variant={document.generationStatus === "generated" ? "success" : "outline"}>{document.generationStatus || "draft"}</Badge>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>PDF Versions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {pdfVersions.length === 0 ? (
                          renderMissingState("No PDF versions are available yet.")
                        ) : (
                          pdfVersions.map((version) => (
                            <div key={version.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-medium text-slate-800">v{version.version} • {version.fileName}</div>
                                  <div className="text-slate-500">{new Date(version.generatedAt).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={version.status === "final" ? "success" : version.status === "failed" ? "warning" : "outline"}>{version.status}</Badge>
                                  <a href={`/api/cases/${caseId}/pdf/${version.version}/preview`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                      Preview
                                    </Button>
                                  </a>
                                  {canDownloadFinalDocs ? (
                                    <a href={`/api/cases/${caseId}/pdf/${version.version}/download`} target="_blank" rel="noopener noreferrer">
                                      <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4" />
                                        Download
                                      </Button>
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Audit Trail</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {!canReadAudit ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                            {deniedMessage}
                          </div>
                        ) : null}
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={auditChain?.verification?.verified ? "success" : "warning"}>
                            Hash chain {auditChain?.verification?.verified ? "verified" : "pending"}
                          </Badge>
                          <span className="text-slate-600">{auditChain?.verification?.totalEvents ?? 0} event(s)</span>
                          {canReadSmsEvidence ? <Badge variant="outline">SMS evidence enabled</Badge> : null}
                        </div>
                        {canReadAudit && auditChain?.events?.length ? (
                          auditChain.events.slice(0, 6).map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="font-medium text-slate-800">{event.eventType}</div>
                              <div className="text-slate-500">{event.payloadSummary}</div>
                              <div className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</div>
                            </div>
                          ))
                        ) : (
                          renderMissingState(canReadAudit ? "No audit chain events available yet." : "Audit records are hidden for your role.")
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Security / Access Log</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {(auditChain?.events ?? [])
                          .filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType))
                          .slice(0, 8)
                          .map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-slate-800">{event.eventType}</span>
                                <Badge variant="outline">{event.actorRole || "system"}</Badge>
                              </div>
                              <div className="text-slate-500">{event.payloadSummary}</div>
                              <div className="text-slate-400">Hash: {event.currentHash.slice(0, 16)}...</div>
                            </div>
                          ))}
                        {(auditChain?.events ?? []).filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType)).length === 0
                          ? renderMissingState("No security-sensitive access events have been captured yet.")
                          : null}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
