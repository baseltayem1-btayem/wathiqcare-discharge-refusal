"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";
import { apiFetch } from "@/utils/api";

type MethodItem = {
  method: "TABLET_SIGNATURE" | "EMAIL_NOTICE";
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
  const searchParams = useSearchParams();
  const caseId = params?.id || "";
  const requestedMethod = searchParams.get("method");
  const mobileLinked = searchParams.get("mobile_link") === "1";

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("pending");

  const [careModels, setCareModels] = useState<CareModel[]>([]);
  const [careModel, setCareModel] = useState(HOME_HEALTHCARE_MODEL);

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<MethodItem["method"]>("TABLET_SIGNATURE");

  const [patientName, setPatientName] = useState("");
  const [urn, setUrn] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [legalGuardian, setLegalGuardian] = useState("");
  const [relationship, setRelationship] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const [ackHomecareProvision, setAckHomecareProvision] = useState("");
  const [ackDischargeDecisionNotice, setAckDischargeDecisionNotice] = useState("");

  const [patientEmail, setPatientEmail] = useState("");

  const [signaturePayload, setSignaturePayload] = useState("");
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
      ack_homecare_provision: ackHomecareProvision,
      ack_discharge_decision_notice: ackDischargeDecisionNotice,
      date: new Date().toISOString().slice(0, 10),
      case_id: caseId,
      verification_method: selectedMethod,
    }),
    [
      patientName,
      urn,
      currentLocation,
      roomNumber,
      legalGuardian,
      relationship,
      guardianId,
      ackHomecareProvision,
      ackDischargeDecisionNotice,
      caseId,
      selectedMethod,
    ]
  );

  const isHomecareSelected = careModel === HOME_HEALTHCARE_MODEL;
  const fallbackMode = methods.some((item) => item.method === "EMAIL_NOTICE" && item.available);

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
        const availableMethods = res.methods || [];
        const preferredTablet = requestedMethod === "TABLET_SIGNATURE"
          ? availableMethods.find((item) => item.method === "TABLET_SIGNATURE" && item.available)
          : null;
        const firstAvailable = availableMethods.find((item) => item.available);
        if (preferredTablet) {
          setSelectedMethod("TABLET_SIGNATURE");
          if (mobileLinked) {
            setMessage("تم تفعيل وضع توقيع التابلت.");
          }
        } else if (firstAvailable) {
          setSelectedMethod(firstAvailable.method);
        }
      })
      .catch((err: Error) => setMessage(err.message));
  }, [caseId, mobileLinked, requestedMethod]);

  useEffect(() => {
    if (!caseId || !isHomecareSelected) {
      return;
    }

    queueMicrotask(() => setPreviewLoading(true));
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
      .catch((err: Error) => {
        setPreviewHtml("");
        setMessage(err.message);
      })
      .finally(() => {
        setPreviewLoading(false);
      });
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
        setMessage("يتم تفعيل اتفاقية الرعاية المنزلية فقط عند اختيار الخيار الثالث.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const startAgreement = async (method: MethodItem["method"]) => {
    setMessage("");
    try {
      const requestPayload: Record<string, unknown> = { ...payload };
      if (method === "EMAIL_NOTICE") {
        requestPayload.email = patientEmail;
      }

      const res = await apiFetch<{
        session_id: string;
        verification_status: string;
        provider_result?: { delivery_status?: string | null };
      }>(
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
      if (res.verification_status === "notification_sent" && res.provider_result?.delivery_status === "sent") {
        setMessage("تم إرسال إشعار للمريض عبر البريد الإلكتروني.");
      } else if (res.verification_status === "notification_sent") {
        setMessage("تم تسجيل إشعار البريد، وجار التحقق من حالة التسليم.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const verifyAndGeneratePdf = async () => {
    if (!sessionId) {
      setMessage("ابدأ جلسة التوقيع أولًا.");
      return;
    }

    setMessage("");
    try {
      const verifyPayload: Record<string, unknown> = {};
      if (selectedMethod === "TABLET_SIGNATURE") {
        verifyPayload.signature_payload = signaturePayload;
      }

      const res = await apiFetch<{ verification_status: string; pdf_path?: string; delivery_status?: string | null }>(
        `/api/discharge/cases/${caseId}/acknowledgment/${sessionId}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ payload: verifyPayload }),
        }
      );

      setStatus(res.verification_status || "pending");
      if (res.verification_status === "verified") {
        setMessage(`تم إنشاء ملف PDF وإرفاقه بالحالة. ${res.pdf_path || ""}`.trim());
      } else if (res.verification_status === "notification_sent" && res.delivery_status === "sent") {
        setMessage("تم إرسال إشعار للمريض عبر البريد الإلكتروني.");
      } else if (res.verification_status === "notification_sent") {
        setMessage("تم تسجيل إشعار البريد، وجار التحقق من حالة التسليم.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const captureTabletSignature = async () => {
    setSelectedMethod("TABLET_SIGNATURE");
    await startAgreement("TABLET_SIGNATURE");
    if (!signaturePayload.trim()) {
      setMessage("ألصق بيانات التوقيع بصيغة Base64 ثم اضغط على إنشاء PDF.");
    }
  };

  return (
    <AuthGuard>
      <AppShell
        title="إقرار وموافقة مستنيرة"
        subtitle="الرعاية الصحية المنزلية - التمريض الخاص - تدريب مقدم الرعاية"
        actions={
          <Link href={`/cases/${caseId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            العودة إلى الحالة
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">نموذج الرعاية بعد الخروج</h2>
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

            <h3 className="mt-4 text-sm font-semibold text-slate-800">بيانات المريض وولي الأمر</h3>
            <div className="mt-2 grid gap-2">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="اسم المريض" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="URN / MRN" value={urn} onChange={(e) => setUrn(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="الموقع الحالي" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="رقم الغرفة" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="ولي الأمر" value={legalGuardian} onChange={(e) => setLegalGuardian(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="صلة القرابة" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="رقم هوية ولي الأمر" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">إقرارات المريض</h3>
            <div className="mt-2 grid gap-2">
              <label className="text-xs font-medium text-slate-600">إقرار المريض / ولي الأمر بخدمات الرعاية المنزلية</label>
              <select
                value={ackHomecareProvision}
                onChange={(e) => setAckHomecareProvision(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">اختر</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
              </select>

              <label className="text-xs font-medium text-slate-600">إبلاغ المريض / ولي الأمر بقرار الخروج الطبي</label>
              <select
                value={ackDischargeDecisionNotice}
                onChange={(e) => setAckDischargeDecisionNotice(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">اختر</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
              </select>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">طريقة التوقيع</h3>
            <div className="mt-2 grid gap-2">
              {methods.map((item) => (
                <label key={item.method} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{item.label_ar || item.method}</span>
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
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="البريد الإلكتروني للمريض" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} />
              <textarea
                className="hidden"
                rows={1}
                value={signaturePayload}
                readOnly
              />
              <TabletSignaturePad value={signaturePayload} onChange={setSignaturePayload} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("EMAIL_NOTICE");
                  void startAgreement("EMAIL_NOTICE");
                }}
                disabled={!isHomecareSelected}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                إرسال إشعار البريد
              </button>
              <button
                type="button"
                onClick={() => void captureTabletSignature()}
                disabled={!isHomecareSelected}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                التقاط توقيع الجهاز اللوحي
              </button>
              <button
                type="button"
                onClick={() => void verifyAndGeneratePdf()}
                disabled={!isHomecareSelected}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              >
                إنشاء PDF
              </button>
            </div>

            {fallbackMode ? <p className="mt-2 text-xs text-amber-700">يمكن إرسال إشعار للمريض عبر البريد الإلكتروني كبديل عن التوقيع الفوري.</p> : null}
            <p className="mt-2 text-sm text-slate-700">الحالة: {status}</p>
            {sessionId ? <p className="text-xs text-slate-500">معرّف الجلسة: {sessionId}</p> : null}
            {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">معاينة الاتفاقية</h2>
            <div className="mt-3 max-h-[760px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {isHomecareSelected ? (
                previewLoading ? (
                  <p className="text-sm text-slate-500">جار التحميل...</p>
                ) : previewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : message ? (
                  <p className="text-sm text-rose-700">فشل تحميل معاينة الاتفاقية: {message}</p>
                ) : (
                  <p className="text-sm text-slate-500">معاينة الاتفاقية غير متاحة بعد.</p>
                )
              ) : (
                <p className="text-sm text-slate-500">اختر اتفاقية الرعاية الصحية المنزلية لتفعيل هذا المسار.</p>
              )}
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
