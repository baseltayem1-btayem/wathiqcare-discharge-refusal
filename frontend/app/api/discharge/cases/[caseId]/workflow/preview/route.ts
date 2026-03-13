import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

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

function fmtTime(v: unknown): string {
    if (!v) return "";
    try {
        return new Date(String(v)).toISOString().slice(11, 16);
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

// ── renderers ──────────────────────────────────────────────────────────────

function renderDischargeRefusalForm(ctx: Record<string, string>): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Medical Discharge Refusal Form</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }
    h1, h2, h3 { margin: 0; }
    .mt { margin-top: 14px; }
    .line { border-bottom: 1px solid #334155; min-height: 20px; }
    .small { font-size: 12px; color: #334155; }
  </style>
</head>
<body>
  <p>Form Code: IMC-PAT-DIS-REF-01</p>
  <p>International Medical Center - Jeddah</p>
  <h1>Medical Discharge Refusal Form</h1>

  <div class="mt">Patient Name: ${safe(ctx.patient_name)}</div>
  <div>Medical Record Number (MRN): ${safe(ctx.medical_record_number)}</div>
  <div>National ID / Iqama Number: ${safe(ctx.patient_id_number)}</div>
  <div>Room Number: ${safe(ctx.room_number)}</div>
  <div>Department/Ward: ${safe(ctx.department)}</div>

  <div class="mt">Date of Medical Discharge Decision: ${fmtDate(ctx.discharge_decision_at)}</div>
  <div>Attending Physician: ${safe(ctx.attending_physician)}</div>

  <h2 class="mt">Declaration of Medical Discharge Refusal</h2>
  <p>I acknowledge that I have received and understood the medical discharge decision.</p>
  <p>I hereby acknowledge that the attending physician has informed me that I am medically fit for discharge and that continued hospitalization is no longer medically necessary.</p>
  <p>The attending physician and the healthcare team have explained to me the medical condition, the recommended discharge plan, and the potential risks associated with remaining in the hospital after the medical discharge decision.</p>
  <p>Despite this explanation, I voluntarily choose to remain in the hospital and refuse to proceed with the discharge process at this time.</p>
  <p>I understand that my decision may expose me to medical, administrative, and financial consequences.</p>
  <p>I further acknowledge that I have been given the opportunity to ask questions and that all my questions have been answered to my satisfaction.</p>
  <p>By signing below, I confirm that my refusal of discharge is made voluntarily and without coercion.</p>

  <div class="mt">Patient / Legal Representative Name: ${safe(ctx.patient_name)}</div>
  <div>Relationship to Patient (if applicable): ${safe(ctx.relationship)}</div>
  <div>Signature: ${safe(ctx.patient_signature)}</div>
  <div>Date: ${fmtDate(ctx.generated_at)}</div>
  <div>Time: ${safe(ctx.time) || fmtTime(ctx.generated_at)}</div>

  <h3 class="mt">If the Patient Refuses to Sign</h3>
  <p>If the patient or legal representative refuses to sign this form, the refusal shall be documented in the presence of two healthcare staff witnesses.</p>

  <div>Witness 1 Name: ${safe(ctx.witness_1_name)}</div>
  <div>Position: ${safe(ctx.witness1_role)}</div>
  <div>Signature: ${safe(ctx.witness1_signature)}</div>
  <div>Date: ${fmtDate(ctx.generated_at)}</div>

  <div class="mt">Witness 2 Name: ${safe(ctx.witness_2_name)}</div>
  <div>Position: ${safe(ctx.witness2_role)}</div>
  <div>Signature: ${safe(ctx.witness2_signature)}</div>
  <div>Date: ${fmtDate(ctx.generated_at)}</div>

  <div class="mt">Attending Physician Signature: ${safe(ctx.attending_physician_signature)}</div>
  <div>Name: ${safe(ctx.attending_physician)}</div>
  <div>Date: ${fmtDate(ctx.generated_at)}</div>

  <div class="mt">Nursing Staff Signature: ${safe(ctx.nurse_signature)}</div>
  <div>Name: ${safe(ctx.nurse_name)}</div>
  <div>Date: ${fmtDate(ctx.generated_at)}</div>
</body>
</html>`;
}

function renderFinancialResponsibilityNotice(ctx: Record<string, string>): string {
    const patientOrGuardian = safe(ctx.patient_name_or_guardian || ctx.patient_name);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Notification and Acknowledgment of Financial Responsibility</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }
    h1 { margin: 0; }
  </style>
</head>
<body>
  <p>International Medical Center - Jeddah</p>
  <h1>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</h1>

  <p>Date: ${fmtDate(ctx.generated_at)}</p>
  <p>Reference No.: ${safe(ctx.reference_number)}</p>
  <p>To: ${patientOrGuardian}</p>
  <p>National ID Number: ${safe(ctx.patient_id_number)}</p>
  <p>Medical Record Number: ${safe(ctx.medical_record_number)}</p>
  <p>Room Number: ${safe(ctx.room_number)}</p>

  <p>Dear Patient,</p>
  <p>This is to formally notify you that despite completion of medical discharge criteria, you have chosen to remain in the hospital.</p>
  <p>We would like to inform you that on ${fmtDate(ctx.discharge_decision_at)}, the attending physician has issued a medical discharge decision confirming that you are medically fit for discharge and that continued hospitalization is no longer medically required.</p>
  <p>As you have chosen to remain in the hospital beyond the medical discharge decision, please be advised that insurance providers or guarantor entities may not cover any hospitalization costs or services provided after the discharge decision has been issued.</p>
  <p>Accordingly, you may be personally responsible for all costs associated with your continued stay in the hospital, including but not limited to:</p>

  <p>• Accommodation and room charges</p>
  <p>• Nursing services</p>
  <p>• Medical consultations</p>
  <p>• Medications</p>
  <p>• Laboratory tests</p>
  <p>• Radiology services</p>
  <p>• Any additional medical or administrative services provided during the extended stay</p>

  <p>By signing below, you acknowledge that you have been informed of the medical discharge decision and that you understand and accept full financial responsibility for any costs incurred due to your decision to remain in the hospital after the discharge decision.</p>

  <p>Patient / Legal Representative Name: ${safe(ctx.patient_name)}</p>
  <p>Signature: ${safe(ctx.patient_signature)}</p>
  <p>Date: ${fmtDate(ctx.generated_at)}</p>
  <p>Time: ${safe(ctx.time) || fmtTime(ctx.generated_at)}</p>

  <p>Hospital Representative Name: ${safe(ctx.representative_name)}</p>
  <p>Department: ${safe(ctx.department)}</p>
  <p>Signature: ${safe(ctx.representative_signature)}</p>
  <p>Date: ${fmtDate(ctx.generated_at)}</p>
</body>
</html>`;
}

function renderInformedConsent(ctx: Record<string, string>): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Acknowledgment and Informed Consent</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }
    h1 { margin: 0; }
    .muted { color: #475569; }
    .section { margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
    .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .line { margin-top: 20px; border-top: 1px solid #64748b; min-height: 24px; }
  </style>
</head>
<body>
  <h1>Acknowledgment &amp; Informed Consent</h1>
  <p class="muted">Reference: <strong>${safe(ctx.reference_number)}</strong></p>

  <div class="section">
    <div class="grid">
      <div><div class="label">Patient Name</div><div class="value">${safe(ctx.patient_name)}</div></div>
      <div><div class="label">ID Number</div><div class="value">${safe(ctx.patient_id_number)}</div></div>
      <div><div class="label">Medical Record Number</div><div class="value">${safe(ctx.medical_record_number)}</div></div>
      <div><div class="label">Room Number</div><div class="value">${safe(ctx.room_number)}</div></div>
      <div><div class="label">Attending Physician</div><div class="value">${safe(ctx.attending_physician)}</div></div>
      <div><div class="label">Decision Date</div><div class="value">${fmtDatetime(ctx.discharge_decision_at)}</div></div>
    </div>
  </div>

  <div class="section">
    <p>I acknowledge that the care team provided clear information about my medical condition, recommended discharge plan, expected outcomes, potential risks of refusal, and available alternatives.</p>
    <p>I confirm that my questions were answered and I understand the implications of the decision.</p>
    <p>Documented summary: <strong>${safe(ctx.discussion_summary || ctx.refusal_reason)}</strong></p>
  </div>

  <div class="section">
    <div class="grid">
      <div>
        <div class="label">Patient / Legal Guardian Signature</div>
        <div class="line"></div>
      </div>
      <div>
        <div class="label">Attending Physician Signature</div>
        <div class="line"></div>
      </div>
    </div>
    <p style="font-size:11px;color:#64748b;margin-top:12px;">Date: ${fmtDate(ctx.generated_at)}</p>
  </div>
</body>
</html>`;
}

// ── template registry ──────────────────────────────────────────────────────

type TemplateInfo = {
    key: string;
    title: string;
    document_code: string;
    required_fields: string[];
    renderer: (ctx: Record<string, string>) => string;
};

const TEMPLATES: Record<string, TemplateInfo> = {
    discharge_refusal_form: {
        key: "discharge_refusal_form",
        title: "Medical Discharge Refusal Form",
        document_code: "IMC-PAT-DIS-REF-01",
        required_fields: ["discharge_decision_at", "refusal_reason_or_summary"],
        renderer: renderDischargeRefusalForm,
    },
    financial_responsibility_notice: {
        key: "financial_responsibility_notice",
        title: "Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge",
        document_code: "IMC-PAT-DIS-NOT-01",
        required_fields: ["discharge_decision_at"],
        renderer: renderFinancialResponsibilityNotice,
    },
    informed_consent: {
        key: "informed_consent",
        title: "Acknowledgment and Informed Consent",
        document_code: "IMC-PAT-CONS-01",
        required_fields: [],
        renderer: renderInformedConsent,
    },
};

// ── route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = requireAuth(request);
        const { caseId } = await params;

        const body = (await request.json().catch(() => ({}))) as {
            template_key?: string;
            payload?: Record<string, unknown>;
        };

        const templateKey = (body.template_key ?? "").trim();
        const template = TEMPLATES[templateKey];
        if (!template) {
            throw new ApiError(400, "مفتاح النموذج غير مدعوم");
        }

        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;

        // Fetch case data for context enrichment
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) {
            throw new ApiError(404, "Case not found");
        }
        if (caseRecord.tenantId !== auth.tenant_id) {
            throw new ApiError(403, "Tenant access denied");
        }

        const generatedAt = nowIso();
        const refNum = `IMC-REF-${caseId.slice(0, 8).toUpperCase()}-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}`;

        const ctx: Record<string, string> = {
            case_id: caseId,
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

        const htmlContent = template.renderer(ctx);

        const missingFields = template.required_fields.filter((f) => {
            if (f === "refusal_reason_or_summary") {
                return !ctx.refusal_reason && !ctx.discussion_summary;
            }
            return !ctx[f];
        });

        return NextResponse.json({
            template_key: template.key,
            title: template.title,
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
