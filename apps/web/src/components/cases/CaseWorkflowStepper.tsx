"use client";

import { useRouter } from "next/navigation";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import type { WorkflowProgressStep } from "@/components/ui/WorkflowProgress";
import { useI18n } from "@/i18n/I18nProvider";
import type { DischargeCaseDetail as CaseDetail } from "@/lib/services/dischargeCases.service";
import type { DischargeWorkflow } from "@/types/dischargeWorkflow";
import type { LegalCaseSummary } from "@/lib/services/legalOrchestration.service";

type CaseWorkflowStepperProps = {
    caseId: string;
    caseDetail: CaseDetail | null;
    workflow: DischargeWorkflow | null;
    legalSummary?: LegalCaseSummary | null;
    loading?: boolean;
};

const LEGAL_STATES_WITH_RESPONSE = new Set([
    "PATIENT_ACCEPTED",
    "PATIENT_REFUSED",
    "REFUSED_TO_SIGN",
    "UNABLE_TO_SIGN",
    "ESCALATED",
    "CLOSED",
    "FINAL_PACKAGE_READY",
]);

function deriveCaseDataState(caseDetail: CaseDetail | null): WorkflowProgressStep["state"] {
    if (!caseDetail) return "upcoming";
    const hasCore =
        Boolean(caseDetail.patient_name?.trim()) &&
        Boolean(caseDetail.patient_mrn?.trim()) &&
        Boolean(caseDetail.attending_physician?.trim());
    return hasCore ? "completed" : "current";
}

function deriveDischargeDecisionState(
    workflow: DischargeWorkflow | null,
    _legalSummary: LegalCaseSummary | null | undefined,
    caseDataDone: boolean,
): WorkflowProgressStep["state"] {
    if (!caseDataDone) return "upcoming";
    if (workflow?.discharge_decision_at) {
        return "completed";
    }
    return "current";
}

function derivePatientNoticeState(
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
    decisionDone: boolean,
): WorkflowProgressStep["state"] {
    if (!decisionDone) return "upcoming";
    const hasPresentations = (legalSummary?.counts?.notice_presentations ?? 0) > 0;
    const hasFinancialNotice = Boolean(workflow?.financial_notice_generated_at);
    if (hasPresentations || hasFinancialNotice) return "completed";
    // Decision exists but no notice presentation yet: action is required.
    return "warning";
}

function deriveResponseSignatureState(
    caseDetail: CaseDetail | null,
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
    noticeDone: boolean,
): WorkflowProgressStep["state"] {
    if (!noticeDone) return "upcoming";
    const hasResponses = (legalSummary?.counts?.responses ?? 0) > 0;
    const hasSigned = Boolean(caseDetail?.signed_at);
    const legalState = legalSummary?.event?.legal_state ?? "";
    if (hasResponses || hasSigned || LEGAL_STATES_WITH_RESPONSE.has(legalState)) {
        return "completed";
    }
    return "current";
}

function deriveDocumentsState(
    caseDetail: CaseDetail | null,
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
    responseDone: boolean,
): WorkflowProgressStep["state"] {
    if (!responseDone) return "upcoming";
    const workflowDocs = workflow?.documents?.length ?? 0;
    const legalDocs = legalSummary?.counts?.documents ?? 0;
    if (workflowDocs > 0 || legalDocs > 0 || Boolean(caseDetail?.pdf_file)) {
        return "completed";
    }
    return "current";
}

function deriveEscalationState(
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
    documentsDone: boolean,
): WorkflowProgressStep["state"] {
    const escalationCount = legalSummary?.counts?.escalations ?? 0;
    const hasEscalatedAt = Boolean(workflow?.escalated_at);
    if (escalationCount > 0 || hasEscalatedAt) return "completed";
    if (workflow?.escalation_required && documentsDone) return "warning";
    return "upcoming";
}

function deriveFinalFileState(
    docsState: WorkflowProgressStep["state"],
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
): WorkflowProgressStep["state"] {
    const hasPackage = (legalSummary?.counts?.evidence_packages ?? 0) > 0;
    const isClosed = workflow?.status === "closed";
    if (hasPackage || isClosed) return "completed";
    if (docsState === "completed" || docsState === "current") return "current";
    return "upcoming";
}

