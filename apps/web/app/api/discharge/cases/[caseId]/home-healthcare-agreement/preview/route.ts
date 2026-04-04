import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

type RouteContext = { params: Promise<{ caseId: string }> };

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

function applyLineValue(text: string, label: string, value: string): string {
    if (!value) return text;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
        new RegExp(`(^\s*${escaped}\s*)(?:$|\t.*$)`, "m"),
        (_m, prefix) => `${prefix}${value}`
    );
}

function applyDynamicFields(
    lockedText: string,
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

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);
        const { caseId } = await params;
        const body = (await request.json().catch(() => ({}))) as {
            payload?: Record<string, unknown>;
        };
        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;
        const caseRecord = await prisma.case.findFirst({
            where: { id: caseId, tenantId },
        });
        const ctx: Record<string, string> = {
            case_id: caseId,
            patient_name: safe(inputPayload.patient_name ?? caseRecord?.patientName),
            urn: safe(inputPayload.urn ?? caseRecord?.medicalRecordNo),
            medical_record_number: safe(inputPayload.medical_record_number ?? caseRecord?.medicalRecordNo),
            room_number: safe(inputPayload.room_number ?? caseRecord?.roomNumber),
            legal_guardian: safe(inputPayload.legal_guardian),
            relationship: safe(inputPayload.relationship),
            contact_numbers: safe(inputPayload.contact_numbers),
            date: safe(inputPayload.date) || new Date().toISOString().slice(0, 10),
            time: safe(inputPayload.time),
            interpreter_name: safe(inputPayload.interpreter_name),
            hhc_representative_name: safe(inputPayload.hhc_representative_name),
            hhc_representative_designation: safe(inputPayload.hhc_representative_designation),
            care_partner_name: safe(inputPayload.care_partner_name),
            care_partner_relationship: safe(inputPayload.care_partner_relationship),
            verification_method: safe(inputPayload.verification_method),
            timestamp: new Date().toISOString(),
        };
        const htmlContent = renderHomecareAgreementHtml(ctx);
        return NextResponse.json({
            template_key: "home_healthcare_agreement",
            html_content: htmlContent,
            context: ctx,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
