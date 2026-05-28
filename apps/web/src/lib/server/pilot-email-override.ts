import { Prisma } from "@prisma/client";
import { getEnvironmentConfig } from "@/lib/environment/environment";
import { ApiError } from "@/lib/server/http";
import {
  buildWathiqCareEmailHtml,
  buildWathiqCareEmailText,
  sendEmailWithDiagnostics,
  type EmailDiagnostics,
} from "@/lib/server/email-provider";
import { getPrisma } from "@/lib/server/prisma";

const prisma = () => getPrisma();

const DEFAULT_OVERRIDE_RECIPIENT = "Admin@wathiqcare.med.sa";

export type PilotEmailOverrideNotificationType =
  | "secure_signing_otp"
  | "secure_signing_link"
  | "patient_copy_notification";

export type PilotEmailOverrideResult = {
  active: boolean;
  recipient: string | null;
  intendedRecipient: string | null;
  status: "disabled" | "sent" | "failed";
  auditId: string | null;
  diagnostics: EmailDiagnostics | null;
  failureReason: string | null;
};

export type SecureSigningEmailResult = {
  recipient: string | null;
  status: "sent" | "failed";
  auditId: string | null;
  diagnostics: EmailDiagnostics | null;
  failureReason: string | null;
};

type SecureSigningEmailAuditArgs = {
  tenantId: string;
  caseId?: string | null;
  recipient: string;
  notificationType: PilotEmailOverrideNotificationType;
  status: "sent" | "failed";
  failureReason?: string | null;
  diagnostics?: EmailDiagnostics | null;
  metadata?: Record<string, unknown>;
};

type SecureSigningEmailDependencies = {
  sendEmail: typeof sendEmailWithDiagnostics;
  recordAuditAttempt: (args: SecureSigningEmailAuditArgs) => Promise<string | null>;
};

function parseOverrideFlag(raw?: string): boolean | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

export function getPilotEmailOverrideConfig() {
  const environment = getEnvironmentConfig();
  const explicitFlag = parseOverrideFlag(process.env.PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED);
  const enabled = explicitFlag ?? (environment.isPilot || environment.isUAT);

  return {
    enabled: enabled && (environment.isPilot || environment.isUAT),
    environment: environment.env,
    recipient: process.env.PILOT_EMAIL_OVERRIDE_RECIPIENT?.trim() || DEFAULT_OVERRIDE_RECIPIENT,
    label: "PILOT TESTING ONLY",
  };
}