function buildSteps(
    caseId: string,
    caseDetail: CaseDetail | null,
    workflow: DischargeWorkflow | null,
    legalSummary: LegalCaseSummary | null | undefined,
    t: (key: string) => string,
): WorkflowProgressStep[] {
    const caseDataState = deriveCaseDataState(caseDetail);
    const caseDataDone = caseDataState === "completed";

    const decisionState = deriveDischargeDecisionState(workflow, legalSummary, caseDataDone);
    const decisionDone = decisionState === "completed";

    const noticeState = derivePatientNoticeState(workflow, legalSummary, decisionDone);
    const noticeDone = noticeState === "completed";

    const responseState = deriveResponseSignatureState(caseDetail, workflow, legalSummary, noticeDone);
    const responseDone = responseState === "completed";

    const docsState = deriveDocumentsState(caseDetail, workflow, legalSummary, responseDone);
    const docsDone = docsState === "completed";

    const escalationState = deriveEscalationState(workflow, legalSummary, docsDone);
    const finalFileState = deriveFinalFileState(docsState, workflow, legalSummary);

    return [
        {
            id: "case_data",
            titleAr: t("stepper.steps.caseData"),
            titleEn: t("stepper.steps.caseData"),
            subtitleAr: caseDataDone ? t("stepper.status.completed") : t("stepper.status.inProgress"),
            subtitleEn: caseDataDone ? t("stepper.status.completed") : t("stepper.status.inProgress"),
            state: caseDataState,
            clickable: true,
            href: `/cases/${caseId}`,
        },
        {
            id: "discharge_decision",
            titleAr: t("stepper.steps.dischargeDecision"),
            titleEn: t("stepper.steps.dischargeDecision"),
            subtitleAr: decisionDone
                ? t("stepper.status.completed")
                : decisionState === "current"
                    ? t("stepper.nextActions.recordDischargeDecision")
                    : t("stepper.status.pending"),
            subtitleEn: decisionDone
                ? t("stepper.status.completed")
                : decisionState === "current"
                    ? t("stepper.nextActions.recordDischargeDecision")
                    : t("stepper.status.pending"),
            state: decisionState,
        },
        {
            id: "patient_notice",
            titleAr: t("stepper.steps.patientNotice"),
            titleEn: t("stepper.steps.patientNotice"),
            subtitleAr: noticeDone
                ? t("stepper.status.completed")
                : noticeState === "warning" || noticeState === "current"
                    ? t("stepper.nextActions.sendPatientNotice")
                    : t("stepper.status.pending"),
            subtitleEn: noticeDone
                ? t("stepper.status.completed")
                : noticeState === "warning" || noticeState === "current"
                    ? t("stepper.nextActions.sendPatientNotice")
                    : t("stepper.status.pending"),
            state: noticeState,
            clickable: Boolean(workflow?.discharge_decision_at),
            href: workflow?.discharge_decision_at ? `/cases/${caseId}/financial-notice` : undefined,
        },
        {
            id: "response_signature",
            titleAr: t("stepper.steps.responseSignature"),
            titleEn: t("stepper.steps.responseSignature"),
            subtitleAr: responseDone
                ? t("stepper.status.completed")
                : responseState === "current"
                    ? t("stepper.nextActions.recordResponse")
                    : t("stepper.status.pending"),
            subtitleEn: responseDone
                ? t("stepper.status.completed")
                : responseState === "current"
                    ? t("stepper.nextActions.recordResponse")
                    : t("stepper.status.pending"),
            state: responseState,
            clickable: noticeDone,
            href: noticeDone ? `/cases/${caseId}/refusal-form` : undefined,
        },
        {
            id: "documents",
            titleAr: t("stepper.steps.documents"),
            titleEn: t("stepper.steps.documents"),
            subtitleAr: docsDone
                ? t("stepper.status.completed")
                : docsState === "current"
                    ? t("stepper.nextActions.generateDocuments")
                    : t("stepper.status.pending"),
            subtitleEn: docsDone
                ? t("stepper.status.completed")
                : docsState === "current"
                    ? t("stepper.nextActions.generateDocuments")
                    : t("stepper.status.pending"),
            state: docsState,
        },
        {
            id: "escalation",
            titleAr: t("stepper.steps.escalation"),
            titleEn: t("stepper.steps.escalation"),
            subtitleAr:
                escalationState === "completed"
                    ? t("stepper.status.completed")
                    : escalationState === "warning"
                        ? t("stepper.nextActions.escalateCase")
                        : t("stepper.status.notRequired"),
            subtitleEn:
                escalationState === "completed"
                    ? t("stepper.status.completed")
                    : escalationState === "warning"
                        ? t("stepper.nextActions.escalateCase")
                        : t("stepper.status.notRequired"),
            state: escalationState,
            clickable: escalationState === "warning" || escalationState === "completed",
            href:
                escalationState === "warning" || escalationState === "completed"
                    ? `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`
                    : undefined,
        },
        {
            id: "final_file",
            titleAr: t("stepper.steps.finalFile"),
            titleEn: t("stepper.steps.finalFile"),
            subtitleAr:
                finalFileState === "completed"
                    ? t("stepper.status.completed")
                    : t("stepper.nextActions.buildFinalPackage"),
            subtitleEn:
                finalFileState === "completed"
                    ? t("stepper.status.completed")
                    : t("stepper.nextActions.buildFinalPackage"),
            state: finalFileState,
            clickable: true,
            href: `/legal-case-file?caseId=${caseId}`,
        },
    ];
}

function findNextAction(steps: WorkflowProgressStep[], t: (key: string) => string): string | null {
    for (const step of steps) {
        if (step.state === "current" || step.state === "warning") {
            return step.subtitleAr ?? null;
        }
    }
    const allDone = steps.every((s) => s.state === "completed");
    if (allDone) return t("stepper.nextActions.caseComplete");
    return null;
}

export default function CaseWorkflowStepper({
    caseId,
    caseDetail,
    workflow,
    legalSummary,
    loading,
}: CaseWorkflowStepperProps) {
    const router = useRouter();
    const { t, lang, isRtl } = useI18n();

    const steps = buildSteps(caseId, caseDetail, workflow, legalSummary, t);
    const nextAction = findNextAction(steps, t);
    const currentStep = steps.find((s) => s.state === "current" || s.state === "warning");

    if (loading) {
        return (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 flex gap-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-16 w-24 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t("stepper.title")}</h2>
                    {nextAction ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">{t("stepper.nextAction")}:</span>{" "}
                            {nextAction}
                        </p>
                    ) : null}
                </div>
                {currentStep ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                        {lang === "ar" ? currentStep.titleAr : currentStep.titleEn}
                    </span>
                ) : steps.every((s) => s.state === "completed") ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        {t("stepper.nextActions.caseComplete")}
                    </span>
                ) : null}
            </div>

            <WorkflowProgress
                steps={steps}
                language={lang}
                direction={isRtl ? "rtl" : "ltr"}
                layout="scroll"
                currentStepId={currentStep?.id}
                onStepClick={(step) => {
                    if (step.href) {
                        router.push(step.href);
                    }
                }}
            />
        </section>
    );
}
