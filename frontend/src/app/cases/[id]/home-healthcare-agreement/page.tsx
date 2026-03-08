"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type MethodItem = {
  method: "SMS_OTP" | "NAFATH" | "TABLET_SIGNATURE";
  available: boolean;
  label_ar: string;
  reason?: string | null;
};

type CareModel = {
  value: string;
  label: string;
};

const HOME_HEALTHCARE_MODEL = "home_healthcare_agreement";

export default function HomeHealthcareAgreementPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || "";

  const [previewHtml, setPreviewHtml] = useState("");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("pending");

  const [careModels, setCareModels] = useState<CareModel[]>([]);
  const [careModel, setCareModel] = useState(HOME_HEALTHCARE_MODEL);

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<MethodItem["method"]>("SMS_OTP");

  const [patientName, setPatientName] = useState("");
  const [urn, setUrn] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [legalGuardian, setLegalGuardian] = useState("");
  const [relationship, setRelationship] = useState("");
  const [guardianId, setGuardianId] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [debugOtp, setDebugOtp] = useState("");

  const [signaturePayload, setSignaturePayload] = useState("");
  const [nafathStatus, setNafathStatus] = useState("pending");

  const payload = useMemo(
    () => ({
      patient_name: patientName,
      urn,
      medical_record_number: urn,
      current_location: currentLocation,
      room_number: roomNumber,
      legal_guardian: legalGuardian,
      relationship,
      guardian_id: guardianId,
      date: new Date().toISOString().slice(0, 10),
      case_id: caseId,
      verification_method: selectedMethod,
    }),
    [patientName, urn, currentLocation, roomNumber, legalGuardian, relationship, guardianId, caseId, selectedMethod]
  );

  const isHomecareSelected = careModel === HOME_HEALTHCARE_MODEL;
  const fallbackMode = methods.some((item) => item.method === "SMS_OTP" && item.available);

  useEffect(() => {
    if (!caseId) {
      return;
    }

    void apiFetch<{ models: CareModel[] }>(`/api/discharge/cases/${caseId}/post-discharge-care-models`)
      .then((res) => setCareModels(res.models || []))
      .catch((err: Error) => setMessage(err.message));

    void apiFetch<{ methods: MethodItem[] }>(`/api/discharge/cases/${caseId}/acknowledgment/methods`)
      .then((res) => {
        setMethods(res.methods || []);
        const firstAvailable = (res.methods || []).find((item) => item.available);
        if (firstAvailable) {
          setSelectedMethod(firstAvailable.method);
        }
      })
      .catch((err: Error) => setMessage(err.message));
  }, [caseId]);

  useEffect(() => {
    if (!caseId || !isHomecareSelected) {
      return;
    }

    void apiFetch<{ html_content: string; context: Record<string, string> }>(
      `/api/discharge/cases/${caseId}/home-healthcare-agreement/preview`,
      {
        method: "POST",
        body: JSON.stringify({ payload }),
      }
    )
      .then((res) => {
        setPreviewHtml(res.html_content || "");
        if (!patientName && res.context?.patient_name) {
          setPatientName(res.context.patient_name);
        }
        if (!urn && (res.context?.urn || res.context?.medical_record_number)) {
          setUrn(res.context.urn || res.context.medical_record_number || "");
        }
        if (!roomNumber && res.context?.room_number) {
          setRoomNumber(res.context.room_number);
        }
      })
      .catch((err: Error) => setMessage(err.message));
  }, [caseId, isHomecareSelected, payload, patientName, roomNumber, urn]);

  const selectCareModel = async (nextModel: string) => {
    setCareModel(nextModel);
    setMessage("");
    try {
      const res = await apiFetch<{ trigger_home_healthcare_workflow: boolean }>(
        `/api/discharge/cases/${caseId}/post-discharge-care-model`,
        {
          method: "POST",
          body: JSON.stringify({ care_model: nextModel }),
        }
      );
      if (!res.trigger_home_healthcare_workflow) {
        setMessage("Home Healthcare Agreement activates only when option 3 is selected.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const startAgreement = async (method: MethodItem["method"]) => {
    setMessage("");
    setDebugOtp("");
    try {
      const requestPayload: Record<string, unknown> = { ...payload };
      if (method === "SMS_OTP") {
        requestPayload.phone_number = phoneNumber;
      }

      const res = await apiFetch<{ session_id: string; verification_status: string; provider_result?: { otp_debug_code?: string } }>(
        `/api/discharge/cases/${caseId}/acknowledgment/start`,
        {
          method: "POST",
          body: JSON.stringify({
            document_type: "home_healthcare_agreement",
            method,
            payload: requestPayload,
          }),
        }
      );

      setSessionId(res.session_id);
      setStatus(res.verification_status || "pending");
      if (res.provider_result?.otp_debug_code) {
        setDebugOtp(res.provider_result.otp_debug_code);
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const verifyAndGeneratePdf = async () => {
    if (!sessionId) {
      setMessage("Start a signature session first.");
      return;
    }

    setMessage("");
    try {
      const verifyPayload: Record<string, unknown> = {};
      if (selectedMethod === "SMS_OTP") {
        verifyPayload.otp_code = otpCode;
      }
      if (selectedMethod === "TABLET_SIGNATURE") {
        verifyPayload.signature_payload = signaturePayload;
      }
      if (selectedMethod === "NAFATH") {
        verifyPayload.nafath_status = nafathStatus;
      }

      const res = await apiFetch<{ verification_status: string; pdf_path?: string }>(
        `/api/discharge/cases/${caseId}/acknowledgment/${sessionId}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ payload: verifyPayload }),
        }
      );

      setStatus(res.verification_status || "pending");
      if (res.verification_status === "verified") {
        setMessage(`PDF generated and attached to case. ${res.pdf_path || ""}`.trim());
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const captureTabletSignature = async () => {
    setSelectedMethod("TABLET_SIGNATURE");
    await startAgreement("TABLET_SIGNATURE");
    if (!signaturePayload.trim()) {
      setMessage("Paste a Base64 signature payload, then click Generate PDF.");
    }
  };

  return (
    <AuthGuard>
      <AppShell
        title="Acknowledgment & Informed Consent"
        subtitle="Home Health Care (HHC) - Private Duty Nursing (PDN) - Caregiver Training"
        actions={
          <Link href={`/cases/${caseId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Back to case
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Post-Discharge Care Model</h2>
            <div className="mt-3 grid gap-2">
              {careModels.map((model) => (
                <label key={model.value} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{model.label}</span>
                  <input
                    type="radio"
                    name="care-model"
                    checked={careModel === model.value}
                    onChange={() => void selectCareModel(model.value)}
                  />
                </label>
              ))}
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">Patient and Guardian Details</h3>
            <div className="mt-2 grid gap-2">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="URN / MRN" value={urn} onChange={(e) => setUrn(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Current Location" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Room Number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Legal Guardian" value={legalGuardian} onChange={(e) => setLegalGuardian(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Guardian ID" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">Signature Method</h3>
            <div className="mt-2 grid gap-2">
              {methods.map((item) => (
                <label key={item.method} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{item.method}</span>
                  <input
                    type="radio"
                    name="signature-method"
                    checked={selectedMethod === item.method}
                    disabled={!item.available}
                    onChange={() => setSelectedMethod(item.method)}
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 grid gap-2">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Phone number for OTP" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="OTP code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
              <textarea
                className="rounded-lg border px-3 py-2 text-sm"
                rows={4}
                placeholder="Tablet signature payload (Base64)"
                value={signaturePayload}
                onChange={(e) => setSignaturePayload(e.target.value)}
              />
              <select value={nafathStatus} onChange={(e) => setNafathStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="pending">Nafath Pending</option>
                <option value="approved">Nafath Approved</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("SMS_OTP");
                  void startAgreement("SMS_OTP");
                }}
                disabled={!isHomecareSelected}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Send OTP
              </button>
              <button
                type="button"
                onClick={() => void captureTabletSignature()}
                disabled={!isHomecareSelected}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Capture Tablet Signature
              </button>
              <button
                type="button"
                onClick={() => void verifyAndGeneratePdf()}
                disabled={!isHomecareSelected}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              >
                Generate PDF
              </button>
            </div>

            {fallbackMode ? <p className="mt-2 text-xs text-amber-700">Fallback mode: OTP stub is available if external SMS/Nafath is not configured.</p> : null}
            {debugOtp ? <p className="mt-1 text-xs text-slate-500">Dev OTP: {debugOtp}</p> : null}
            <p className="mt-2 text-sm text-slate-700">Status: {status}</p>
            {sessionId ? <p className="text-xs text-slate-500">Session: {sessionId}</p> : null}
            {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Agreement Preview</h2>
            <div className="mt-3 max-h-[760px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {isHomecareSelected ? (
                previewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="text-sm text-slate-500">Loading...</p>
                )
              ) : (
                <p className="text-sm text-slate-500">Select Home Health Care Agreement to activate this workflow.</p>
              )}
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
