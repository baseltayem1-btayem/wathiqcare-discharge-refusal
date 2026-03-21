"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, ExternalLink, Link2, Mail, RefreshCw } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { useI18n } from "@/i18n/I18nProvider";

type SecureLinkRecord = {
    link_id: string;
    recipient_email: string;
    sent_via: string;
    delivery_status: string;
    decision_type?: string | null;
    decision_submitted_at?: string | null;
    expires_at: string;
    accessed_at?: string | null;
    revoked_at?: string | null;
    created_at?: string | null;
};

type GenerateSecureLinkResponse = {
    link_id: string;
    url: string;
    expires_at: string;
    recipient_email: string;
    delivery_status: string;
    delivery_channel: string;
};

type PatientCommunicationPanelProps = {
    caseId: string;
    patientName?: string | null;
    disabledReason?: string | null;
};

function formatDate(value: string | null | undefined, locale: string): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function statusTone(status: string): string {
    switch (status.toLowerCase()) {
        case "sent":
            return "bg-emerald-100 text-emerald-700";
        case "pending":
            return "bg-amber-100 text-amber-800";
        case "not_configured":
            return "bg-cyan-100 text-cyan-800";
        case "failed":
            return "bg-rose-100 text-rose-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

export default function PatientCommunicationPanel({
    caseId,
    patientName,
    disabledReason,
}: PatientCommunicationPanelProps) {
    const { lang } = useI18n();
    const isArabic = lang === "ar";
    const locale = isArabic ? "ar" : "en";

    const text = useMemo(
        () =>
            isArabic
                ? {
                    title: "تواصل المريض والرابط الآمن",
                    subtitle: "أنشئ رابطًا آمنًا للمريض، أرسله بالبريد الإلكتروني، وتابع حالة الوصول والقرار من نفس الشاشة.",
                    emailLabel: "البريد الإلكتروني للمريض أو الممثل النظامي",
                    emailPlaceholder: "patient@example.com",
                    send: "إرسال الرابط الآمن",
                    refresh: "تحديث السجل",
                    loading: "جار تحميل سجل التواصل...",
                    empty: "لم يتم إنشاء أي روابط آمنة لهذه الحالة بعد.",
                    latestTitle: "آخر رابط تم إنشاؤه",
                    latestHelp: "هذا هو الرابط الخام الوحيد الذي يمكن نسخه بعد الإنشاء. السجل التاريخي لا يعرض الرمز الخام مجددًا لأسباب أمنية.",
                    copy: "نسخ الرابط",
                    open: "فتح الرابط",
                    revoke: "إلغاء الرابط",
                    revokeDone: "تم إلغاء الرابط الآمن.",
                    copyDone: "تم نسخ الرابط الآمن إلى الحافظة.",
                    copyFailed: "تعذر نسخ الرابط تلقائيًا. انسخه يدويًا من الحقل أدناه.",
                    sendDone: "تم إنشاء الرابط الآمن بنجاح.",
                    sendConfiguredFallback: "تم إنشاء الرابط لكن البريد غير مهيأ، لذا يجب مشاركة الرابط يدويًا.",
                    sendFailed: "تعذر إنشاء الرابط الآمن أو إرساله.",
                    disabled: "ميزة تواصل المريض غير متاحة حاليًا لأن خدمة المسار الخلفية غير متصلة.",
                    recipient: "المستلم",
                    delivery: "حالة الإرسال",
                    accessed: "أول وصول",
                    decided: "قرار المريض",
                    expires: "ينتهي في",
                    created: "تم الإنشاء في",
                    none: "لا يوجد",
                    accepted: "موافقة",
                    refused: "رفض",
                    decisionPending: "بانتظار القرار",
                }
                : {
                    title: "Patient Communication",
                    subtitle: "Generate a secure patient link, send it by email, and track access and decision status from the case workspace.",
                    emailLabel: "Patient or representative email",
                    emailPlaceholder: "patient@example.com",
                    send: "Send Secure Link",
                    refresh: "Refresh History",
                    loading: "Loading communication history...",
                    empty: "No secure patient links have been created for this case yet.",
                    latestTitle: "Latest Generated Link",
                    latestHelp: "The raw secure URL is only available right after creation. Historical records intentionally do not expose the raw token again.",
                    copy: "Copy Link",
                    open: "Open Link",
                    revoke: "Revoke Link",
                    revokeDone: "Secure link revoked.",
                    copyDone: "Secure link copied to the clipboard.",
                    copyFailed: "Automatic copy failed. Copy the secure link manually from the field below.",
                    sendDone: "Secure link created successfully.",
                    sendConfiguredFallback: "Secure link created, but email delivery is not configured, so share the URL manually.",
                    sendFailed: "Failed to create or deliver the secure link.",
                    disabled: "Patient communication is unavailable because the backend workflow service is currently unreachable.",
                    recipient: "Recipient",
                    delivery: "Delivery",
                    accessed: "First Access",
                    decided: "Patient Decision",
                    expires: "Expires",
                    created: "Created",
                    none: "None",
                    accepted: "Accepted",
                    refused: "Refused",
                    decisionPending: "Awaiting decision",
                },
        [isArabic],
    );

    const [recipientEmail, setRecipientEmail] = useState("");
    const [links, setLinks] = useState<SecureLinkRecord[]>([]);
    const [generatedLink, setGeneratedLink] = useState<GenerateSecureLinkResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadLinks(showSpinner = false) {
        if (disabledReason) {
            setLoading(false);
            return;
        }

        if (showSpinner) {
            setRefreshing(true);
        }

        try {
            const response = await apiFetch<SecureLinkRecord[]>(
                `/api/discharge/cases/${encodeURIComponent(caseId)}/secure-links`,
                { cache: "no-store" },
            );
            setLinks(Array.isArray(response) ? response : []);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : text.sendFailed);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        setLoading(true);
        void loadLinks();
    }, [caseId, disabledReason]);

    async function handleSend() {
        const normalizedEmail = recipientEmail.trim();
        if (!normalizedEmail || sending || disabledReason) {
            return;
        }

        setSending(true);
        setError(null);
        setMessage(null);

        try {
            const response = await apiFetch<GenerateSecureLinkResponse>(
                `/api/discharge/cases/${encodeURIComponent(caseId)}/secure-link`,
                {
                    method: "POST",
                    body: JSON.stringify({ recipient_email: normalizedEmail }),
                },
            );

            setGeneratedLink(response);
            setRecipientEmail("");
            setMessage(
                response.delivery_status === "not_configured"
                    ? text.sendConfiguredFallback
                    : text.sendDone,
            );
            await loadLinks();
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : text.sendFailed);
        } finally {
            setSending(false);
        }
    }

    async function handleCopy(url: string) {
        try {
            await navigator.clipboard.writeText(url);
            setMessage(text.copyDone);
        } catch {
            setMessage(text.copyFailed);
        }
    }

    async function handleRevoke(linkId: string) {
        if (revokingId || disabledReason) {
            return;
        }

        setRevokingId(linkId);
        setError(null);
        setMessage(null);

        try {
            await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/secure-links/${encodeURIComponent(linkId)}`, {
                method: "DELETE",
            });
            setMessage(text.revokeDone);
            await loadLinks();
        } catch (revokeError) {
            setError(revokeError instanceof Error ? revokeError.message : text.sendFailed);
        } finally {
            setRevokingId(null);
        }
    }

    return (
        <section id="patient-communication-panel" className="mt-5 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">{text.title}</h3>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">{text.subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        void loadLinks(true);
                    }}
                    disabled={refreshing || Boolean(disabledReason)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    {text.refresh}
                </button>
            </div>

            {disabledReason ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {disabledReason || text.disabled}
                </div>
            ) : null}

            {message ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {message}
                </div>
            ) : null}

            {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-medium text-slate-700">{text.emailLabel}</label>
                <div className="mt-2 flex flex-col gap-2 lg:flex-row">
                    <input
                        type="email"
                        value={recipientEmail}
                        onChange={(event) => setRecipientEmail(event.target.value)}
                        placeholder={text.emailPlaceholder}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            void handleSend();
                        }}
                        disabled={sending || !recipientEmail.trim() || Boolean(disabledReason)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Mail className="h-4 w-4" />
                        {sending ? (isArabic ? "جار الإرسال..." : "Sending...") : text.send}
                    </button>
                </div>
                {patientName ? (
                    <p className="mt-2 text-xs text-slate-500">
                        {isArabic ? `سيتم إنشاء رابط قرار آمن للحالة الخاصة بـ ${patientName}.` : `A secure decision link will be created for ${patientName}.`}
                    </p>
                ) : null}
            </div>

            {generatedLink ? (
                <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h4 className="text-sm font-semibold text-cyan-900">{text.latestTitle}</h4>
                            <p className="mt-1 text-xs text-cyan-800">{text.latestHelp}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(generatedLink.delivery_status)}`}>
                            {generatedLink.delivery_status}
                        </span>
                    </div>
                    <input
                        readOnly
                        value={generatedLink.url}
                        className="mt-3 w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void handleCopy(generatedLink.url);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-100"
                        >
                            <Copy className="h-4 w-4" />
                            {text.copy}
                        </button>
                        <a
                            href={generatedLink.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-100"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {text.open}
                        </a>
                    </div>
                </div>
            ) : null}

            <div className="mt-4">
                {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {text.loading}
                    </div>
                ) : links.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                        {text.empty}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {links.map((link) => {
                            const decisionLabel =
                                link.decision_type === "accept"
                                    ? text.accepted
                                    : link.decision_type === "refuse"
                                        ? text.refused
                                        : text.decisionPending;

                            return (
                                <article key={link.link_id} className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2 text-sm text-slate-700">
                                            <div className="flex items-center gap-2 text-slate-900">
                                                <Link2 className="h-4 w-4 text-cyan-700" />
                                                <span className="font-semibold">{link.recipient_email}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(link.delivery_status)}`}>
                                                    {link.delivery_status}
                                                </span>
                                                {link.revoked_at ? (
                                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                        revoked
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                                                <div>
                                                    <p className="text-xs text-slate-500">{text.delivery}</p>
                                                    <p>{link.sent_via || text.none}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">{text.created}</p>
                                                    <p>{formatDate(link.created_at, locale)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">{text.expires}</p>
                                                    <p>{formatDate(link.expires_at, locale)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">{text.accessed}</p>
                                                    <p>{formatDate(link.accessed_at, locale)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500">{text.decided}</p>
                                                    <p>
                                                        {decisionLabel}
                                                        {link.decision_submitted_at ? ` • ${formatDate(link.decision_submitted_at, locale)}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {!link.revoked_at ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleRevoke(link.link_id);
                                                }}
                                                disabled={revokingId === link.link_id || Boolean(disabledReason)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                            >
                                                <Ban className="h-4 w-4" />
                                                {revokingId === link.link_id ? (isArabic ? "جار الإلغاء..." : "Revoking...") : text.revoke}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}