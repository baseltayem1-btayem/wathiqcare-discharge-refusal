import type {
    CreateSessionRequest,
    CreateSessionResponse,
    PublicSessionPayload,
    VerifyOtpRequest,
    FormAcknowledgmentRequest,
    DocumentType,
    SignatureSubmissionRequest,
    SignatureSubmissionResponse,
    CreatePaymentSessionRequest,
    CreatePaymentSessionResponse,
    AdminSessionsFilter,
    AdminSessionsResponse,
    DischargeSession,
    AuditLog,
    DischargeDocument,
    EmrDischargeOrderIssuedRequest,
} from "@wathiqcare/types";

// ── Errors ────────────────────────────────────────────────────────────

export class WathiqCareApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
        public readonly detail?: unknown
    ) {
        super(message);
        this.name = "WathiqCareApiError";
    }
}

// ── Base HTTP helper ──────────────────────────────────────────────────

async function request<T>(
    baseUrl: string,
    path: string,
    options: RequestInit & { token?: string } = {}
): Promise<T> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}${path}`, { ...fetchOptions, headers });
    if (!res.ok) {
        let body: Record<string, unknown> = {};
        try {
            body = await res.json();
        } catch {
            //
        }
        throw new WathiqCareApiError(
            res.status,
            (body["code"] as string) ?? "API_ERROR",
            (body["message"] as string) ?? res.statusText,
            body
        );
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
        return res.json() as Promise<T>;
    }
    return res.blob() as unknown as T;
}

// ── Public Patient Client ─────────────────────────────────────────────

/**
 * Client for patient-facing public endpoints. These require only a
 * valid discharge session token embedded in the URL — no auth header.
 */
export class DischargePublicClient {
    constructor(private readonly baseUrl: string) { }

    /** Fetch session data for a given public token. */
    getSession(token: string): Promise<PublicSessionPayload> {
        return request<PublicSessionPayload>(
            this.baseUrl,
            `/api/public/discharge/session/${token}`
        );
    }

    /** Optionally verify OTP before continuing the workflow. */
    verifyOtp(token: string, body: VerifyOtpRequest): Promise<{ verified: boolean }> {
        return request(this.baseUrl, `/api/public/discharge/session/${token}/verify`, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Submit a form acknowledgment for a specific document type. */
    submitForm(
        token: string,
        type: DocumentType,
        body: FormAcknowledgmentRequest
    ): Promise<{ acknowledged: boolean; nextStep: string }> {
        const slug = type.replace(/_/g, "-");
        return request(this.baseUrl, `/api/public/discharge/session/${token}/forms/${slug}`, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Submit the patient's electronic signature. */
    submitSignature(
        token: string,
        body: SignatureSubmissionRequest
    ): Promise<SignatureSubmissionResponse> {
        return request(this.baseUrl, `/api/public/discharge/session/${token}/sign`, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Create a payment checkout session when payment is required. */
    createPayment(
        token: string,
        body: CreatePaymentSessionRequest
    ): Promise<CreatePaymentSessionResponse> {
        return request(this.baseUrl, `/api/public/discharge/session/${token}/payment`, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** Download the completed signed PDF document. */
    downloadPdf(token: string, documentId: string): Promise<Blob> {
        return request<Blob>(
            this.baseUrl,
            `/api/public/discharge/session/${token}/document/${documentId}/pdf`
        );
    }
}

// ── Internal Admin Client ─────────────────────────────────────────────

/**
 * Client for internal/admin endpoints. Requires a valid JWT bearer token.
 */
export class DischargeAdminClient {
    constructor(
        private readonly baseUrl: string,
        private readonly authToken: string
    ) { }

    private req<T>(path: string, options: RequestInit = {}): Promise<T> {
        return request<T>(this.baseUrl, path, { ...options, token: this.authToken });
    }

    /** Create a new discharge session (internal). */
    createSession(body: CreateSessionRequest): Promise<CreateSessionResponse> {
        return this.req("/api/discharge/session", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** List sessions with optional filters. */
    listSessions(filters?: AdminSessionsFilter): Promise<AdminSessionsResponse> {
        const qs = filters ? "?" + new URLSearchParams(filters as Record<string, string>).toString() : "";
        return this.req(`/api/admin/discharge-sessions${qs}`);
    }

    /** Get full session detail including timeline. */
    getSession(id: string): Promise<DischargeSession> {
        return this.req(`/api/admin/discharge-sessions/${id}`);
    }

    /** Get audit event log for a session. */
    getAudit(id: string): Promise<AuditLog[]> {
        return this.req(`/api/admin/discharge-sessions/${id}/audit`);
    }

    /** Get documents for a session. */
    getDocuments(id: string): Promise<DischargeDocument[]> {
        return this.req(`/api/admin/discharge-sessions/${id}/documents`);
    }
}

// ── EMR Integration Client ─────────────────────────────────────────────

/**
 * Client used by EMR systems or trusted internal services to trigger
 * discharge workflows.
 */
export class DischargeIntegrationClient {
    constructor(
        private readonly baseUrl: string,
        private readonly apiKey: string
    ) { }

    private req<T>(path: string, body: unknown): Promise<T> {
        return request<T>(this.baseUrl, path, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "X-Api-Key": this.apiKey },
        });
    }

    /** Notify WathiqCare that an EMR discharge order has been issued. */
    dischargeOrderIssued(body: EmrDischargeOrderIssuedRequest): Promise<CreateSessionResponse> {
        return this.req("/api/integrations/emr/discharge-order-issued", body);
    }
}
