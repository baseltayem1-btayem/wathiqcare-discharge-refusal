"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, FileText, ShieldCheck } from "lucide-react";

import { apiFetch } from "@/utils/api";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";

type PageProps = {
    params: Promise<{ token: string }>;
};

type ViewState = "loading" | "valid" | "expired" | "revoked" | "invalid" | "submitted";

type PublicSecureCase = {
    link_id: string;
    hospital_name?: string | null;
    case_id: string;
    case_reference: string;
    patient_name?: string | null;
    discharge_summary?: string | null;
    legal_notice: string;
    expires_at: string;
    accessed_at?: string | null;
    decision_type?: "accept" | "refuse" | null;
    decision_name?: string | null;
    decision_submitted_at?: string | null;
    has_home_care_agreement?: boolean;
    home_care_agreement_text?: string | null;
    has_equipment_acknowledgment?: boolean;
    equipment_acknowledgment_text?: string | null;
    [key: string]: unknown;
};

type SubmitDecisionResponse = {
    hospital_name?: string | null;
    case_id: string;
    case_reference: string;
    decision_type: "accept" | "refuse";
    typed_name: string;
    submitted_at: string;
    confirmation_message: string;
};

type SubmitDecisionPayload = {
    decision: "accept" | "refuse";
    typed_name: string;
    refusal_acknowledged: boolean;
    signature_data: string;
    otp_code: string;
};

type OtpResponse = {
    success: boolean;
    delivery_status: "sent" | "failed" | "not_configured";
    failure_reason?: string | null;
    masked_email: string;
};

type OtpVerifyResponse = {
    success: boolean;
    verified: boolean;
    attempts_remaining: number;
};

function formatDate(value?: string | null): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function getErrorState(message: string): ViewState {
    if (message.includes("410") || message.includes("انتهت صلاحية")) {
        return "expired";
    }
    if (message.includes("تم إلغاء")) {
        return "revoked";
    }
    return "invalid";
}