async function recordEmailAuditAttempt(args: {
  tenantId: string;
  caseId?: string | null;
  recipient: string;
  notificationType: PilotEmailOverrideNotificationType;
  status: "sent" | "failed";
  failureReason?: string | null;
  diagnostics?: EmailDiagnostics | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const created = await prisma().notificationDeliveryAttempt.create({
    data: {
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      channel: "email",
      provider: args.diagnostics?.provider ?? "smtp",
      recipient: args.recipient,
      notificationType: args.notificationType,
      status: args.status,
      statusCode: null,
      failureReason: args.failureReason ?? null,
      metadataJson: {
        ...(args.metadata ?? {}),
        provider: args.diagnostics?.provider ?? "smtp",
        messageId: args.diagnostics?.messageId ?? null,
        smtpAccepted: args.diagnostics?.smtpAccepted ?? [],
        smtpRejected: args.diagnostics?.smtpRejected ?? [],
        smtpSendResponse: args.diagnostics?.smtpSendResponse ?? null,
      } as Prisma.JsonObject,
    },
    select: {
      id: true,
    },
  });

  return created.id;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function buildPatientRequestReference(documentId: string): string {
  const normalized = (documentId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const short = normalized.slice(0, 10) || "UNKNOWN";
  return `REQ-${short}`;
}

function buildEnterpriseSecureSigningEmailTemplate(args: {
  patientName: string;
  signingUrl: string;
  expiresMinutes: number;
  documentId: string;
  institutionName: string;
}): { html: string; text: string; subject: string } {
  const baseUrl = getBaseUrl();
  const requestReference = buildPatientRequestReference(args.documentId);
  const safePatientName = (args.patientName || "Patient").replace(/[<>]/g, "");
  const expiresText = `${args.expiresMinutes} minutes`;
  const subject = "Electronic Informed Consent Request | طلب مراجعة وتوقيع الموافقة";
  const imcLogo = `${baseUrl}/images/imc-logo.png`;
  const wathiqcareLogo = `${baseUrl}/images/wathiqcare-logo.png`;

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Electronic Informed Consent Request</title>
</head>
<body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#2F2F2F;">
  <div style="display:none;font-size:1px;color:#eef3f8;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">Electronic informed consent review and signing request from International Medical Center.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3f8;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;background:#FFFFFF;border:1px solid #d7e1ec;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#FFFFFF;padding:18px 20px;border-bottom:4px solid #C9A13B;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle" style="width:50%;">
                    <img src="${imcLogo}" alt="International Medical Center" width="132" style="display:block;width:132px;max-width:100%;height:auto;border:0;" />
                  </td>
                  <td align="right" valign="middle" style="width:50%;">
                    <img src="${wathiqcareLogo}" alt="Powered by WathiqCare" width="144" style="display:block;width:144px;max-width:100%;height:auto;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:10px;font-size:12px;line-height:18px;color:#1f2937;font-weight:600;">
                    International Medical Center (IMC) · Powered by WathiqCare™
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 22px 12px;">
              <h1 style="margin:0 0 10px;font-size:26px;line-height:32px;color:#002B5C;font-weight:700;">Electronic Informed Consent Request</h1>
              <p style="margin:0 0 14px;font-size:20px;line-height:30px;color:#002B5C;font-weight:700;" dir="rtl">طلب مراجعة وتوقيع الموافقة المستنيرة الإلكترونية</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:24px;color:#2F2F2F;">You have received a secure consent review and signing request from International Medical Center.</p>
              <p style="margin:0;font-size:15px;line-height:24px;color:#2F2F2F;" dir="rtl">لقد تم إرسال طلب مراجعة وتوقيع موافقة مستنيرة إلكترونية من المركز الطبي الدولي.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fbff;border:1px solid #d8e6f7;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;">✓ Verified by International Medical Center</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;">✓ Powered by WathiqCare</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;">✓ Secure Encrypted Access</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;">✓ OTP Verification Required</p>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#2F2F2F;">✓ Electronic Audit Trail Enabled</p>
                    <hr style="border:none;border-top:1px solid #dbe7f4;margin:12px 0;" />
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">✓ تم التحقق من الطلب من المركز الطبي الدولي</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">✓ مدعوم من وثيق كير</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">✓ وصول آمن ومشفر</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">✓ يتطلب التحقق عبر رمز OTP</p>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">✓ سجل تدقيق إلكتروني مفعل</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e1e7ef;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;font-size:15px;line-height:22px;font-weight:700;color:#002B5C;">Patient Action Steps</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;">1. Review consent information</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;">2. Review educational materials</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;">3. Verify identity using OTP</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;">4. Confirm understanding</p>
                    <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#2F2F2F;">5. Sign electronically</p>
                    <p style="margin:0 0 6px;font-size:15px;line-height:22px;font-weight:700;color:#002B5C;" dir="rtl">خطوات المريض</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">1. مراجعة معلومات الموافقة</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">2. مراجعة المواد التعليمية</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">3. التحقق من الهوية باستخدام رمز OTP</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">4. تأكيد الفهم</p>
                    <p style="margin:0;font-size:14px;line-height:22px;color:#2F2F2F;" dir="rtl">5. التوقيع إلكترونيًا</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fbff;border:1px solid #d8e6f7;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#4d5d72;"><strong style="color:#002B5C;">Patient Name:</strong> ${safePatientName}</p>
                    <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#4d5d72;"><strong style="color:#002B5C;">Request Reference Number:</strong> ${requestReference}</p>
                    <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#4d5d72;"><strong style="color:#002B5C;">Expiration Time:</strong> ${expiresText}</p>
                    <p style="margin:0;font-size:13px;line-height:20px;color:#4d5d72;"><strong style="color:#002B5C;">Institution Name:</strong> ${args.institutionName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 22px 0;">
              <a href="${args.signingUrl}" style="display:inline-block;background:#002B5C;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:17px;line-height:24px;padding:14px 32px;border-radius:8px;border:2px solid #C9A13B;">
                Review &amp; Sign Consent<br/><span dir="rtl" style="font-size:16px;line-height:22px;">مراجعة وتوقيع الموافقة</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 22px 0;">
              <p style="margin:0;font-size:12px;line-height:20px;color:#5f6f82;word-break:break-all;">Fallback URL: <a href="${args.signingUrl}" style="color:#4B9CD3;text-decoration:underline;">${args.signingUrl}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8ec;border:1px solid #ead6a4;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#2F2F2F;"><strong>Security Notice:</strong> This secure link is intended only for the patient or authorized legal representative. Do not share this link with others.</p>
                    <p style="margin:0;font-size:13px;line-height:22px;color:#2F2F2F;" dir="rtl"><strong>تنبيه أمني:</strong> هذا الرابط الآمن مخصص للمريض أو لممثله النظامي فقط. يرجى عدم مشاركة الرابط مع أي شخص آخر.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 22px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e3e9f0;">
                <tr>
                  <td style="padding-top:14px;font-size:12px;line-height:20px;color:#5f6f82;">
                    <strong style="color:#002B5C;">International Medical Center (IMC)</strong><br />
                    Powered by WathiqCare™<br />
                    Support Contact: <a href="mailto:support@wathiqcare.online" style="color:#4B9CD3;text-decoration:none;">support@wathiqcare.online</a><br />
                    Privacy Notice: <a href="${baseUrl}/privacy" style="color:#4B9CD3;text-decoration:none;">${baseUrl}/privacy</a><br />
                    Official Website: <a href="${baseUrl}" style="color:#4B9CD3;text-decoration:none;">${baseUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "Electronic Informed Consent Request",
    "طلب مراجعة وتوقيع الموافقة المستنيرة الإلكترونية",
    "",
    "You have received a secure consent review and signing request from International Medical Center.",
    "لقد تم إرسال طلب مراجعة وتوقيع موافقة مستنيرة إلكترونية من المركز الطبي الدولي.",
    "",
    "Trust Indicators:",
    "- Verified by International Medical Center",
    "- Powered by WathiqCare",
    "- Secure Encrypted Access",
    "- OTP Verification Required",
    "- Electronic Audit Trail Enabled",
    "",
    "مؤشرات الثقة:",
    "- تم التحقق من الطلب من المركز الطبي الدولي",
    "- مدعوم من وثيق كير",
    "- وصول آمن ومشفر",
    "- يتطلب التحقق عبر رمز OTP",
    "- سجل تدقيق إلكتروني مفعل",
    "",
    "Patient Action Steps:",
    "1) Review consent information",
    "2) Review educational materials",
    "3) Verify identity using OTP",
    "4) Confirm understanding",
    "5) Sign electronically",
    "",
    "خطوات المريض:",
    "1) مراجعة معلومات الموافقة",
    "2) مراجعة المواد التعليمية",
    "3) التحقق من الهوية باستخدام رمز OTP",
    "4) تأكيد الفهم",
    "5) التوقيع إلكترونيًا",
    "",
    `Patient Name: ${safePatientName}`,
    `Request Reference Number: ${requestReference}`,
    `Expiration Time: ${expiresText}`,
    `Institution Name: ${args.institutionName}`,
    "",
    `Review & Sign Consent / مراجعة وتوقيع الموافقة: ${args.signingUrl}`,
    "",
    "Security Notice: This secure link is intended only for the patient or authorized legal representative. Do not share this link with others.",
    "هذا الرابط الآمن مخصص للمريض أو لممثله النظامي فقط. يرجى عدم مشاركة الرابط مع أي شخص آخر.",
    "",
    "International Medical Center (IMC)",
    "Powered by WathiqCare™",
    `Support Contact: support@wathiqcare.online`,
    `Privacy Notice: ${baseUrl}/privacy`,
    `Official Website: ${baseUrl}`,
  ].join("\n");

  return { html, text, subject };
}

function wasRecipientAcceptedByProvider(diagnostics: EmailDiagnostics, recipientEmail: string): boolean {
  const normalizedRecipient = normalizeRecipientEmail(recipientEmail);
  const accepted = (diagnostics.smtpAccepted ?? []).map(normalizeRecipientEmail);
  const rejected = (diagnostics.smtpRejected ?? []).map(normalizeRecipientEmail);

  if (accepted.includes(normalizedRecipient)) {
    return true;
  }

  return accepted.length > 0 && !rejected.includes(normalizedRecipient);
}

export async function sendPilotOverrideEmail(args: {
  tenantId: string;
  caseId?: string | null;
  intendedRecipient?: string | null;
  notificationType: PilotEmailOverrideNotificationType;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<PilotEmailOverrideResult> {
  const override = getPilotEmailOverrideConfig();
  if (!override.enabled) {
    return {
      active: false,
      recipient: null,
      intendedRecipient: args.intendedRecipient ?? null,
      status: "disabled",
      auditId: null,
      diagnostics: null,
      failureReason: null,
    };
  }

  try {
    const diagnostics = await sendEmailWithDiagnostics({
      to: override.recipient,
      subject: `${override.label} | ${args.subject}`,
      html: args.html,
      text: args.text,
    });

    const auditId = await recordEmailAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: override.recipient,
      notificationType: args.notificationType,
      status: "sent",
      diagnostics,
      metadata: {
        pilotTestingOnly: true,
        overrideLabel: override.label,
        overrideEnvironment: override.environment,
        overrideRecipient: override.recipient,
        intendedRecipient: args.intendedRecipient ?? null,
        ...(args.metadata ?? {}),
      },
    });

    return {
      active: true,
      recipient: override.recipient,
      intendedRecipient: args.intendedRecipient ?? null,
      status: "sent",
      auditId,
      diagnostics,
      failureReason: null,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    const auditId = await recordEmailAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: override.recipient,
      notificationType: args.notificationType,
      status: "failed",
      failureReason,
      metadata: {
        pilotTestingOnly: true,
        overrideLabel: override.label,
        overrideEnvironment: override.environment,
        overrideRecipient: override.recipient,
        intendedRecipient: args.intendedRecipient ?? null,
        ...(args.metadata ?? {}),
      },
    });

    return {
      active: true,
      recipient: override.recipient,
      intendedRecipient: args.intendedRecipient ?? null,
      status: "failed",
      auditId,
      diagnostics: null,
      failureReason,
    };
  }
}

export async function sendPilotSigningOtpEmail(args: {
  tenantId: string;
  caseId?: string | null;
  otpCode: string;
  linkUrl: string;
  expiresMinutes: number;
  sessionId: string;
  documentId: string;
  challengeId: string;
  mobileNumber: string;
  moduleType: string;
  locale?: "ar" | "en";
}): Promise<PilotEmailOverrideResult> {
  const title = "Internal Pilot OTP Delivery Override";
  const expiresNote = `This OTP expires in ${args.expiresMinutes} minutes.`;
  const html = buildWathiqCareEmailHtml({
    title,
    preheader: "PILOT TESTING ONLY secure signing OTP delivery.",
    bodyHtml: `<p><strong>PILOT TESTING ONLY.</strong> This temporary email override is active until Taqnyat SMS production credentials are configured.</p><p>OTP Code: <strong style=\"font-size:20px;letter-spacing:0.18em;\">${args.otpCode}</strong></p><p>Document ID: <strong>${args.documentId}</strong></p><p>Signing Session ID: <strong>${args.sessionId}</strong></p><p>Original mobile target: <strong>${args.mobileNumber}</strong></p>`,
    ctaUrl: args.linkUrl,
    ctaText: "Open Signing Link",
    expiresNote,
    securityNote: "PILOT TESTING ONLY. Disable PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED immediately after SMS production setup is complete.",
  });
  const text = buildWathiqCareEmailText({
    title,
    bodyLines: [
      "PILOT TESTING ONLY temporary OTP override.",
      `OTP Code: ${args.otpCode}`,
      `Document ID: ${args.documentId}`,
      `Signing Session ID: ${args.sessionId}`,
      `Original mobile target: ${args.mobileNumber}`,
    ],
    ctaUrl: args.linkUrl,
    ctaLabel: "Open Signing Link",
    expiresNote,
    securityNote: "Disable PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED after SMS production setup is complete.",
  });

  return sendPilotOverrideEmail({
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    intendedRecipient: args.mobileNumber,
    notificationType: "secure_signing_otp",
    subject: `${title} | ${args.documentId}`,
    html,
    text,
    metadata: {
      sessionId: args.sessionId,
      documentId: args.documentId,
      challengeId: args.challengeId,
      moduleType: args.moduleType,
      locale: args.locale ?? "ar",
    },
  });
}

export async function sendSecureSigningLinkEmail(args: {
  tenantId: string;
  caseId?: string | null;
  patientName: string;
  recipientEmail: string;
  mobileNumber: string;
  signingUrl: string;
  expiresMinutes: number;
  documentId: string;
  sessionId: string;
  moduleKey: string;
  locale?: "ar" | "en";
}, dependencies?: Partial<SecureSigningEmailDependencies>): Promise<SecureSigningEmailResult> {
  const recipientEmail = normalizeRecipientEmail(args.recipientEmail);
  if (!isValidRecipientEmail(recipientEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const sendEmail = dependencies?.sendEmail ?? sendEmailWithDiagnostics;
  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
  const template = buildEnterpriseSecureSigningEmailTemplate({
    patientName: args.patientName,
    signingUrl: args.signingUrl,
    expiresMinutes: args.expiresMinutes,
    documentId: args.documentId,
    institutionName: "International Medical Center (IMC)",
  });

  try {
    const diagnostics = await sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!wasRecipientAcceptedByProvider(diagnostics, recipientEmail)) {
      const failureReason = "Secure signing email provider did not accept the patient recipient email";
      const auditId = await recordAuditAttempt({
        tenantId: args.tenantId,
        caseId: args.caseId ?? null,
        recipient: recipientEmail,
        notificationType: "secure_signing_link",
        status: "failed",
        failureReason,
        diagnostics,
        metadata: {
          sessionId: args.sessionId,
          documentId: args.documentId,
          moduleKey: args.moduleKey,
          locale: args.locale ?? "ar",
          patientName: args.patientName,
          mobileNumber: args.mobileNumber,
        },
      });

      return {
        recipient: recipientEmail,
        status: "failed",
        auditId,
        diagnostics,
        failureReason,
      };
    }

    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "secure_signing_link",
      status: "sent",
      diagnostics,
      metadata: {
        sessionId: args.sessionId,
        documentId: args.documentId,
        moduleKey: args.moduleKey,
        locale: args.locale ?? "ar",
        patientName: args.patientName,
        mobileNumber: args.mobileNumber,
      },
    });

    return {
      recipient: recipientEmail,
      status: "sent",
      auditId,
      diagnostics,
      failureReason: null,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "secure_signing_link",
      status: "failed",
      failureReason,
      metadata: {
        sessionId: args.sessionId,
        documentId: args.documentId,
        moduleKey: args.moduleKey,
        locale: args.locale ?? "ar",
        patientName: args.patientName,
        mobileNumber: args.mobileNumber,
      },
    });

    return {
      recipient: recipientEmail,
      status: "failed",
      auditId,
      diagnostics: null,
      failureReason,
    };
  }
}

export async function sendPilotPatientCopyEmail(args: {
  tenantId: string;
  caseId?: string | null;
  patientName: string | null;
  documentId: string;
  consentReference: string | null;
  copyType: string;
}): Promise<PilotEmailOverrideResult> {
  const title = "Internal Pilot Patient Copy Notification Override";
  const ctaUrl = `${getBaseUrl()}/modules/informed-consents`;
  const reference = args.consentReference || args.documentId;
  const html = buildWathiqCareEmailHtml({
    title,
    preheader: "PILOT TESTING ONLY patient copy notification.",
    bodyHtml: `<p><strong>PILOT TESTING ONLY.</strong> A patient copy package was generated.</p><p>Consent Reference: <strong>${reference}</strong></p><p>Document ID: <strong>${args.documentId}</strong></p><p>Copy Type: <strong>${args.copyType}</strong></p><p>Patient: <strong>${args.patientName || "Unknown patient"}</strong></p>`,
    ctaUrl,
    ctaText: "Open Consent Module",
    securityNote: "PILOT TESTING ONLY. Disable PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED immediately after SMS production setup is complete.",
  });
  const text = buildWathiqCareEmailText({
    title,
    bodyLines: [
      "PILOT TESTING ONLY patient copy notification.",
      `Consent Reference: ${reference}`,
      `Document ID: ${args.documentId}`,
      `Copy Type: ${args.copyType}`,
      `Patient: ${args.patientName || "Unknown patient"}`,
    ],
    ctaUrl,
    ctaLabel: "Open Consent Module",
    securityNote: "Disable PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED after SMS production setup is complete.",
  });

  return sendPilotOverrideEmail({
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    intendedRecipient: null,
    notificationType: "patient_copy_notification",
    subject: `${title} | ${reference}`,
    html,
    text,
    metadata: {
      documentId: args.documentId,
      consentReference: args.consentReference,
      copyType: args.copyType,
    },
  });
}

export async function sendSigningOtpEmail(args: {
  tenantId: string;
  caseId?: string | null;
  recipientEmail: string;
  otpCode: string;
  linkUrl: string;
  expiresMinutes: number;
  sessionId: string;
  documentId: string;
  challengeId: string;
  mobileNumber: string;
  moduleType: string;
  locale?: "ar" | "en";
}, dependencies?: Partial<SecureSigningEmailDependencies>): Promise<SecureSigningEmailResult> {
  const recipientEmail = normalizeRecipientEmail(args.recipientEmail);
  if (!isValidRecipientEmail(recipientEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const sendEmail = dependencies?.sendEmail ?? sendEmailWithDiagnostics;
  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
  const title = "Secure Signing OTP";
  const expiresNote = `This OTP expires in ${args.expiresMinutes} minutes.`;
  const html = buildWathiqCareEmailHtml({
    title,
    preheader: "Your secure signing OTP is ready.",
    bodyHtml: `<p>Your secure signing one-time password (OTP) is:</p><p><strong style=\"font-size:20px;letter-spacing:0.18em;\">${args.otpCode}</strong></p><p>Document ID: <strong>${args.documentId}</strong></p><p>Signing Session ID: <strong>${args.sessionId}</strong></p><p>Mobile target: <strong>${args.mobileNumber}</strong></p>`,
    ctaUrl: args.linkUrl,
    ctaText: "Open Secure Signing",
    expiresNote,
    securityNote: "Do not share this OTP with anyone. If you did not request this OTP, contact support immediately.",
  });
  const text = buildWathiqCareEmailText({
    title,
    bodyLines: [
      `OTP Code: ${args.otpCode}`,
      `Document ID: ${args.documentId}`,
      `Signing Session ID: ${args.sessionId}`,
      `Mobile target: ${args.mobileNumber}`,
    ],
    ctaUrl: args.linkUrl,
    ctaLabel: "Open Secure Signing",
    expiresNote,
    securityNote: "Do not share this OTP with anyone.",
  });

  try {
    const diagnostics = await sendEmail({
      to: recipientEmail,
      subject: `${title} | ${args.documentId}`,
      html,
      text,
    });

    if (!wasRecipientAcceptedByProvider(diagnostics, recipientEmail)) {
      const failureReason = "OTP email provider did not accept the patient recipient email";
      const auditId = await recordAuditAttempt({
        tenantId: args.tenantId,
        caseId: args.caseId ?? null,
        recipient: recipientEmail,
        notificationType: "secure_signing_otp",
        status: "failed",
        failureReason,
        diagnostics,
        metadata: {
          sessionId: args.sessionId,
          documentId: args.documentId,
          challengeId: args.challengeId,
          moduleType: args.moduleType,
          locale: args.locale ?? "ar",
          mobileNumber: args.mobileNumber,
        },
      });

      return {
        recipient: recipientEmail,
        status: "failed",
        auditId,
        diagnostics,
        failureReason,
      };
    }

    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "secure_signing_otp",
      status: "sent",
      diagnostics,
      metadata: {
        sessionId: args.sessionId,
        documentId: args.documentId,
        challengeId: args.challengeId,
        moduleType: args.moduleType,
        locale: args.locale ?? "ar",
        mobileNumber: args.mobileNumber,
      },
    });

    return {
      recipient: recipientEmail,
      status: "sent",
      auditId,
      diagnostics,
      failureReason: null,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "secure_signing_otp",
      status: "failed",
      failureReason,
      metadata: {
        sessionId: args.sessionId,
        documentId: args.documentId,
        challengeId: args.challengeId,
        moduleType: args.moduleType,
        locale: args.locale ?? "ar",
        mobileNumber: args.mobileNumber,
      },
    });

    return {
      recipient: recipientEmail,
      status: "failed",
      auditId,
      diagnostics: null,
      failureReason,
    };
  }
}

