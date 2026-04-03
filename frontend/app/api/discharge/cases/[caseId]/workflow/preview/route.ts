import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { dischargeRefusalFormTemplate } from "@/lib/templates/dischargeRefusalForm.template";
import { financialResponsibilityNoticeTemplate } from "@/lib/templates/financialResponsibilityNotice.template";

type PreviewLocale = "ar" | "en";
type RouteContext = { params: Promise<{ caseId: string }> };

type PreviewPayload = {
    template_key?: string;
    payload?: Record<string, unknown>;
    locale?: string;
};

// ── helpers ─────────────────────────────────────────

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function fmtDate(v: unknown): string {
    try {
        return v ? new Date(String(v)).toISOString().slice(0, 10) : "";
    } catch {
        return String(v ?? "");
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function nowDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function normalizeLocale(value: unknown): PreviewLocale {
    return value === "ar" ? "ar" : "en";
}

// ── renderers ──────────────────────────────────────

function renderDischargeRefusalForm(ctx: Record<string, string>, locale: PreviewLocale): string {
    return dischargeRefusalFormTemplate.renderHtml(
        {
            patientName: ctx.patient_name,
            patientIdNumber: ctx.patient_id_number,
            medicalRecordNumber: ctx.medical_record_number,
            roomNumber: ctx.room_number,
            attendingPhysicianName: ctx.attending_physician,
            dischargeDecisionAt: fmtDate(ctx.discharge_decision_at),
            discussionSummary: ctx.discussion_summary,
            refusalReason: ctx.refusal_reason,
        },
        { locale },
    );
}

function renderFinancialResponsibilityNotice(ctx: Record<string, string>, locale: PreviewLocale): string {
    return financialResponsibilityNoticeTemplate.renderHtml(
        {
            documentDate: fmtDate(ctx.generated_at),
            referenceNumber: ctx.reference_number,
            patientName: ctx.patient_name,
            medicalRecordNumber: ctx.medical_record_number,
        },
        { locale },
    );
}

function renderInformedConsent(ctx: Record<string, string>, locale: PreviewLocale): string {
    return `<html><body>
<h2>${locale === "ar" ? "الموافقة المستنيرة" : "Informed Consent"}</h2>
<p>${safe(ctx.patient_name)}</p>
</body></html>`;
}

// ── template registry ───────────────────────────────

const TEMPLATES = {
    discharge_refusal_form: {
        required: ["discharge_decision_at"],
        renderer: renderDischargeRefusalForm,
    },
    financial_responsibility_notice: {
        required: ["discharge_decision_at"],
        renderer: renderFinancialResponsibilityNotice,
    },
    informed_consent: {
        required: [],
        renderer: renderInformedConsent,
    },
};

// ── route ───────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const auth = await requireAuth(request); // ✅ FIX
        const { caseId } = await params;

        const body = (await request.json().catch(() => ({}))) as PreviewPayload;

        const templateKey = (body.template_key ?? "").trim();
        const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];

        if (!template) {
            throw new ApiError(400, "Invalid template key");
        }

        const input = body.payload ?? {};
        const locale = normalizeLocale(body.locale ?? input["locale"]);

        const caseRecord = await prisma.case.findUnique({
            where: { id: caseId },
        });

        if (!caseRecord) throw new ApiError(404, "Case not found");
        if (caseRecord.tenantId !== auth.tenant_id) {
            throw new ApiError(403, "Tenant access denied");
        }

        const ctx: Record<string, string> = {
            case_id: caseId,
            patient_name: safe(input.patient_name ?? caseRecord.patientName),
            patient_id_number: safe(input.patient_id_number ?? caseRecord.patientIdNumber),
            medical_record_number: safe(input.medical_record_number ?? caseRecord.medicalRecordNo),
            room_number: safe(input.room_number ?? caseRecord.roomNumber),
            discharge_decision_at: safe(input.discharge_decision_at),
            refusal_reason: safe(input.refusal_reason),
            discussion_summary: safe(input.discussion_summary),
            generated_at: nowIso(),
            reference_number: `REF-${caseId.slice(0, 6)}`,
            date: nowDate(),
        };

        const htmlContent = template.renderer(ctx, locale);

        const missingFields = template.required.filter((f) => !ctx[f]);

        return NextResponse.json({
            template_key: templateKey,
            missing_fields: missingFields,
            can_generate: missingFields.length === 0,
            html_content: htmlContent,
            context: ctx,
        });
    } catch (error) {
        return handleApiError(error);
    }
}