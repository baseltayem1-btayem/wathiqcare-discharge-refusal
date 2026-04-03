import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
<<<<<<< HEAD
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ─────────────────────────────────────────
=======
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { getPrisma } from "@/lib/server/prisma";
type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

<<<<<<< HEAD
function applyLineValue(text: string, label: string, value: string): string {
    if (!value) return text;

    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return text.replace(
        new RegExp(`(^\\s*${escaped}\\s*)(?:$|\\t.*$)`, "m"),
        (_m, prefix) => `${prefix}${value}`
=======
const prisma = getPrisma();
const caseRecord = await prisma.case.findFirst({
    if(!value) return text;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
        new RegExp(`(^\\s*${escaped}\\s*)(?:$|\\t.*$)`, "m"),
        (_m, prefix) => `${prefix}${value}`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    );
}

function applyDynamicFields(
    lockedText: string,
<<<<<<< HEAD
    ctx: Record<string, string>
): string {
    const mappings: [string, string][] = [
        ["Name of Patient:", safe(ctx.patient_name)],
        ["Contact Numbers:", safe(ctx.contact_numbers)],
        ["Date:", safe(ctx.date)],
        ["Time:", safe(ctx.time)],
        ["Name of Guardian / Representative (Print):", safe(ctx.legal_guardian)],
        ["Relationship to Patient", safe(ctx.relationship)],
        ["Interpreter Name (Print):", safe(ctx.interpreter_name)],
        ["Name (Print):", safe(ctx.hhc_representative_name)],
        ["Designation:", safe(ctx.hhc_representative_designation)],
        ["Care Partner (if identified):", safe(ctx.care_partner_name)],
        ["Relationship:", safe(ctx.care_partner_relationship || ctx.relationship)],
    ];

    let result = lockedText;

    for (const [label, value] of mappings) {
        result = applyLineValue(result, label, value);
    }

    return result;
}

function loadLockedContractText(): string {
    const contractPath = path.join(
        process.cwd(),
        "contracts",
        "HHC_Contract.locked.txt"
    );

    return fs.readFileSync(contractPath, "utf8");
}

function renderHomecareAgreementHtml(ctx: Record<string, string>): string {
    const lockedText = loadLockedContractText();
    const renderedText = applyDynamicFields(lockedText, ctx);

    const contractHtml = `<pre class="contract-text">${escapeHtml(renderedText)}</pre>`;

    return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Home Healthcare Agreement</title>
<style>
body {
    font-family: "Noto Naskh Arabic", "Tahoma", "Arial", sans-serif;
    margin: 20px;
    color: #0f172a;
    font-size: 13px;
    direction: rtl;
}
.contract-text {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
</head>
<body>
${contractHtml}
</body>
</html>`;
}

// ── route ─────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma(); // ✅ FIX

=======
    ctx: Record<string, string>,
): string {
        const mappings: [string, string][] = [
            ["Name of Patient:", safe(ctx.patient_name)],
            ["Contact Numbers:", safe(ctx.contact_numbers)],
            ["Date:", safe(ctx.date)],
            ["Time:", safe(ctx.time)],
            ["Name of Guardian / Representative (Print):", safe(ctx.legal_guardian)],
            ["Relationship to Patient", safe(ctx.relationship)],
            ["Interpreter Name (Print):", safe(ctx.interpreter_name)],
            ["Name (Print):", safe(ctx.hhc_representative_name)],
            ["Designation:", safe(ctx.hhc_representative_designation)],
            ["Care Partner (if identified):", safe(ctx.care_partner_name)],
            ["Relationship:", safe(ctx.care_partner_relationship || ctx.relationship)],
        ];

        let result = lockedText;
        for (const [label, value] of mappings) {
            result = applyLineValue(result, label, value);
        }
        return result;
    }

function loadLockedContractText(): string {
        const contractPath = path.join(process.cwd(), "contracts", "HHC_Contract.locked.txt");
        return fs.readFileSync(contractPath, "utf8");
    }

function renderHomecareAgreementHtml(ctx: Record<string, string>): string {
        const lockedText = loadLockedContractText();
        const renderedText = applyDynamicFields(lockedText, ctx);
        const contractHtml = `<pre class="contract-text">${escapeHtml(renderedText)}</pre>`;

        return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Home Healthcare Agreement</title>
  <style>
    body {
      font-family: "Noto Naskh Arabic", "Amiri", "Tahoma", "Arial", sans-serif;
      margin: 20px;
      color: #0f172a;
      line-height: 1.55;
      font-size: 13px;
      direction: rtl;
    }
    .contract-text {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: inherit;
      font-size: 13px;
      direction: rtl;
      unicode-bidi: plaintext;
    }
  </style>
</head>
<body>
  ${contractHtml}
</body>
</html>`;
    }

// ── route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);
        const { caseId } = await params;

        const body = (await request.json().catch(() => ({}))) as {
            payload?: Record<string, unknown>;
        };
<<<<<<< HEAD

        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;

=======
        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;

        // Fetch case for default patient data
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const caseRecord = await prisma.case.findFirst({
            where: { id: caseId, tenantId },
        });

        const ctx: Record<string, string> = {
            case_id: caseId,
            patient_name: safe(inputPayload.patient_name ?? caseRecord?.patientName),
<<<<<<< HEAD
            urn: safe(inputPayload.urn ?? caseRecord?.medicalRecordNo),
            medical_record_number: safe(inputPayload.medical_record_number ?? caseRecord?.medicalRecordNo),
            room_number: safe(inputPayload.room_number ?? caseRecord?.roomNumber),
            legal_guardian: safe(inputPayload.legal_guardian),
            relationship: safe(inputPayload.relationship),
            contact_numbers: safe(inputPayload.contact_numbers),
            date: safe(inputPayload.date) || new Date().toISOString().slice(0, 10),
            time: safe(inputPayload.time),
=======
            urn: safe(inputPayload.urn ?? inputPayload.medical_record_number ?? caseRecord?.medicalRecordNo),
            medical_record_number: safe(inputPayload.medical_record_number ?? inputPayload.urn ?? caseRecord?.medicalRecordNo),
            current_location: safe(inputPayload.current_location),
            room_number: safe(inputPayload.room_number ?? caseRecord?.roomNumber),
            legal_guardian: safe(inputPayload.legal_guardian),
            relationship: safe(inputPayload.relationship),
            guardian_id: safe(inputPayload.guardian_id),
            ack_homecare_provision: safe(inputPayload.ack_homecare_provision),
            ack_discharge_decision_notice: safe(inputPayload.ack_discharge_decision_notice),
            date: safe(inputPayload.date) || new Date().toISOString().slice(0, 10),
            time: safe(inputPayload.time),
            contact_numbers: safe(inputPayload.contact_numbers),
            interpreter_name: safe(inputPayload.interpreter_name),
            hhc_representative_name: safe(inputPayload.hhc_representative_name),
            hhc_representative_designation: safe(inputPayload.hhc_representative_designation),
            care_partner_name: safe(inputPayload.care_partner_name),
            care_partner_relationship: safe(inputPayload.care_partner_relationship),
            verification_method: safe(inputPayload.verification_method),
            timestamp: new Date().toISOString(),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        };

        const htmlContent = renderHomecareAgreementHtml(ctx);

        return NextResponse.json({
            template_key: "home_healthcare_agreement",
<<<<<<< HEAD
            html_content: htmlContent,
            context: ctx,
        });

    } catch (error) {
        return handleApiError(error);
    }
}
=======
            title: "إقرار وموافقة مستنيرة",
            html_content: htmlContent,
            context: ctx,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