export async function sendPatientCopyNotificationEmail(args: {
  tenantId: string;
  caseId?: string | null;
  patientName: string | null;
  documentId: string;
  consentReference: string | null;
  copyType: string;
  recipientEmail: string;
}, dependencies?: Partial<SecureSigningEmailDependencies>): Promise<SecureSigningEmailResult> {
  const recipientEmail = normalizeRecipientEmail(args.recipientEmail);
  if (!isValidRecipientEmail(recipientEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const sendEmail = dependencies?.sendEmail ?? sendEmailWithDiagnostics;
  const recordAuditAttempt = dependencies?.recordAuditAttempt ?? recordEmailAuditAttempt;
  const reference = args.consentReference || args.documentId;
  const title = "Patient Copy Available";
  const ctaUrl = `${getBaseUrl()}/modules/informed-consents`;
  const html = buildWathiqCareEmailHtml({
    title,
    preheader: "Your patient copy is ready.",
    bodyHtml: `<p>Your patient copy has been generated.</p><p>Consent Reference: <strong>${reference}</strong></p><p>Document ID: <strong>${args.documentId}</strong></p><p>Copy Type: <strong>${args.copyType}</strong></p><p>Patient: <strong>${args.patientName || "Unknown patient"}</strong></p>`,
    ctaUrl,
    ctaText: "Open Consent Module",
    securityNote: "This message contains sensitive clinical workflow information.",
  });
  const text = buildWathiqCareEmailText({
    title,
    bodyLines: [
      `Consent Reference: ${reference}`,
      `Document ID: ${args.documentId}`,
      `Copy Type: ${args.copyType}`,
      `Patient: ${args.patientName || "Unknown patient"}`,
    ],
    ctaUrl,
    ctaLabel: "Open Consent Module",
    securityNote: "This message contains sensitive clinical workflow information.",
  });

  try {
    const diagnostics = await sendEmail({
      to: recipientEmail,
      subject: `${title} | ${reference}`,
      html,
      text,
    });

    if (!wasRecipientAcceptedByProvider(diagnostics, recipientEmail)) {
      const failureReason = "Patient copy email provider did not accept the patient recipient email";
      const auditId = await recordAuditAttempt({
        tenantId: args.tenantId,
        caseId: args.caseId ?? null,
        recipient: recipientEmail,
        notificationType: "patient_copy_notification",
        status: "failed",
        failureReason,
        diagnostics,
        metadata: {
          documentId: args.documentId,
          consentReference: args.consentReference,
          copyType: args.copyType,
          patientName: args.patientName,
        },
      });

      return {
        recipient: recipientEmail,
        status: "failed",
        auditId,
        diagnostics,
        failureReason,
      };
    }

    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "patient_copy_notification",
      status: "sent",
      diagnostics,
      metadata: {
        documentId: args.documentId,
        consentReference: args.consentReference,
        copyType: args.copyType,
        patientName: args.patientName,
      },
    });

    return {
      recipient: recipientEmail,
      status: "sent",
      auditId,
      diagnostics,
      failureReason: null,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    const auditId = await recordAuditAttempt({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      recipient: recipientEmail,
      notificationType: "patient_copy_notification",
      status: "failed",
      failureReason,
      metadata: {
        documentId: args.documentId,
        consentReference: args.consentReference,
        copyType: args.copyType,
        patientName: args.patientName,
      },
    });

    return {
      recipient: recipientEmail,
      status: "failed",
      auditId,
      diagnostics: null,
      failureReason,
    };
  }
}