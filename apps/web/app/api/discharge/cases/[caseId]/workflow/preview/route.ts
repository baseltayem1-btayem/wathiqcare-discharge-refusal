import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { buildTenantReferenceNumber, resolveTenantBranding } from "@/lib/server/tenantBranding";
import { dischargeRefusalFormTemplate } from "@/lib/templates/dischargeRefusalForm.template";
import { financialResponsibilityNoticeTemplate } from "@/lib/templates/financialResponsibilityNotice.template";

type PreviewLocale = "ar" | "en";

type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function fmtDate(v: unknown): string {
    if (!v) return "";
    try {
        return new Date(String(v)).toISOString().slice(0, 10);
    } catch {
        return String(v);
    }
}

function fmtDatetime(v: unknown): string {
    if (!v) return "";
    try {
        const d = new Date(String(v));
        return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
    } catch {
        return String(v);
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

// ── renderers ──────────────────────────────────────────────────────────────

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
            socialServicesSummary: ctx.forms_issued || ctx.insurance_coverage_status,
        },
        { locale, tenantName: ctx.tenant_name },
    );
}

function renderFinancialResponsibilityNotice(ctx: Record<string, string>, locale: PreviewLocale): string {
    return financialResponsibilityNoticeTemplate.renderHtml(
        {
            documentDate: fmtDate(ctx.generated_at),
            referenceNumber: ctx.reference_number,
            patientOrGuardianName: ctx.patient_name_or_guardian || ctx.patient_name,
            patientName: ctx.patient_name,
            patientIdNumber: ctx.patient_id_number,
            medicalRecordNumber: ctx.medical_record_number,
            roomNumber: ctx.room_number,
            dischargeDecisionAt: fmtDate(ctx.discharge_decision_at),
            attendingPhysicianName: ctx.attending_physician,
            refusalReason: ctx.refusal_reason,
            discussionSummary: ctx.discussion_summary,
        },
        { locale, tenantName: ctx.tenant_name },
    );
}

function renderInformedConsent(ctx: Record<string, string>, locale: PreviewLocale): string {
    const isArabic = locale === "ar";
    const title = isArabic ? "الموافقة المستنيرة والإقرار" : "Acknowledgment and Informed Consent";
    const referenceLabel = isArabic ? "المرجع" : "Reference";
    const patientLabel = isArabic ? "اسم المريض" : "Patient Name";
    const idLabel = isArabic ? "رقم الهوية" : "ID Number";
    const mrnLabel = isArabic ? "رقم السجل الطبي" : "Medical Record Number";
    const roomLabel = isArabic ? "رقم الغرفة" : "Room Number";
    const physicianLabel = isArabic ? "الطبيب المعالج" : "Attending Physician";
    const decisionLabel = isArabic ? "تاريخ القرار" : "Decision Date";
    const summaryText = isArabic
        ? "أقر بأن الفريق العلاجي قدم شرحًا واضحًا للحالة الطبية وخطة الخروج الموصى بها والمخاطر المحتملة للرفض والبدائل المتاحة."
        : "I acknowledge that the care team provided clear information about the medical condition, recommended discharge plan, potential risks of refusal, and available alternatives.";
    const confirmationText = isArabic
        ? "أؤكد أن استفساراتي قد أجيبت وأنني أفهم آثار هذا القرار."
        : "I confirm that my questions were answered and that I understand the implications of this decision.";
    const documentedLabel = isArabic ? "الملخص الموثق" : "Documented Summary";
    const patientSignatureLabel = isArabic ? "توقيع المريض / الولي النظامي" : "Patient / Legal Guardian Signature";
    const physicianSignatureLabel = isArabic ? "توقيع الطبيب المعالج" : "Attending Physician Signature";
    const dateLabel = isArabic ? "التاريخ" : "Date";

    return `<!DOCTYPE html>
<html lang="${locale}" dir="${isArabic ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ${isArabic ? '"Tahoma", "Arial", sans-serif' : '"Arial", sans-serif'}; color: #0f172a; margin: 24px; line-height: 1.6; }
    h1 { margin: 0; }
    .muted { color: #475569; }
    .section { margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
    .label { font-size: 12px; color: #64748b; ${isArabic ? "" : "text-transform: uppercase;"} letter-spacing: 0.03em; }
    .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .line { margin-top: 20px; border-top: 1px solid #64748b; min-height: 24px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="muted">${referenceLabel}: <strong>${safe(ctx.reference_number)}</strong></p>

  <div class="section">
    <div class="grid">
      <div><div class="label">${patientLabel}</div><div class="value">${safe(ctx.patient_name)}</div></div>
      <div><div class="label">${idLabel}</div><div class="value">${safe(ctx.patient_id_number)}</div></div>
      <div><div class="label">${mrnLabel}</div><div class="value">${safe(ctx.medical_record_number)}</div></div>
      <div><div class="label">${roomLabel}</div><div class="value">${safe(ctx.room_number)}</div></div>
      <div><div class="label">${physicianLabel}</div><div class="value">${safe(ctx.attending_physician)}</div></div>
      <div><div class="label">${decisionLabel}</div><div class="value">${fmtDatetime(ctx.discharge_decision_at)}</div></div>
    </div>
  </div>

  <div class="section">
    <p>${summaryText}</p>
    <p>${confirmationText}</p>
    <p>${documentedLabel}: <strong>${safe(ctx.discussion_summary || ctx.refusal_reason)}</strong></p>
  </div>

  <div class="section">
    <div class="grid">
      <div>
        <div class="label">${patientSignatureLabel}</div>
        <div class="line"></div>
      </div>
      <div>
        <div class="label">${physicianSignatureLabel}</div>
        <div class="line"></div>
      </div>
    </div>
    <p style="font-size:11px;color:#64748b;margin-top:12px;">${dateLabel}: ${fmtDate(ctx.generated_at)}</p>
  </div>
</body>
</html>`;
}

