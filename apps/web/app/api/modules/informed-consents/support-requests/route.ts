import { NextRequest, NextResponse } from 'next/server';

const LEGAL_SUPPORT_EMAIL = 'Lawyers@linagroups.com';

type SupportRequestPayload = {
  type?: 'legal-consultation' | 'technical-ticket';
  requestType?: string;
  priority?: string;
  description?: string;
  context?: Record<string, unknown>;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildLegalEmailHtml(payload: SupportRequestPayload) {
  const context = payload.context || {};

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2 style="color:#002B5C;margin-bottom:8px">WathiqCare - Legal Consultation Request</h2>
      <p>A new legal consultation request has been submitted from the WathiqCare Physician Portal.</p>

      <table style="border-collapse:collapse;width:100%;margin-top:16px">
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Request Type</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(payload.requestType)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Priority</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(payload.priority)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Description</td>
          <td style="border:1px solid #d8dce3;padding:8px;white-space:pre-wrap">${escapeHtml(payload.description)}</td>
        </tr>
      </table>

      <h3 style="color:#002B5C;margin-top:24px">Automatic Context</h3>
      <table style="border-collapse:collapse;width:100%">
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">User</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.user)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Specialty</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.specialty)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">License No.</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.licenseNumber)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Page</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.page)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Timestamp</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.timestamp)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #d8dce3;padding:8px;font-weight:bold;background:#f4f6f9">Session Reference</td>
          <td style="border:1px solid #d8dce3;padding:8px">${escapeHtml(context.sessionReference)}</td>
        </tr>
      </table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SupportRequestPayload;

    if (payload.type !== 'legal-consultation') {
      return NextResponse.json(
        { ok: false, message: 'Only legal-consultation requests are supported by this endpoint for now.' },
        { status: 400 },
      );
    }

    if (!payload.description?.trim()) {
      return NextResponse.json(
        { ok: false, message: 'Description is required.' },
        { status: 400 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.SUPPORT_EMAIL_FROM || 'WathiqCare <onboarding@resend.dev>';

    if (!resendApiKey) {
      return NextResponse.json(
        { ok: false, message: 'RESEND_API_KEY is not configured.' },
        { status: 503 },
      );
    }

    const subject = `[WathiqCare] Legal Consultation Request - ${payload.priority || 'Normal'}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [LEGAL_SUPPORT_EMAIL],
        subject,
        html: buildLegalEmailHtml(payload),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: 'Failed to send legal consultation email.', details: result },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Legal consultation request sent successfully.',
      to: LEGAL_SUPPORT_EMAIL,
      emailResult: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Unexpected error while sending support request.',
      },
      { status: 500 },
    );
  }
}
