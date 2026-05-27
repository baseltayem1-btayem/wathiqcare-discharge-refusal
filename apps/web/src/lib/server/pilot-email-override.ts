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
  const title = "Secure Signing Link";
  const expiresNote = `This secure signing link expires in ${args.expiresMinutes} minutes.`;
  const html = buildWathiqCareEmailHtml({
    title,
    preheader: "A secure signing link is ready for the patient.",
    bodyHtml: `<p>A secure signing link has been generated for <strong>${args.patientName}</strong>.</p><p>Document ID: <strong>${args.documentId}</strong></p><p>Signing Session ID: <strong>${args.sessionId}</strong></p><p>Mobile target: <strong>${args.mobileNumber}</strong></p>`,
    ctaUrl: args.signingUrl,
    ctaText: "Open Secure Signing Link",
    expiresNote,
    securityNote: "This secure signing link is intended only for the patient or their legal representative. Do not forward it to unauthorized parties.",
  });
  const text = buildWathiqCareEmailText({
    title,
    bodyLines: [
      `Patient: ${args.patientName}`,
      `Document ID: ${args.documentId}`,
      `Signing Session ID: ${args.sessionId}`,
      `Mobile target: ${args.mobileNumber}`,
    ],
    ctaUrl: args.signingUrl,
    ctaLabel: "Open Secure Signing Link",
    expiresNote,
    securityNote: "This secure signing link is intended only for the patient or their legal representative.",
  });

  try {
    const diagnostics = await sendEmail({
      to: recipientEmail,
      subject: `${title} | ${args.documentId}`,
      html,
      text,
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