"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Save, Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";

type CreateCaseResponse = {
    id: string;
};

type MedicalCondition =
    | "Diabetes"
    | "Hypertension"
    | "Heart Disease"
    | "Lung Disease"
    | "Cancer"
    | "Kidney Disease"
    | "Other";

const MEDICAL_CONDITIONS: Array<{ value: MedicalCondition; ar: string; en: string }> = [
    { value: "Diabetes", ar: "السكري", en: "Diabetes" },
    { value: "Hypertension", ar: "ارتفاع ضغط الدم", en: "Hypertension" },
    { value: "Heart Disease", ar: "أمراض القلب", en: "Heart Disease" },
    { value: "Lung Disease", ar: "أمراض الرئة", en: "Lung Disease" },
    { value: "Cancer", ar: "السرطان", en: "Cancer" },
    { value: "Kidney Disease", ar: "أمراض الكلى", en: "Kidney Disease" },
    { value: "Other", ar: "أخرى", en: "Other" },
];

export default function NewCasePage() {
    const router = useRouter();
    const { t, lang } = useI18n();

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [patientName, setPatientName] = useState("");
    const [patientIdNumber, setPatientIdNumber] = useState("");
    const [medicalRecordNo, setMedicalRecordNo] = useState("");
    const [attendingPhysician, setAttendingPhysician] = useState("");
    const [roomNumber, setRoomNumber] = useState("");
    const [admissionDate, setAdmissionDate] = useState("");
    const [admissionDepartment, setAdmissionDepartment] = useState("");

    const [sendDischargeOrderRequest, setSendDischargeOrderRequest] = useState(true);

    const [dateOfBirth, setDateOfBirth] = useState("");
    const [primaryMobile, setPrimaryMobile] = useState("");
    const [email, setEmail] = useState("");
    const [gender, setGender] = useState("");
    const [homeAddress, setHomeAddress] = useState("");
    const [streetName, setStreetName] = useState("");
    const [cityName, setCityName] = useState("");
    const [districtName, setDistrictName] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [poBox, setPoBox] = useState("");
    const [admissionReason, setAdmissionReason] = useState("");
    const [medicalCondition, setMedicalCondition] = useState<MedicalCondition | "">("");

    const [preferredLanguage, setPreferredLanguage] = useState("");
    const [livingAlone, setLivingAlone] = useState("");
    const [hasCaregiver, setHasCaregiver] = useState("");
    const [dischargeDate, setDischargeDate] = useState("");
    const [preferredDestination, setPreferredDestination] = useState("");
    const [additionalInstructions, setAdditionalInstructions] = useState("");

    const [medicationInstructions, setMedicationInstructions] = useState("");
    const [followupAppointment, setFollowupAppointment] = useState("");
    const [contactInfoAfterDischarge, setContactInfoAfterDischarge] = useState("");

    const [dischargePlanType, setDischargePlanType] = useState<"outpatient_followup" | "homecare_risk">("outpatient_followup");

    const [notifySectionsByEmail, setNotifySectionsByEmail] = useState(true);
    const [signatureMethod, setSignatureMethod] = useState<"email" | "nafez" | "tablet">("email");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccessMessage("");

        try {
            const metadata = {
                patient_name: patientName,
                patient_id_number: patientIdNumber,
                medical_record_number: medicalRecordNo,
                attending_physician: attendingPhysician,
                room_number: roomNumber,
                admission_date: admissionDate,
                admission_department: admissionDepartment,

                discharge_order_request: {
                    requested: sendDischargeOrderRequest,
                    status: sendDischargeOrderRequest ? "pending_physician" : "not_requested",
                },

                discharge_plan: {
                    patient_name: patientName,
                    date_of_birth: dateOfBirth,
                    primary_mobile: primaryMobile,
                    email,
                    gender,
                    home_address: homeAddress,
                    street_name: streetName,
                    city_name: cityName,
                    district_name: districtName,
                    postal_code: postalCode,
                    po_box: poBox,
                    hospital_admission_reason: admissionReason,
                    current_medical_condition: medicalCondition,
                    preferred_language: preferredLanguage,
                    is_living_alone: livingAlone,
                    has_caregiver: hasCaregiver,
                    date_of_discharge: dischargeDate,
                    preferred_discharge_destination: preferredDestination,
                    additional_comments_or_instructions: additionalInstructions,
                    discharge_instructions: {
                        medication_usage: medicationInstructions,
                        followup_appointment: followupAppointment,
                        contact_information: contactInfoAfterDischarge,
                    },
                    discharge_route: dischargePlanType,
                },

                workflow_stages: [
                    "medical_assessment",
                    "legal_capacity_check",
                    "authorized_signatory_identification",
                    "discharge_plan_preparation",
                    "forms_and_consent_presentation",
                    "approval_or_refusal_path",
                    "legal_escalation_if_needed",
                    "final_verification",
                    "execute_discharge_or_hold",
                ],

                forms_catalog: [
                    "discharge_plan",
                    "discharge_instructions",
                    "patient_pickup_acknowledgment",
                    "discharge_approval",
                    "discharge_refusal",
                    "refusal_to_receive_patient",
                    "no_caregiver_acknowledgment",
                    "treatment_or_transfer_refusal",
                    "risk_acknowledgment",
                    "medical_education_acknowledgment",
                    "minor_guardian_form",
                ],

                notifications: {
                    enabled: notifySectionsByEmail,
                    channels: {
                        email: notifySectionsByEmail,
                        nafez_signature_optional: signatureMethod === "nafez",
                        tablet_signature_optional: signatureMethod === "tablet",
                    },
                    note: "Email is primary. Signature channels are optional and non-blocking.",
                },
            };

            const created = await apiFetch<CreateCaseResponse>("/api/cases", {
                method: "POST",
                body: JSON.stringify({
                    caseType: "DISCHARGE_REFUSAL",
                    workflowType: "discharge_planning",
                    title: `Discharge plan - ${patientName}`,
                    patientName,
                    patientIdNumber,
                    medicalRecordNo,
                    roomNumber,
                    metadata,
                }),
            });

            setSuccessMessage(t("newCase.successCreated"));
            router.push(`/cases/${created.id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : t("newCase.failedCreate");
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
                title={t("newCase.pageTitle")}
                subtitle={t("newCase.pageSubtitle")}
                actions={
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("newCase.backDashboard")}
                    </Link>
                }
            >
                {error ? (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : null}

                {successMessage ? (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {successMessage}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">{t("newCase.sections.registrationTitle")}</h2>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <input required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder={t("field.patientName")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={patientIdNumber} onChange={(e) => setPatientIdNumber(e.target.value)} placeholder={t("field.idIqama")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={medicalRecordNo} onChange={(e) => setMedicalRecordNo(e.target.value)} placeholder={t("field.patientMrn")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={attendingPhysician} onChange={(e) => setAttendingPhysician(e.target.value)} placeholder={t("field.attendingPhysician")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder={t("field.roomNumber")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={admissionDepartment} onChange={(e) => setAdmissionDepartment(e.target.value)} placeholder={t("newCase.placeholders.admissionDepartment")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                        </div>

                        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={sendDischargeOrderRequest}
                                onChange={(e) => setSendDischargeOrderRequest(e.target.checked)}
                            />
                            {t("newCase.labels.sendDischargeOrderRequest")}
                        </label>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">{t("newCase.sections.planTitle")}</h2>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <input required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder={t("newCase.placeholders.dateOfBirth")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={primaryMobile} onChange={(e) => setPrimaryMobile(e.target.value)} placeholder={t("newCase.placeholders.primaryMobile")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("newCase.placeholders.email")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder={t("newCase.placeholders.gender")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} placeholder={t("newCase.placeholders.homeAddress")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                            <input value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder={t("newCase.placeholders.streetName")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder={t("newCase.placeholders.cityName")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={districtName} onChange={(e) => setDistrictName(e.target.value)} placeholder={t("newCase.placeholders.districtName")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t("newCase.placeholders.postalCode")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={poBox} onChange={(e) => setPoBox(e.target.value)} placeholder={t("newCase.placeholders.poBox")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input required value={admissionReason} onChange={(e) => setAdmissionReason(e.target.value)} placeholder={t("newCase.placeholders.admissionReason")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />

                            <label className="text-xs text-slate-600">{t("newCase.labels.medicalCondition")}</label>
                            <select required value={medicalCondition} onChange={(e) => setMedicalCondition(e.target.value as MedicalCondition)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                                <option value="">{t("newCase.select.pleaseSelect")}</option>
                                {MEDICAL_CONDITIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{lang === "ar" ? option.ar : option.en}</option>
                                ))}
                            </select>

                            <label className="text-xs text-slate-600">{t("newCase.labels.preferredLanguage")}</label>
                            <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                                <option value="">{t("newCase.select.pleaseSelect")}</option>
                                <option value="ar">{t("newCase.select.arabic")}</option>
                                <option value="en">{t("newCase.select.english")}</option>
                            </select>

                            <label className="text-xs text-slate-600">{t("newCase.labels.livingAlone")}</label>
                            <select value={livingAlone} onChange={(e) => setLivingAlone(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                                <option value="">{t("newCase.select.pleaseSelect")}</option>
                                <option value="yes">{t("newCase.select.yes")}</option>
                                <option value="no">{t("newCase.select.no")}</option>
                            </select>

                            <label className="text-xs text-slate-600">{t("newCase.labels.hasCaregiver")}</label>
                            <select value={hasCaregiver} onChange={(e) => setHasCaregiver(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
                                <option value="">{t("newCase.select.pleaseSelect")}</option>
                                <option value="yes">{t("newCase.select.yes")}</option>
                                <option value="no">{t("newCase.select.no")}</option>
                            </select>

                            <label className="text-xs text-slate-600">{t("newCase.labels.dischargeDate")}</label>
                            <input value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} placeholder={t("newCase.placeholders.dischargeDateFormat")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />

                            <input value={preferredDestination} onChange={(e) => setPreferredDestination(e.target.value)} placeholder={t("newCase.placeholders.preferredDestination")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                            <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} placeholder={t("newCase.placeholders.additionalInstructions")} className="h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">{t("newCase.sections.instructionsTitle")}</h2>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <textarea value={medicationInstructions} onChange={(e) => setMedicationInstructions(e.target.value)} placeholder={t("newCase.placeholders.medicationInstructions")} className="h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <input value={followupAppointment} onChange={(e) => setFollowupAppointment(e.target.value)} placeholder={t("newCase.placeholders.followupAppointment")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <textarea value={contactInfoAfterDischarge} onChange={(e) => setContactInfoAfterDischarge(e.target.value)} placeholder={t("newCase.placeholders.contactInfoAfterDischarge")} className="h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">{t("newCase.sections.routeTitle")}</h2>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <input
                                    type="radio"
                                    name="discharge_plan_type"
                                    checked={dischargePlanType === "outpatient_followup"}
                                    onChange={() => setDischargePlanType("outpatient_followup")}
                                />
                                {t("newCase.dischargePlanType.outpatientFollowup")}
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <input
                                    type="radio"
                                    name="discharge_plan_type"
                                    checked={dischargePlanType === "homecare_risk"}
                                    onChange={() => setDischargePlanType("homecare_risk")}
                                />
                                {t("newCase.dischargePlanType.homecareRisk")}
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-sm font-semibold text-slate-900">{t("newCase.sections.notificationTitle")}</h2>
                        <div className="mt-3 space-y-3">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={notifySectionsByEmail}
                                    onChange={(e) => setNotifySectionsByEmail(e.target.checked)}
                                />
                                {t("newCase.notification.emailPrimary")}
                            </label>

                            <label className="block text-xs font-medium text-slate-600">{t("newCase.labels.signatureOptional")}</label>
                            <select
                                value={signatureMethod}
                                onChange={(e) => setSignatureMethod(e.target.value as "email" | "nafez" | "tablet")}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                                <option value="email">{t("newCase.signatureMethod.email")}</option>
                                <option value="nafez">{t("newCase.signatureMethod.nafez")}</option>
                                <option value="tablet">{t("newCase.signatureMethod.tablet")}</option>
                            </select>
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? t("newCase.saving") : t("newCase.actions.submit")}
                        </button>

                        <button
                            type="button"
                            onClick={() => setSendDischargeOrderRequest(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                        >
                            <Send className="h-4 w-4" />
                            {t("newCase.actions.resendOrder")}
                        </button>

                        <button
                            type="button"
                            onClick={() => setNotifySectionsByEmail(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                            <Mail className="h-4 w-4" />
                            {t("newCase.actions.enableEmailDelivery")}
                        </button>

                        <Link
                            href="/dashboard"
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
