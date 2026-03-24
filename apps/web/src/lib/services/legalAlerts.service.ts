import { apiFetch } from "@/utils/api";

export type LegalAlertSeverity = "info" | "warning" | "critical";

export type LegalAlert = {
    id: string;
    tenant_id: string;
    case_id: string | null;
    alert_key: string;
    alert_type: string;
    severity: LegalAlertSeverity;
    title: string;
    message: string;
    case_deep_link: string | null;
    is_acknowledged: boolean;
    acknowledged_by: string | null;
    acknowledged_at: string | null;
    created_at: string;
    metadata_json?: Record<string, unknown> | null;
};

export type LegalAlertListResponse = {
    alerts: LegalAlert[];
    total: number;
    unread: number;
};

export type RecipientPhone = {
    name: string;
    phone: string;
};

export type RecipientEmail = {
    name: string;
    email: string;
};

export type NotificationSettings = {
    id: string;
    tenant_id: string;
    email_enabled: boolean;
    dashboard_enabled: boolean;
    whatsapp_enabled: boolean;
    whatsapp_sender_number: string | null;
    legal_recipient_phones: RecipientPhone[];
    legal_recipient_emails: RecipientEmail[];
    compliance_recipient_emails: RecipientEmail[];
    notification_threshold_minutes: number;
    escalation_threshold_minutes: number;
};

export async function fetchLegalAlerts(params?: {
    severity?: LegalAlertSeverity | "all";
    unacknowledgedOnly?: boolean;
    limit?: number;
}) {
    const search = new URLSearchParams();
    if (params?.severity && params.severity !== "all") {
        search.set("severity", params.severity);
    }
    if (params?.unacknowledgedOnly) {
        search.set("unacknowledged_only", "true");
    }
    if (params?.limit) {
        search.set("limit", String(params.limit));
    }
    const query = search.toString();
    return apiFetch<LegalAlertListResponse>(`/api/legal/alerts${query ? `?${query}` : ""}`, {
        authFailureMode: "inline",
        cache: "no-store",
    });
}

export async function acknowledgeLegalAlert(alertId: string, note?: string) {
    return apiFetch<{ acknowledged: boolean; alert_id: string }>(
        `/api/legal/alerts/${encodeURIComponent(alertId)}/acknowledge`,
        {
            method: "POST",
            authFailureMode: "inline",
            body: JSON.stringify(note ? { note } : {}),
        },
    );
}

export async function fetchNotificationSettings() {
    return apiFetch<NotificationSettings>("/api/legal/notifications/settings", {
        authFailureMode: "inline",
        cache: "no-store",
    });
}

export async function updateNotificationSettings(payload: Partial<NotificationSettings>) {
    return apiFetch<NotificationSettings>("/api/legal/notifications/settings", {
        method: "PUT",
        authFailureMode: "inline",
        body: JSON.stringify(payload),
    });
}