// ── template registry ──────────────────────────────────────────────────────

type TemplateInfo = {
    key: string;
    title_en: string;
    title_ar: string;
    document_code: string;
    required_fields: string[];
    renderer: (ctx: Record<string, string>, locale: PreviewLocale) => string;
};

const TEMPLATES: Record<string, TemplateInfo> = {
    discharge_refusal_form: {
        key: "discharge_refusal_form",
        title_en: dischargeRefusalFormTemplate.titleEn,
        title_ar: dischargeRefusalFormTemplate.titleAr,
        document_code: "IMC-PAT-DIS-REF-01",
        required_fields: ["discharge_decision_at", "refusal_reason_or_summary"],
        renderer: renderDischargeRefusalForm,
    },
    financial_responsibility_notice: {
        key: "financial_responsibility_notice",
        title_en: financialResponsibilityNoticeTemplate.titleEn,
        title_ar: financialResponsibilityNoticeTemplate.titleAr,
        document_code: "IMC-PAT-DIS-NOT-01",
        required_fields: ["discharge_decision_at"],
        renderer: renderFinancialResponsibilityNotice,
    },
    informed_consent: {
        key: "informed_consent",
        title_en: "Acknowledgment and Informed Consent",
        title_ar: "الموافقة المستنيرة والإقرار",
        document_code: "IMC-PAT-CONS-01",
        required_fields: [],
        renderer: renderInformedConsent,
    },
};

// ── route ──────────────────────────────────────────────────────────────────

<<<<<<< HEAD
export async function POST(request: NextRequest, { params }: RouteContext) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
const prisma = getPrisma();
try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;

    const body = (await request.json().catch(() => ({}))) as {
        template_key?: string;
        payload?: Record<string, unknown>;
        locale?: string;
    };

    const templateKey = (body.template_key ?? "").trim();
    const template = TEMPLATES[templateKey];
    if (!template) {
        throw new ApiError(400, "مفتاح النموذج غير مدعوم");
    }

    const inputPayload = (body.payload ?? {}) as Record<string, unknown>;
    const locale = normalizeLocale(body.locale ?? inputPayload.locale);


    const caseRecord = await prisma.case.findFirst({
        where: {
            id: caseId,
            tenantId,
        },
    });
    if (!caseRecord) {
        throw new ApiError(404, "Case not found");
    }

    const tenantRecord = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, code: true, metadata: true },
    });
    const tenantBranding = tenantRecord ? resolveTenantBranding(tenantRecord) : null;

    const generatedAt = nowIso();
    const refNum = buildTenantReferenceNumber({
        tenantCode: tenantBranding?.code,
        caseId,
        suffix: "REF",
    });

    const ctx: Record<string, string> = {
        case_id: caseId,
        tenant_name: tenantBranding?.name ?? "",
        patient_name: safe(inputPayload.patient_name ?? caseRecord.patientName),
        patient_name_or_guardian: safe(inputPayload.patient_name_or_guardian ?? inputPayload.patient_name ?? caseRecord.patientName),
        patient_id_number: safe(inputPayload.patient_id_number ?? caseRecord.patientIdNumber),
        medical_record_number: safe(inputPayload.medical_record_number ?? caseRecord.medicalRecordNo),
        room_number: safe(inputPayload.room_number ?? caseRecord.roomNumber),
        department: safe(inputPayload.department ?? inputPayload.ward),
        attending_physician: safe(inputPayload.attending_physician),
        nurse_name: safe(inputPayload.nurse_name),
        witness_1_name: safe(inputPayload.witness_1_name),
        witness_2_name: safe(inputPayload.witness_2_name),
        witness1_role: safe(inputPayload.witness1_role),
        witness2_role: safe(inputPayload.witness2_role),
        witness1_signature: safe(inputPayload.witness1_signature),
        witness2_signature: safe(inputPayload.witness2_signature),
        legal_guardian: safe(inputPayload.legal_guardian),
        relationship: safe(inputPayload.relationship),
        date: safe(inputPayload.date) || nowDate(),
        time: safe(inputPayload.time),
        representative_name: safe(inputPayload.representative_name),
        patient_signature: safe(inputPayload.patient_signature),
        representative_signature: safe(inputPayload.representative_signature),
        attending_physician_signature: safe(inputPayload.attending_physician_signature),
        nurse_signature: safe(inputPayload.nurse_signature),
        refusal_reason: safe(inputPayload.refusal_reason),
        discussion_summary: safe(inputPayload.discussion_summary),
        insurance_coverage_status: safe(inputPayload.insurance_coverage_status),
        forms_issued: safe(inputPayload.forms_issued),
        discharge_decision_at: safe(inputPayload.discharge_decision_at),
        generated_at: generatedAt,
        reference_number: refNum,
    };

    const htmlContent = template.renderer(ctx, locale);

    const missingFields = template.required_fields.filter((f) => {
        if (f === "refusal_reason_or_summary") {
            return !ctx.refusal_reason && !ctx.discussion_summary;
        }
        return !ctx[f];
    });

    return NextResponse.json({
        template_key: template.key,
        title: locale === "ar" ? template.title_ar : template.title_en,
        document_code: template.document_code,
        missing_fields: missingFields,
        can_generate: missingFields.length === 0,
        html_content: htmlContent,
        context: ctx,
    });
} catch (error) {
    return handleApiError(error);
}
}