function getOptionalText(payload: PublicSecureCase | null, keys: string[]): string | null {
    if (!payload) {
        return null;
    }

    for (const key of keys) {
        const value = payload[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function StatusPanel({ state, message }: { state: Exclude<ViewState, "valid" | "submitted">; message: string }) {
    const config = {
        loading: {
            icon: <CircleDashed className="h-6 w-6 animate-spin text-cyan-700" />,
            title: "جارٍ التحقق من الرابط الآمن",
            body: "يتم تحميل بيانات القرار الآن. الرجاء الانتظار للحظات.",
            tone: "border-cyan-200 bg-cyan-50 text-cyan-900",
        },
        expired: {
            icon: <AlertTriangle className="h-6 w-6 text-amber-700" />,
            title: "انتهت صلاحية الرابط",
            body: "هذه الجلسة لم تعد صالحة. يرجى التواصل مع المستشفى لطلب رابط جديد.",
            tone: "border-amber-200 bg-amber-50 text-amber-900",
        },
        revoked: {
            icon: <AlertTriangle className="h-6 w-6 text-rose-700" />,
            title: "تم إلغاء الرابط",
            body: "تم إيقاف هذا الرابط من قبل المستشفى. يرجى التواصل مع الفريق المختص إذا كنتم بحاجة إلى متابعة الحالة.",
            tone: "border-rose-200 bg-rose-50 text-rose-900",
        },
        invalid: {
            icon: <AlertTriangle className="h-6 w-6 text-slate-700" />,
            title: "الرابط غير صالح",
            body: "تعذر التحقق من الرابط المرسل. يرجى التأكد من فتح الرابط كاملًا كما وصلكم من المستشفى.",
            tone: "border-slate-200 bg-slate-50 text-slate-900",
        },
    }[state];

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#eff8fb_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-xl">
                <section className={`rounded-[28px] border p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 ${config.tone}`}>
                    <div className="mb-4 flex items-center gap-3">{config.icon}<span className="text-xs font-semibold uppercase tracking-[0.18em]">WathiqCare</span></div>
                    <h1 className="text-2xl font-bold">{config.title}</h1>
                    <p className="mt-3 text-sm leading-7">{config.body}</p>
                    {state !== "loading" ? <p className="mt-4 text-xs opacity-80">{message.replace(/^\d+:/, "").trim()}</p> : null}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/" className="rounded-2xl border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                            العودة للصفحة الرئيسية
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}

function SecureDecisionClient({ token }: { token: string }) {
    const [viewState, setViewState] = useState<ViewState>("loading");
    const [caseData, setCaseData] = useState<PublicSecureCase | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [decision, setDecision] = useState<"accept" | "refuse" | null>(null);
    const [typedName, setTypedName] = useState("");
    const [signatureData, setSignatureData] = useState("");
    const [refusalAcknowledged, setRefusalAcknowledged] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<SubmitDecisionResponse | null>(null);
    const [otpCode, setOtpCode] = useState("");
    const [otpMaskedEmail, setOtpMaskedEmail] = useState("");
    const [isOtpRequested, setIsOtpRequested] = useState(false);
    const [isOtpRequesting, setIsOtpRequesting] = useState(false);
    const [isOtpVerifying, setIsOtpVerifying] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [otpAttemptsRemaining, setOtpAttemptsRemaining] = useState(3);
    const hasInitializedTypedName = useRef(false);

    function hasValidSignature(value: string): boolean {
        const normalized = value.trim();
        const prefix = "data:image/png;base64,";
        return normalized.startsWith(prefix) && normalized.length > prefix.length + 32;
    }

    useEffect(() => {
        let cancelled = false;

        async function loadToken(): Promise<void> {
            setViewState("loading");
            setErrorMessage("");
            setSubmitError("");
            setIsSubmitting(false);
            setSubmitted(null);
            setCaseData(null);
            setDecision(null);
            setRefusalAcknowledged(false);
            setSignatureData("");
            setTypedName("");
            hasInitializedTypedName.current = false;

            try {
                const payload = await apiFetch<PublicSecureCase>(`/api/discharge/secure/${encodeURIComponent(token)}`);
                if (cancelled) {
                    return;
                }

                setCaseData(payload);
                if (!hasInitializedTypedName.current) {
                    setTypedName(payload.patient_name ?? "");
                    hasInitializedTypedName.current = true;
                }

                if (payload.decision_submitted_at && payload.decision_type) {
                    setSubmitted({
                        hospital_name: payload.hospital_name,
                        case_id: payload.case_id,
                        case_reference: payload.case_reference,
                        decision_type: payload.decision_type,
                        typed_name: payload.decision_name ?? payload.patient_name ?? "",
                        submitted_at: payload.decision_submitted_at,
                        confirmation_message:
                            payload.decision_type === "accept"
                                ? "تم تسجيل موافقتكم على الخروج مسبقًا."
                                : "تم تسجيل رفضكم للخروج مسبقًا وتوثيق الإقرار القانوني.",
                    });
                    setViewState("submitted");
                    return;
                }

                setViewState("valid");
            } catch (error) {
                if (cancelled) {
                    return;
                }
                const message = error instanceof Error ? error.message : "تعذر تحميل الرابط الآمن";
                setErrorMessage(message);
                setViewState(getErrorState(message));
            }
        }

        void loadToken();

        return () => {
            cancelled = true;
        };
    }, [token]);

    async function handleRequestOtp() {
        if (isOtpRequesting || isOtpVerified) {
            return;
        }
        setIsOtpRequesting(true);
        setOtpError("");
        try {
            const response = await apiFetch<OtpResponse>(
                `/api/discharge/secure/${encodeURIComponent(token)}/otp`,
                { method: "POST" },
            );
            setOtpMaskedEmail(response.masked_email);
            setIsOtpRequested(true);
            setOtpCode("");
        } catch (error) {
            const message = error instanceof Error ? error.message.replace(/^\d+:/, "").trim() : "تعذر طلب رمز التحقق.";
            setOtpError(message);
        } finally {
            setIsOtpRequesting(false);
        }
    }

    async function handleVerifyOtp() {
        if (isOtpVerifying || isOtpVerified) {
            return;
        }
        const code = otpCode.trim();
        if (code.length < 6) {
            setOtpError("يرجى إدخال رمز التحقق المؤلف من 6 أرقام.");
            return;
        }
        setIsOtpVerifying(true);
        setOtpError("");
        try {
            const response = await apiFetch<OtpVerifyResponse>(
                `/api/discharge/secure/${encodeURIComponent(token)}/verify-otp`,
                {
                    method: "POST",
                    body: JSON.stringify({ otp_code: code }),
                },
            );
            if (response.verified) {
                setIsOtpVerified(true);
                setOtpAttemptsRemaining(response.attempts_remaining);
            } else {
                setOtpAttemptsRemaining(response.attempts_remaining);
                setOtpError(`رمز التحقق غير صحيح. المحاولات المتبقية: ${response.attempts_remaining}`);
                setOtpCode("");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message.replace(/^\d+:/, "").trim() : "تعذر التحقق من الرمز.";
            setOtpError(message);
        } finally {
            setIsOtpVerifying(false);
        }
    }

    async function handleSubmit() {
        if (isSubmitting) {
            return;
        }

        const normalizedTypedName = typedName.trim();
        const normalizedSignature = signatureData.trim();

        if (!decision) {
            setSubmitError("يرجى اختيار القرار المطلوب.");
            return;
        }
        if (normalizedTypedName.length < 3) {
            setSubmitError("يرجى كتابة الاسم الكامل كما سيظهر في الإقرار.");
            return;
        }
        if (!hasValidSignature(normalizedSignature)) {
            setSubmitError("يرجى التوقيع في خانة التوقيع قبل تسجيل القرار.");
            return;
        }
        if (decision === "refuse" && !refusalAcknowledged) {
            setSubmitError("يجب تأكيد الإقرار القانوني قبل تسجيل الرفض.");
            return;
        }
        if (!isOtpVerified) {
            setSubmitError("يرجى التحقق من الهوية باستخدام رمز التحقق المرسل قبل تسجيل القرار.");
            return;
        }

        const submitPayload: SubmitDecisionPayload = {
            decision,
            typed_name: normalizedTypedName,
            refusal_acknowledged: refusalAcknowledged,
            signature_data: normalizedSignature,
            otp_code: otpCode.trim(),
        };

        setIsSubmitting(true);
        setSubmitError("");

        try {
            const response = await apiFetch<SubmitDecisionResponse>(
                `/api/discharge/secure/${encodeURIComponent(token)}/decision`,
                {
                    method: "POST",
                    body: JSON.stringify(submitPayload),
                },
            );
            setSubmitted(response);
            setViewState("submitted");
        } catch (error) {
            const message = error instanceof Error ? error.message.replace(/^\d+:/, "").trim() : "تعذر تسجيل القرار.";
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (viewState === "loading" || viewState === "expired" || viewState === "revoked" || viewState === "invalid") {
        return <StatusPanel state={viewState} message={errorMessage} />;
    }

    if (viewState === "submitted" && submitted) {
        return (
            <main className="min-h-screen bg-[linear-gradient(180deg,#eff8fb_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-10">
                <div className="mx-auto max-w-xl">
                    <section className="overflow-hidden rounded-[30px] border border-emerald-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
                        <div className="bg-[linear-gradient(135deg,#065f46_0%,#0f766e_45%,#0891b2_100%)] px-5 py-6 text-white sm:px-7">
                            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/90">تم التأكيد</p>
                            <h1 className="mt-2 text-2xl font-bold">{submitted.confirmation_message}</h1>
                            <p className="mt-2 text-sm text-cyan-50">تم حفظ الإقرار بنجاح وإرسال التوثيق إلى سجل الحالة.</p>
                        </div>

                        <div className="space-y-4 p-5 sm:p-7">
                            <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">المنشأة</span><strong className="text-slate-900">{submitted.hospital_name || "WathiqCare"}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">مرجع الحالة</span><strong className="text-slate-900">{submitted.case_reference}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">الاسم المسجل</span><strong className="text-slate-900">{submitted.typed_name}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">القرار</span><strong className="text-slate-900">{submitted.decision_type === "accept" ? "موافقة على الخروج" : "رفض الخروج"}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">وقت التسجيل</span><strong className="text-slate-900">{formatDate(submitted.submitted_at)}</strong></div>
                            </div>

                            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900">
                                إذا احتجتم إلى تعديل القرار أو لديكم استفسار قانوني أو طبي، يرجى التواصل مباشرة مع المنشأة الصحية عبر القنوات الرسمية.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        );
    }

    const normalizedTypedName = typedName.trim();
    const canSubmit =
        Boolean(decision) &&
        normalizedTypedName.length >= 3 &&
        hasValidSignature(signatureData) &&
        (decision !== "refuse" || refusalAcknowledged) &&
        isOtpVerified;
    const submitButtonDisabled = isSubmitting || !canSubmit;

    const homeCareSummary = getOptionalText(caseData, ["home_care_agreement_text"]);
    const equipmentSummary = getOptionalText(caseData, ["equipment_acknowledgment_text"]);

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#eff8fb_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-xl">
                <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
                    <div className="bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_42%),linear-gradient(135deg,#083344_0%,#0f766e_44%,#164e63_100%)] px-5 py-6 text-white sm:px-7 sm:py-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">رابط إقرار آمن</p>
                                <h1 className="mt-2 text-2xl font-bold leading-tight">قرار الخروج الطبي</h1>
                                <p className="mt-2 max-w-md text-sm leading-7 text-cyan-50/95">
                                    يرجى مراجعة المعلومات التالية ثم اختيار الموافقة أو الرفض. هذه الصفحة مخصصة للمريض أو الممثل النظامي فقط.
                                </p>
                            </div>
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-7">
                        <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">المنشأة</span><strong className="text-slate-900">{caseData?.hospital_name || "WathiqCare"}</strong></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">مرجع الحالة</span><strong className="text-slate-900">{caseData?.case_reference}</strong></div>
                            {caseData?.patient_name ? <div className="flex items-center justify-between gap-3"><span className="text-slate-500">اسم المريض</span><strong className="text-slate-900">{caseData.patient_name}</strong></div> : null}
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">صلاحية الرابط</span><strong className="text-slate-900">{formatDate(caseData?.expires_at)}</strong></div>
                        </div>

                        {caseData?.discharge_summary ? (
                            <section className="rounded-3xl border border-slate-200 p-4">
                                <div className="mb-3 flex items-center gap-2 text-slate-900"><FileText className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-bold">ملخص الخروج</h2></div>
                                <p className="text-sm leading-7 text-slate-700">{caseData.discharge_summary}</p>
                            </section>
                        ) : null}

                        {homeCareSummary ? (
                            <section className="rounded-3xl border border-teal-100 bg-teal-50 p-4">
                                <div className="mb-2 flex items-center gap-2 text-teal-900"><FileText className="h-4 w-4 text-teal-600" /><h2 className="text-sm font-bold">خطة الرعاية المنزلية</h2></div>
                                <p className="text-sm leading-7 text-teal-900">{homeCareSummary}</p>
                                <p className="mt-3 text-xs leading-6 text-teal-800">
                                    يُقر الموقِّع بأنه اطّلع على ترتيبات الرعاية المنزلية المحددة أعلاه، وأنه يتفهم الالتزامات الواجبة على المريض أو وليّ أمره لضمان استمرار الرعاية بعد الخروج.
                                </p>
                            </section>
                        ) : null}

                        {equipmentSummary ? (
                            <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
                                <div className="mb-2 flex items-center gap-2 text-indigo-900"><FileText className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-bold">الأجهزة والمستلزمات الطبية</h2></div>
                                <p className="text-sm leading-7 text-indigo-900">{equipmentSummary}</p>
                                <p className="mt-3 text-xs leading-6 text-indigo-800">
                                    يُقر الموقِّع بأنه استلم الأجهزة أو المستلزمات الطبية المذكورة أعلاه، وتسلّم التعليمات الخاصة بتشغيلها وصيانتها وإجراءات الطوارئ المرتبطة بها.
                                </p>
                            </section>
                        ) : null}

                        <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
                            <h2 className="text-sm font-bold text-cyan-950">الإشعار القانوني</h2>
                            <p className="mt-2 text-sm leading-7 text-cyan-900">{caseData?.legal_notice}</p>
                        </section>

                        <section className="rounded-3xl border border-slate-200 p-4">
                            <h2 className="text-sm font-bold text-slate-900">اختيار القرار</h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setDecision("accept")}
                                    disabled={isSubmitting}
                                    data-testid="decision-accept"
                                    className={`rounded-2xl border px-4 py-4 text-right transition ${decision === "accept" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/60"}`}
                                >
                                    <div className="text-sm font-bold">الموافقة على الخروج</div>
                                    <div className="mt-1 text-xs leading-6 text-slate-600">أُقرّ باستلام قرار الخروج الطبي، واطّلاعي على ملخص الحالة والتعليمات اللازمة، وأوافق على متابعة إجراءات الخروج.</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDecision("refuse")}
                                    disabled={isSubmitting}
                                    data-testid="decision-refuse"
                                    className={`rounded-2xl border px-4 py-4 text-right transition ${decision === "refuse" ? "border-rose-300 bg-rose-50 text-rose-950" : "border-slate-200 bg-white text-slate-800 hover:border-rose-200 hover:bg-rose-50/60"}`}
                                >
                                    <div className="text-sm font-bold">رفض الخروج</div>
                                    <div className="mt-1 text-xs leading-6 text-slate-600">أُقرّ باطّلاعي على القرار الطبي وتوضيح المخاطر والبدائل، وأرغب في رفض الخروج مع قبول المسؤولية القانونية المترتبة على ذلك.</div>
                                </button>
                            </div>

                            {decision === "refuse" ? (
                                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                    <h3 className="mb-2 text-sm font-bold text-rose-950">إقرار قانوني بالرفض</h3>
                                    <p className="text-sm leading-7 text-rose-950">
                                        أُقرّ أنا الموقِّع أدناه بأن الطاقم الطبي قد أوضح لي كامل الأسباب الموجبة لقرار الخروج، والمخاطر الطبية المحتملة الناجمة عن الرفض، والبدائل العلاجية المتاحة. وعلى الرغم من إدراكي الكامل لهذه المعطيات، أُصرّ على رفض الخروج وأتحمل المسؤولية القانونية والطبية الكاملة المترتبة على هذا القرار. يُعدّ هذا الإقرار سارياً وملزماً ومقبولاً بصفته وثيقة رسمية معتمدة بموجب أنظمة المنشآت الصحية المعمول بها في المملكة العربية السعودية.
                                    </p>
                                    <label className="mt-4 flex items-start gap-3 text-sm text-rose-950">
                                        <input
                                            type="checkbox"
                                            checked={refusalAcknowledged}
                                            onChange={(event) => setRefusalAcknowledged(event.target.checked)}
                                            disabled={isSubmitting}
                                            data-testid="refusal-acknowledgment"
                                            className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-700 focus:ring-rose-200"
                                        />
                                        <span>أقرّ بقراءة هذا الإقرار بالكامل وفهم مضمونه، وأوافق على توثيقه رسمياً في السجل الطبي للحالة.</span>
                                    </label>
                                </div>
                            ) : null}

                            <div className="mt-4">
                                <label htmlFor="typed-name" className="mb-2 block text-sm font-medium text-slate-700">الاسم الكامل للمقر</label>
                                <input
                                    id="typed-name"
                                    type="text"
                                    value={typedName}
                                    onChange={(event) => setTypedName(event.target.value)}
                                    placeholder="اكتب الاسم الكامل"
                                    disabled={isSubmitting}
                                    data-testid="typed-name-input"
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                                />
                            </div>

                            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                                <h3 className="mb-2 text-sm font-bold text-cyan-950">التحقق من الهوية</h3>
                                <p className="text-sm leading-7 text-cyan-900">
                                    لحماية خصوصية المريض، يجب إدخال رمز التحقق المرسل إلى بريد {otpMaskedEmail || "المسجل"}.
                                </p>

                                {!isOtpRequested ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleRequestOtp()}
                                        disabled={isOtpRequesting}
                                        className="mt-3 inline-flex items-center justify-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isOtpRequesting ? "جارٍ إرسال الرمز..." : "إرسال رمز التحقق"}
                                    </button>
                                ) : (
                                    <div className="mt-3">
                                        {!isOtpVerified ? (
                                            <>
                                                <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-cyan-950">رمز التحقق (6 أرقام)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        id="otp-code"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={6}
                                                        value={otpCode}
                                                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                                                        placeholder="123456"
                                                        disabled={isOtpVerifying}
                                                        data-testid="otp-code-input"
                                                        className="w-full rounded-xl border border-cyan-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleVerifyOtp()}
                                                        disabled={isOtpVerifying || otpCode.trim().length < 6}
                                                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isOtpVerifying ? "جارٍ التحقق..." : "تحقق"}
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRequestOtp()}
                                                    disabled={isOtpRequesting}
                                                    className="mt-2 text-xs font-medium text-cyan-800 underline transition hover:text-cyan-950 disabled:opacity-60"
                                                >
                                                    لم يصل الرمز؟ إعادة الإرسال
                                                </button>
                                            </>
                                        ) : (
                                            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                                <CheckCircle2 className="h-4 w-4" />
                                                تم التحقق من الهوية بنجاح
                                            </p>
                                        )}
                                        {otpError ? <p className="mt-2 text-xs text-rose-700">{otpError}</p> : null}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-sm font-medium text-slate-700">التوقيع الإلكتروني <span className="text-rose-600">*</span></label>
                                <TabletSignaturePad
                                    value={signatureData}
                                    onChange={setSignatureData}
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-slate-500">التوقيع مطلوب لإتمام الإقرار. وقّع باستخدام الإصبع أو القلم الرقمي.</p>
                            </div>

                            {submitError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{submitError}</p> : null}

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={submitButtonDisabled}
                                data-testid="secure-final-submit"
                                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(120deg,#0f766e,#0891b2,#06b6d4)] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(8,145,178,0.24)] transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "جارٍ تسجيل القرار..." : decision === "refuse" ? "تأكيد وتسجيل رفض الخروج" : decision === "accept" ? "تأكيد وتسجيل الموافقة على الخروج" : "تأكيد القرار المختار"}
                            </button>
                        </section>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default function SecureDecisionPage({ params }: PageProps) {
    const { token } = use(params);
    return <SecureDecisionClient token={token} />;
}