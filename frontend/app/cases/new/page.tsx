"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePenLine, Save } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import DischargeDecisionPanel from "@/components/discharge/DischargeDecisionPanel";
import EquipmentRequestForm, {
  type EquipmentRequestValue,
} from "@/components/discharge/EquipmentRequestForm";
import FinancialLiabilityForm, {
  type FinancialLiabilityValue,
} from "@/components/discharge/FinancialLiabilityForm";
import HomeCarePlanForm, {
  type HomeCarePlanValue,
} from "@/components/discharge/HomeCarePlanForm";
import TransferHospitalForm, {
  type TransferHospitalValue,
} from "@/components/discharge/TransferHospitalForm";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";

type DischargeCaseDetail = {
  id: string;
  patientName?: string | null;
  patientIdNumber?: string | null;
  medicalRecordNo?: string | null;
  roomNumber?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CreateCaseResponse = {
  id: string;
};

function readMetadataField(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!metadata) {
    return "";
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function toDateTimeLocal(raw: string): string {
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewCasePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [fromCase, setFromCase] = useState<string | null>(null);

  const [patientMrn, setPatientMrn] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientIdNumber, setPatientIdNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [attendingPhysician, setAttendingPhysician] = useState("");
  const [dischargeDecisionAt, setDischargeDecisionAt] = useState("");
  const [discussionSummary, setDiscussionSummary] = useState("");
  const [socialAdministrativeInterventions, setSocialAdministrativeInterventions] = useState("");
  const [insuranceCoverageStatus, setInsuranceCoverageStatus] = useState("");

  const [refusalReason, setRefusalReason] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [signatureText, setSignatureText] = useState("");

  const [dischargeStatus, setDischargeStatus] = useState<"accept_discharge" | "refuse_discharge">(
    "accept_discharge"
  );
  const [dischargeAlternative, setDischargeAlternative] = useState<
    "" | "home_care" | "transfer_hospital" | "financial_responsibility"
  >("");
  const [homeCarePlan, setHomeCarePlan] = useState<HomeCarePlanValue>({
    careType: "",
    equipmentRequired: [],
    careProvider: "",
  });
  const [transferHospital, setTransferHospital] = useState<TransferHospitalValue>({
    receivingHospital: "",
    transferReason: "",
    medicalStabilityConfirmation: false,
  });
  const [financialLiability, setFinancialLiability] = useState<FinancialLiabilityValue>({
    acceptsFinancialResponsibility: false,
    signatureMethod: "sms_otp",
  });
  const [equipmentRequest, setEquipmentRequest] = useState<EquipmentRequestValue>({
    requestedEquipment: "",
    department: "respiratory_therapy",
    status: "pending",
  });

  const [prefillLoading, setPrefillLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pageTitle = useMemo(() => (fromCase ? t("newCase.titleEdit") : t("newCase.title")), [fromCase, t]);
  const shcModuleEnabled = process.env.NEXT_PUBLIC_SHC_COMPLIANCE_MODULE === "true";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const fromCaseParam = new URLSearchParams(window.location.search).get("fromCase");
    setFromCase(fromCaseParam);
  }, []);

  useEffect(() => {
    if (!fromCase) {
      return;
    }

    setPrefillLoading(true);
    setError("");

    apiFetch<DischargeCaseDetail>(`/api/cases/${fromCase}`)
      .then((existingCase) => {
        const metadata =
          existingCase.metadata && typeof existingCase.metadata === "object"
            ? existingCase.metadata
            : null;

        setPatientMrn(
          existingCase.medicalRecordNo ||
            readMetadataField(metadata, "medical_record_number", "patient_mrn")
        );
        setPatientName(existingCase.patientName || readMetadataField(metadata, "patient_name"));
        setPatientIdNumber(
          existingCase.patientIdNumber || readMetadataField(metadata, "patient_id_number")
        );
        setRoomNumber(existingCase.roomNumber || readMetadataField(metadata, "room_number"));
        setAttendingPhysician(readMetadataField(metadata, "attending_physician"));
        setDischargeDecisionAt(toDateTimeLocal(readMetadataField(metadata, "discharge_decision_at")));
        setDiscussionSummary(readMetadataField(metadata, "discussion_summary"));
        setSocialAdministrativeInterventions(
          readMetadataField(metadata, "social_administrative_interventions")
        );
        setInsuranceCoverageStatus(readMetadataField(metadata, "insurance_coverage_status"));

        setRefusalReason(readMetadataField(metadata, "refusal_reason"));
        setSignerName(readMetadataField(metadata, "signer_name"));
        setSignerRole(readMetadataField(metadata, "signer_role"));
        setSignatureText(readMetadataField(metadata, "signature_text"));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : t("newCase.failedLoad");
        setError(message);

        if (message.includes("401") || message.includes("Invalid")) {
          clearToken();
          router.push("/login");
        }
      })
      .finally(() => setPrefillLoading(false));
  }, [fromCase, router, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const metadata = {
        patient_name: patientName,
        patient_id_number: patientIdNumber,
        medical_record_number: patientMrn,
        room_number: roomNumber,
        attending_physician: attendingPhysician,
        discharge_decision_at: dischargeDecisionAt,
        refusal_reason: refusalReason,
        discussion_summary: discussionSummary,
        social_administrative_interventions: socialAdministrativeInterventions,
        insurance_coverage_status: insuranceCoverageStatus,
        signer_name: signerName,
        signer_role: signerRole,
        signature_text: signatureText,
        shc_compliance: shcModuleEnabled
          ? {
              discharge_status: dischargeStatus,
              discharge_alternative:
                dischargeStatus === "refuse_discharge" ? dischargeAlternative || null : null,
              home_care_plan:
                dischargeStatus === "refuse_discharge" && dischargeAlternative === "home_care"
                  ? homeCarePlan
                  : null,
              transfer_request:
                dischargeStatus === "refuse_discharge" && dischargeAlternative === "transfer_hospital"
                  ? transferHospital
                  : null,
              financial_liability:
                dischargeStatus === "refuse_discharge" && dischargeAlternative === "financial_responsibility"
                  ? financialLiability
                  : null,
              equipment_request:
                dischargeStatus === "refuse_discharge" ? equipmentRequest : null,
            }
          : null,
      };

      const createdCase = await apiFetch<CreateCaseResponse>("/api/cases", {
        method: "POST",
        body: JSON.stringify({
          caseType: "DISCHARGE_REFUSAL",
          workflowType: "discharge_refusal",
          title: `Discharge refusal - ${patientName}`,
          patientName,
          patientIdNumber,
          medicalRecordNo: patientMrn,
          roomNumber,
          metadata,
        }),
      });

      if (shcModuleEnabled && dischargeStatus === "refuse_discharge") {
        await apiFetch("/api/shc-compliance", {
          method: "POST",
          body: JSON.stringify({
            caseId: createdCase.id,
            patient: {
              patient_name: patientName,
              patient_id_number: patientIdNumber,
              medical_record_number: patientMrn,
              room_number: roomNumber,
              attending_physician: attendingPhysician,
            },
            shc: {
              discharge_status: dischargeStatus,
              discharge_alternative: dischargeAlternative,
              home_care_plan: dischargeAlternative === "home_care" ? homeCarePlan : null,
              transfer_request: dischargeAlternative === "transfer_hospital" ? transferHospital : null,
              financial_liability:
                dischargeAlternative === "financial_responsibility" ? financialLiability : null,
              equipment_request: equipmentRequest,
            },
            signature: {
              signature_method:
                dischargeAlternative === "financial_responsibility"
                  ? financialLiability.signatureMethod
                  : "tablet_signature",
              device: "web",
            },
          }),
        });
      }

      router.push("/cases");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("newCase.failedSave");
      setError(message);

      if (message.includes("401") || message.includes("Invalid")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={pageTitle}
        subtitle={t("newCase.subtitle")}
        actions={
          <>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToCases")}
            </Link>
            {fromCase ? (
              <Link
                href={`/cases/${fromCase}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                <FilePenLine className="h-4 w-4" />
                {t("newCase.backToCaseDetails")}
              </Link>
            ) : null}
          </>
        }
      >
        {prefillLoading ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("newCase.loadingExisting")}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2 md:p-5"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.patientMrn")}</span>
            <input
              required
              value={patientMrn}
              onChange={(event) => setPatientMrn(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.patientName")}</span>
            <input
              required
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.idIqama")}</span>
            <input
              required
              value={patientIdNumber}
              onChange={(event) => setPatientIdNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.roomNumber")}</span>
            <input
              required
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.attendingPhysician")}</span>
            <input
              required
              value={attendingPhysician}
              onChange={(event) => setAttendingPhysician(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.dischargeDecisionDate")}</span>
            <input
              required
              type="datetime-local"
              value={dischargeDecisionAt}
              onChange={(event) => setDischargeDecisionAt(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.refusalReason")}</span>
            <textarea
              required
              value={refusalReason}
              onChange={(event) => setRefusalReason(event.target.value)}
              className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.discussionSummary")}</span>
            <textarea
              required
              value={discussionSummary}
              onChange={(event) => setDiscussionSummary(event.target.value)}
              className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.socialAdministrativeInterventions")}</span>
            <textarea
              required
              value={socialAdministrativeInterventions}
              onChange={(event) => setSocialAdministrativeInterventions(event.target.value)}
              className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.insuranceCoverageStatus")}</span>
            <input
              value={insuranceCoverageStatus}
              onChange={(event) => setInsuranceCoverageStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.signerName")}</span>
            <input
              required
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.signerRole")}</span>
            <input
              required
              value={signerRole}
              onChange={(event) => setSignerRole(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.signatureText")}</span>
            <textarea
              required
              value={signatureText}
              onChange={(event) => setSignatureText(event.target.value)}
              className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          {shcModuleEnabled ? (
            <>
              <DischargeDecisionPanel
                dischargeStatus={dischargeStatus}
                dischargeAlternative={dischargeAlternative}
                onDischargeStatusChange={(value) => {
                  setDischargeStatus(value);
                  if (value !== "refuse_discharge") {
                    setDischargeAlternative("");
                  }
                }}
                onAlternativeChange={setDischargeAlternative}
              />

              {dischargeStatus === "refuse_discharge" && dischargeAlternative === "home_care" ? (
                <HomeCarePlanForm value={homeCarePlan} onChange={setHomeCarePlan} />
              ) : null}

              {dischargeStatus === "refuse_discharge" && dischargeAlternative === "transfer_hospital" ? (
                <TransferHospitalForm value={transferHospital} onChange={setTransferHospital} />
              ) : null}

              {dischargeStatus === "refuse_discharge" && dischargeAlternative === "financial_responsibility" ? (
                <FinancialLiabilityForm value={financialLiability} onChange={setFinancialLiability} />
              ) : null}

              {dischargeStatus === "refuse_discharge" ? (
                <EquipmentRequestForm value={equipmentRequest} onChange={setEquipmentRequest} />
              ) : null}
            </>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? t("newCase.saving") : fromCase ? t("newCase.saveAsNew") : t("newCase.create")}
            </button>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.cancel")}
            </Link>
          </div>
        </form>
      </AppShell>
    </AuthGuard>
  );
}
