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
        <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-xl">
                <section className={`border p-5 shadow-[var(--shadow-floating)] sm:p-7 ${config.tone}`}>
                    <div className="mb-4 flex items-center gap-3">{config.icon}<span className="text-xs font-semibold uppercase tracking-[0.18em]">WathiqCare / IMC</span></div>
                    <h1 className="text-2xl font-bold">{config.title}</h1>
                    <p className="mt-3 text-sm leading-7">{config.body}</p>
                    {state !== "loading" ? <p className="mt-4 text-xs opacity-80">{message.replace(/^\d+:/, "").trim()}</p> : null}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/" className="toolbar-btn toolbar-btn-secondary">
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

        const submitPayload: SubmitDecisionPayload = {
            decision,
            typed_name: normalizedTypedName,
            refusal_acknowledged: refusalAcknowledged,
            signature_data: normalizedSignature,
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
            <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10">
                <div className="mx-auto max-w-xl">
                    <section className="overflow-hidden border border-emerald-200 bg-white shadow-[var(--shadow-floating)]">
                        <div className="bg-[var(--primary)] px-5 py-5 text-white sm:px-7">
                            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center border border-white/20 bg-white/10">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/90">تم التأكيد</p>
                            <h1 className="mt-2 text-2xl font-bold">{submitted.confirmation_message}</h1>
                            <p className="mt-2 text-sm text-cyan-50">تم حفظ الإقرار بنجاح وإرسال التوثيق إلى سجل الحالة.</p>
                        </div>

                        <div className="space-y-4 p-5 sm:p-7">
                            <div className="wc-panel grid gap-3 text-sm text-slate-700">
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">المنشأة</span><strong className="text-slate-900">{submitted.hospital_name || "WathiqCare"}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">مرجع الحالة</span><strong className="text-slate-900">{submitted.case_reference}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">الاسم المسجل</span><strong className="text-slate-900">{submitted.typed_name}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">القرار</span><strong className="text-slate-900">{submitted.decision_type === "accept" ? "موافقة على الخروج" : "رفض الخروج"}</strong></div>
                                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">وقت التسجيل</span><strong className="text-slate-900">{formatDate(submitted.submitted_at)}</strong></div>
                            </div>

                            <p className="wc-panel text-sm leading-7 text-emerald-900">
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
        (decision !== "refuse" || refusalAcknowledged);
    const submitButtonDisabled = isSubmitting || !canSubmit;

    const homeCareSummary = getOptionalText(caseData, ["home_care_agreement_text"]);
    const equipmentSummary = getOptionalText(caseData, ["equipment_acknowledgment_text"]);

    return (
        <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-xl">
                <section className="overflow-hidden border border-[var(--border-strong)] bg-white shadow-[var(--shadow-floating)]">
                    <div className="border-b border-[#224566] bg-[var(--primary)] px-5 py-5 text-white sm:px-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">IMC / WathiqCare Secure Link</p>
                                <h1 className="mt-2 text-2xl font-bold leading-tight">قرار الخروج الطبي</h1>
                                <p className="mt-2 max-w-md text-sm leading-7 text-cyan-50/95">
                                    يرجى مراجعة المعلومات التالية ثم اختيار الموافقة أو الرفض. هذه الصفحة مخصصة للمريض أو الممثل النظامي فقط.
                                </p>
                            </div>
                            <div className="inline-flex h-12 w-12 items-center justify-center border border-white/20 bg-white/10">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-7">
                        <div className="wc-panel grid gap-3 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">المنشأة</span><strong className="text-slate-900">{caseData?.hospital_name || "WathiqCare"}</strong></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">مرجع الحالة</span><strong className="text-slate-900">{caseData?.case_reference}</strong></div>
                            {caseData?.patient_name ? <div className="flex items-center justify-between gap-3"><span className="text-slate-500">اسم المريض</span><strong className="text-slate-900">{caseData.patient_name}</strong></div> : null}
                            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">صلاحية الرابط</span><strong className="text-slate-900">{formatDate(caseData?.expires_at)}</strong></div>
                        </div>

                        <section className="wc-panel">
                            <h2 className="wc-panel-heading">لوحة قرار المريض</h2>
                            <p className="text-[12px] leading-6 text-slate-700">سيتم استخدام هذا الإقرار لتوثيق قرار المريض مع السجل الطبي وسلسلة التدقيق القانونية. إذا كانت هناك حاجة إلى تحقق إضافي عبر البريد الإلكتروني أو OTP فسيتم تفعيله ضمن رحلة التوقيع المعتمدة دون تغيير في التدفق الخلفي.</p>
                        </section>

                        {caseData?.discharge_summary ? (
                            <section className="wc-form-panel">
                                <div className="mb-3 flex items-center gap-2 text-slate-900"><FileText className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-bold">ملخص الخروج</h2></div>
                                <p className="text-sm leading-7 text-slate-700">{caseData.discharge_summary}</p>
                            </section>
                        ) : null}

                        {homeCareSummary ? (
                            <section className="wc-panel">
                                <div className="mb-2 flex items-center gap-2 text-teal-900"><FileText className="h-4 w-4 text-teal-600" /><h2 className="text-sm font-bold">خطة الرعاية المنزلية</h2></div>
                                <p className="text-sm leading-7 text-teal-900">{homeCareSummary}</p>
                                <p className="mt-3 text-xs leading-6 text-teal-800">
                                    يُقر الموقِّع بأنه اطّلع على ترتيبات الرعاية المنزلية المحددة أعلاه، وأنه يتفهم الالتزامات الواجبة على المريض أو وليّ أمره لضمان استمرار الرعاية بعد الخروج.
                                </p>
                            </section>
                        ) : null}

                        {equipmentSummary ? (
                            <section className="wc-panel">
                                <div className="mb-2 flex items-center gap-2 text-indigo-900"><FileText className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-bold">الأجهزة والمستلزمات الطبية</h2></div>
                                <p className="text-sm leading-7 text-indigo-900">{equipmentSummary}</p>
                                <p className="mt-3 text-xs leading-6 text-indigo-800">
                                    يُقر الموقِّع بأنه استلم الأجهزة أو المستلزمات الطبية المذكورة أعلاه، وتسلّم التعليمات الخاصة بتشغيلها وصيانتها وإجراءات الطوارئ المرتبطة بها.
                                </p>
                            </section>
                        ) : null}

                        <section className="wc-panel">
                            <h2 className="text-sm font-bold text-cyan-950">الإشعار القانوني</h2>
                            <p className="mt-2 text-sm leading-7 text-cyan-900">{caseData?.legal_notice}</p>
                        </section>

                        <section className="wc-form-panel">
                            <h2 className="text-sm font-bold text-slate-900">اختيار القرار</h2>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                <div className="wc-panel text-[12px]">
                                    <div className="wc-panel-heading !mb-1">Email OTP Panel</div>
                                    <p className="text-slate-700">يبقى مسار التحقق عبر الرمز أو البريد الإلكتروني متاحاً حسب سياسة المنشأة وتوقيع المستند. هذه الصفحة تحافظ على نفس نقطة التكامل الحالية ولا تغيّر أي API.</p>
                                </div>
                                <div className="wc-panel text-[12px]">
                                    <div className="wc-panel-heading !mb-1">Legal Acknowledgment</div>
                                    <p className="text-slate-700">التوقيع والاسم المسجل أدناه يشكلان إقراراً قانونياً نهائياً ضمن سجل الحالة.</p>
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setDecision("accept")}
                                    disabled={isSubmitting}
                                    data-testid="decision-accept"
                                    className={`border px-4 py-4 text-right transition ${decision === "accept" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/60"}`}
                                >
                                    <div className="text-sm font-bold">الموافقة على الخروج</div>
                                    <div className="mt-1 text-xs leading-6 text-slate-600">أُقرّ باستلام قرار الخروج الطبي، واطّلاعي على ملخص الحالة والتعليمات اللازمة، وأوافق على متابعة إجراءات الخروج.</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDecision("refuse")}
                                    disabled={isSubmitting}
                                    data-testid="decision-refuse"
                                    className={`border px-4 py-4 text-right transition ${decision === "refuse" ? "border-rose-300 bg-rose-50 text-rose-950" : "border-slate-200 bg-white text-slate-800 hover:border-rose-200 hover:bg-rose-50/60"}`}
                                >
                                    <div className="text-sm font-bold">رفض الخروج</div>
                                    <div className="mt-1 text-xs leading-6 text-slate-600">أُقرّ باطّلاعي على القرار الطبي وتوضيح المخاطر والبدائل، وأرغب في رفض الخروج مع قبول المسؤولية القانونية المترتبة على ذلك.</div>
                                </button>
                            </div>

                            {decision === "refuse" ? (
                                <div className="wc-panel mt-4 border-rose-200 bg-rose-50 p-4">
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
                                <label htmlFor="typed-name" className="wc-form-label mb-2 block">الاسم الكامل للمقر</label>
                                <input
                                    id="typed-name"
                                    type="text"
                                    value={typedName}
                                    onChange={(event) => setTypedName(event.target.value)}
                                    placeholder="اكتب الاسم الكامل"
                                    disabled={isSubmitting}
                                    data-testid="typed-name-input"
                                    className="wc-form-input"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="wc-form-label mb-2 block">التوقيع الإلكتروني <span className="text-rose-600">*</span></label>
                                <TabletSignaturePad
                                    value={signatureData}
                                    onChange={setSignatureData}
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-slate-500">التوقيع مطلوب لإتمام الإقرار. وقّع باستخدام الإصبع أو القلم الرقمي.</p>
                            </div>

                            {submitError ? <p className="wc-panel mt-4 text-sm text-rose-900">{submitError}</p> : null}

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={submitButtonDisabled}
                                data-testid="secure-final-submit"
                                className="toolbar-btn toolbar-btn-primary mt-5 w-full justify-center py-3"
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