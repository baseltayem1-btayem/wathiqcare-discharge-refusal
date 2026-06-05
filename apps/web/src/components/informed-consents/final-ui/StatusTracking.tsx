"use client";

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Circle, Clock, Send, Eye, ShieldCheck,
  BookOpen, FileText, Archive, RotateCcw, XCircle, ChevronRight,
} from 'lucide-react';
import { ClinicalBadge } from './clinical/ClinicalBadge';


interface Props {
  lang: 'en' | 'ar';
}


type TrackingEvent = {
  stage: string;
  label: string;
  time: string | null;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

type TrackingRecord = {
  id: string;
  mrn: string;
  name: string;
  nameAr: string;
  procedure: string;
  procedureAr: string;
  sent: string;
  status: string;
  signatureRequestId?: string | null;
  signatureRequestStatus?: string | null;
  signatureRecipientMobile?: string | null;
  signatureRecipientEmail?: string | null;
  events: TrackingEvent[];
};

type StatusTrackingApiRecord = {
  id: string;
  consentReference?: string | null;
  patientName?: string | null;
  mrn?: string | null;
  procedure?: string | null;
  templateTitle?: string | null;
  status?: string | null;
  displayStatus?: string | null;
  progress?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  signatureRequestId?: string | null;
  signatureRequestStatus?: string | null;
  signatureRecipientName?: string | null;
  signatureRecipientMobile?: string | null;
  signatureRecipientEmail?: string | null;
  signatureRequestCount?: number | null;
};

const initialStatusTrackingRecord: TrackingRecord = {
  id: 'loading',
  mrn: '-',
  name: 'Loading consent records...',
  nameAr: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a...',
  procedure: 'Informed Consent',
  procedureAr: '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0633\u062a\u0646\u064a\u0631\u0629',
  sent: '-',
  status: 'loading',
  signatureRequestId: null,
  signatureRequestStatus: null,
  signatureRecipientMobile: null,
  signatureRecipientEmail: null,
  events: [
    { stage: 'draft', label: 'Draft Created', time: null, done: false, icon: FileText },
    { stage: 'sent', label: 'Link Sent', time: null, done: false, icon: Send },
    { stage: 'opened', label: 'Patient Opened', time: null, done: false, icon: Eye },
    { stage: 'otp', label: 'OTP Verified', time: null, done: false, icon: ShieldCheck },
    { stage: 'education', label: 'Education Viewed', time: null, done: false, icon: BookOpen },
    { stage: 'decision', label: 'Decision Recorded', time: null, done: false, icon: Circle },
    { stage: 'signed', label: 'Signed', time: null, done: false, icon: CheckCircle2 },
    { stage: 'pdf', label: 'PDF Generated', time: null, done: false, icon: FileText },
    { stage: 'evidence', label: 'Evidence Complete', time: null, done: false, icon: Archive },
  ],
};

function formatTrackingDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function normalizeStatusToStage(status?: string | null) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'REVOKED') return 'revoked';
  if (normalized === 'SENT') return 'sent';
  if (normalized === 'OPENED') return 'opened';
  if (normalized === 'EXPIRED') return 'expired';
  if (normalized === 'FAILED') return 'failed';
  if (normalized === 'FINALIZED') return 'evidence';
  if (normalized === 'SIGNED') return 'signed';
  if (normalized === 'READY_FOR_SIGNATURE') return 'decision';
  if (normalized === 'APPROVED') return 'sent';
  if (normalized === 'PHYSICIAN_REVIEW') return 'draft';
  if (normalized === 'AI_DRAFT' || normalized === 'DRAFT') return 'draft';

  return 'draft';
}

function buildTrackingEvents(record: StatusTrackingApiRecord): TrackingEvent[] {
  const stage = normalizeStatusToStage(record.status);
  const sentTime = formatTrackingDateTime(record.createdAt);

  const order = ['draft', 'sent', 'opened', 'otp', 'education', 'decision', 'signed', 'pdf', 'evidence', 'revoked', 'expired', 'failed'];
  const currentIndex = order.indexOf(stage);

  return [
    { stage: 'draft', label: 'Draft Created', time: sentTime, done: currentIndex >= 0, icon: FileText },
    { stage: 'sent', label: 'Link Sent', time: currentIndex >= 1 ? sentTime : null, done: currentIndex >= 1, icon: Send },
    { stage: 'opened', label: 'Patient Opened', time: null, done: currentIndex >= 2, icon: Eye },
    { stage: 'otp', label: 'OTP Verified', time: null, done: currentIndex >= 3, icon: ShieldCheck },
    { stage: 'education', label: 'Education Viewed', time: null, done: currentIndex >= 4, icon: BookOpen },
    { stage: 'decision', label: 'Decision Recorded', time: null, done: currentIndex >= 5, icon: Circle },
    { stage: 'signed', label: 'Signed', time: null, done: currentIndex >= 6, icon: CheckCircle2 },
    { stage: 'pdf', label: 'PDF Generated', time: null, done: currentIndex >= 7, icon: FileText },
    { stage: 'evidence', label: 'Evidence Complete', time: null, done: currentIndex >= 8, icon: Archive },
  ];
}

function mapApiRecordToTrackingRecord(record: StatusTrackingApiRecord): TrackingRecord {
  return {
    id: record.id,
    mrn: record.mrn || 'N/A',
    name: record.patientName || 'Unknown Patient',
    nameAr: record.patientName || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    procedure: record.procedure || record.templateTitle || 'Informed Consent',
    procedureAr: record.procedure || record.templateTitle || '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0633\u062a\u0646\u064a\u0631\u0629',
    sent: formatTrackingDateTime(record.createdAt),
    status: normalizeStatusToStage(record.status),
    signatureRequestId: record.signatureRequestId || null,
    signatureRequestStatus: record.signatureRequestStatus || null,
    signatureRecipientMobile: record.signatureRecipientMobile || null,
    signatureRecipientEmail: record.signatureRecipientEmail || null,
    events: buildTrackingEvents(record),
  };
}

export function StatusTracking({ lang }: Props) {
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [isLoadingTrackingRecords, setIsLoadingTrackingRecords] = useState(true);
  const [trackingRecordsError, setTrackingRecordsError] = useState<string | null>(null);
  const [statusActionMessage, setStatusActionMessage] = useState<string | null>(null);
  const [auditActionsByConsentId, setAuditActionsByConsentId] = useState<Record<string, Array<{
    time: string;
    event: string;
    actor: string;
    ip: string;
    source: string;
  }>>>({});

  const normalizeTimelineEvents = (events: Array<Record<string, unknown>>) => events.map((item) => {
    const metadata = item.metadata && typeof item.metadata === 'object'
      ? item.metadata as Record<string, unknown>
      : {};

    const createdAt = typeof item.createdAt === 'string' ? item.createdAt : null;
    const action = typeof item.action === 'string' ? item.action : 'timeline_event';
    const summary = typeof metadata.summary === 'string' ? metadata.summary : action;
    const source = typeof metadata.source === 'string' ? metadata.source : 'Timeline API';
    const actorRole = typeof item.actorRole === 'string' ? item.actorRole : null;
    const actorUserId = typeof item.actorUserId === 'string' ? item.actorUserId : null;
    const ipAddress = typeof item.ipAddress === 'string' && item.ipAddress.trim() ? item.ipAddress : '-';

    return {
      time: createdAt
        ? new Date(createdAt).toLocaleTimeString('en-GB', { hour12: false })
        : new Date().toLocaleTimeString('en-GB', { hour12: false }),
      event: summary,
      actor: actorRole || actorUserId || 'System',
      ip: ipAddress,
      source,
    };
  });

  const loadPersistedTimeline = async (consentId: string) => {
    try {
      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const timeline = await response.json();

      if (Array.isArray(timeline)) {
        const normalized = normalizeTimelineEvents(timeline).reverse();

        setAuditActionsByConsentId((current) => ({
          ...current,
          [consentId]: normalized,
        }));
      }
    } catch {
      // Keep local fixture/fallback timeline if API is unavailable.
    }
  };

  const updateSelectedConsentStatus = (
    consentId: string,
    status: string,
    signatureRequestStatus?: string | null,
  ) => {
    const actionTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const updateEvents = (events: TrackingEvent[]) =>
      events.map((event) => {
        if (status === 'revoked' && event.stage === 'sent') {
          return {
            ...event,
            label: 'Link Revoked',
            done: true,
            time: actionTime,
          };
        }

        if (status === 'sent' && event.stage === 'sent') {
          return {
            ...event,
            label: 'Link Sent',
            done: true,
            time: actionTime,
          };
        }

        return event;
      });

    setSelected((current) =>
      current.id === consentId
        ? {
            ...current,
            status,
            signatureRequestStatus: signatureRequestStatus || current.signatureRequestStatus,
            events: updateEvents(current.events),
          }
        : current
    );

    setTrackingRecords((current) =>
      current.map((item) =>
        item.id === consentId
          ? {
              ...item,
              status,
              signatureRequestStatus: signatureRequestStatus || item.signatureRequestStatus,
              events: updateEvents(item.events),
            }
          : item
      )
    );
  };

  const applySignatureRequestToSelectedRecord = (
    request: Record<string, unknown>,
  ) => {
    const requestId = typeof request.id === 'string' ? request.id : null;
    const requestStatus = typeof request.status === 'string' ? request.status : null;
    const requestMobile = typeof request.mobile === 'string' ? request.mobile : null;
    const requestEmail = typeof request.email === 'string' ? request.email : null;

    if (!requestId) return null;

    setSelected((current) => ({
      ...current,
      signatureRequestId: requestId,
      signatureRequestStatus: requestStatus,
      signatureRecipientMobile: requestMobile,
      signatureRecipientEmail: requestEmail,
    }));

    setTrackingRecords((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              signatureRequestId: requestId,
              signatureRequestStatus: requestStatus,
              signatureRecipientMobile: requestMobile,
              signatureRecipientEmail: requestEmail,
            }
          : item
      )
    );

    return requestId;
  };

  const configureDefaultSignatureRecipient = async (consentId: string) => {
    const confirmed = window.confirm(
      lang === 'ar'
        ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u0644\u0645 \u062a\u0648\u0642\u064a\u0639 \u0645\u0631\u062a\u0628\u0637 \u0628\u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629. \u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0639\u062f\u0627\u062f \u0645\u0633\u062a\u0644\u0645 \u0627\u0644\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0622\u0646\u061f'
        : 'No signature recipient is linked to this consent. Configure a recipient now?'
    );

    if (!confirmed) {
      throw new Error('Signature recipient configuration was cancelled.');
    }

    const mobile = window.prompt(
      lang === 'ar'
        ? '\u0623\u062f\u062e\u0644 \u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0633\u062a\u0644\u0645 \u0628\u0635\u064a\u063a\u0629 9665XXXXXXXX'
        : 'Enter recipient mobile number in 9665XXXXXXXX format',
      selected.signatureRecipientMobile || ''
    )?.trim();

    if (!mobile) {
      throw new Error('Recipient mobile number is required.');
    }

    const email = window.prompt(
      lang === 'ar'
        ? '\u0623\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u0644\u0645\u0633\u062a\u0644\u0645'
        : 'Enter recipient email address',
      selected.signatureRecipientEmail || ''
    )?.trim();

    if (!email) {
      throw new Error('Recipient email is required.');
    }

    const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/signature-orchestration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'configure_recipients',
        payload: {
          requests: [
            {
              recipientName: selected.name || 'Patient',
              role: 'PATIENT',
              mobile,
              email,
              deliveryMethod: 'SMS_TAQNIAT',
              required: true,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const message = typeof errorPayload?.error === 'string'
        ? errorPayload.error
        : 'Failed to configure signature recipient.';

      throw new Error(message);
    }

    const payload = await response.json();
    const requests = Array.isArray(payload?.requests) ? payload.requests : [];
    const primaryRequest = requests[0] && typeof requests[0] === 'object'
      ? requests[0] as Record<string, unknown>
      : null;

    if (!primaryRequest) {
      throw new Error('Signature recipient was configured but no request was returned.');
    }

    const requestId = applySignatureRequestToSelectedRecord(primaryRequest);

    if (!requestId) {
      throw new Error('Signature request was configured but request id is missing.');
    }

    return requestId;
  };

  const runSignatureOrchestrationAction = async (
    consentId: string,
    action: 'resend' | 'revoke',
    reason?: string,
  ) => {
    let requestId = selected.signatureRequestId;

    if (!requestId && action === 'resend') {
      requestId = await configureDefaultSignatureRecipient(consentId);
    }

    if (!requestId) {
      throw new Error(
        action === 'revoke'
          ? 'No active signature request is linked to this consent record for revocation.'
          : 'No signature request is linked to this consent record.'
      );
    }

    const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/signature-orchestration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload: {
          requestId,
          reason,
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const message = typeof errorPayload?.error === 'string'
        ? errorPayload.error
        : `Signature orchestration ${action} failed.`;

      throw new Error(message);
    }

    return response.json();
  };

  const recordStatusAction = async (
    consentId: string,
    action: string,
    summary: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const now = new Date();

    const localEvent = {
      time: now.toLocaleTimeString('en-GB', { hour12: false }),
      event: summary,
      actor: 'Dr. K. Al-Qahtani',
      ip: '10.1.4.22',
      source: 'Physician Portal',
    };

    setAuditActionsByConsentId((current) => ({
      ...current,
      [consentId]: [
        localEvent,
        ...(current[consentId] || []),
      ],
    }));

    try {
      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(consentId)}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          summary,
          source: 'physician-portal',
          metadata: {
            ...metadata,
            consentId,
            uiSource: 'StatusTracking',
          },
        }),
      });

      if (!response.ok) {
        return;
      }

      const timeline = await response.json();

      if (Array.isArray(timeline)) {
        const normalized = normalizeTimelineEvents(timeline).reverse();

        setAuditActionsByConsentId((current) => ({
          ...current,
          [consentId]: normalized,
        }));
      }
    } catch {
      // Local event remains visible as fallback.
    }
  };

  const [revokedConsentIds, setRevokedConsentIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<TrackingRecord>(initialStatusTrackingRecord);

  useEffect(() => {
    let cancelled = false;

    const loadStatusTrackingRecords = async () => {
      setIsLoadingTrackingRecords(true);
      setTrackingRecordsError(null);

      try {
        const response = await fetch('/api/modules/informed-consents/status-tracking?limit=100', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Status tracking request failed: ${response.status}`);
        }

        const payload = await response.json();
        const apiRecords = Array.isArray(payload?.records) ? payload.records as StatusTrackingApiRecord[] : [];
        const mappedRecords = apiRecords.map(mapApiRecordToTrackingRecord);

        if (cancelled) return;

        setTrackingRecords(mappedRecords);

        if (mappedRecords.length > 0) {
          setSelected((current) => {
            const stillExists = mappedRecords.some((item) => item.id === current.id);
            return stillExists ? current : mappedRecords[0];
          });
        }
      } catch {
        if (!cancelled) {
          setTrackingRecordsError(
            lang === 'ar'
              ? '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0645\u0646 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a. \u064a\u062a\u0645 \u0639\u0631\u0636 \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 \u0645\u0624\u0642\u062a\u064b\u0627.'
              : 'Unable to load consent records from the database. Showing temporary fallback state.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrackingRecords(false);
        }
      }
    };

    void loadStatusTrackingRecords();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const visibleTrackingRecords = trackingRecords.length > 0 ? trackingRecords : [selected];

  const selectedFixtureAuditTrail = [
    { time: '10:30:12', event: 'Consent draft created by physician', actor: 'Dr. K. Al-Qahtani', ip: '10.1.4.22', source: 'Physician Portal' },
    { time: '10:33:45', event: 'Disclosure fields completed (EN + AR)', actor: 'Dr. K. Al-Qahtani', ip: '10.1.4.22', source: 'Physician Portal' },
    { time: '10:40:02', event: 'Anesthesia module reviewed by Dr. R. Al-Farsi', actor: 'Dr. R. Al-Farsi', ip: '10.1.2.88', source: 'Physician Portal' },
    { time: '10:44:30', event: 'Physician confirmation signed', actor: 'Dr. K. Al-Qahtani', ip: '10.1.4.22', source: 'Physician Portal' },
    { time: '10:45:01', event: 'Consent link sent via SMS', actor: 'System', ip: '-', source: 'Messaging Gateway' },
    { time: '11:02:33', event: 'Patient opened consent link', actor: `Patient (${selected.mrn})`, ip: '-', source: 'Patient Portal' },
    { time: '11:04:15', event: 'OTP verified successfully', actor: 'Patient', ip: '-', source: 'OTP Service' },
    { time: '11:09:02', event: 'Patient education viewed', actor: 'Patient', ip: '-', source: 'Education Module' },
  ];

  const selectedAuditTrail = [
    ...(auditActionsByConsentId[selected.id] || []),
    ...selectedFixtureAuditTrail,
  ];

  const selectedRecentAuditActions = auditActionsByConsentId[selected.id] || [];

  useEffect(() => {
    void loadPersistedTimeline(selected.id);
  }, [selected.id]);

  async function handleResendConsentLink(consentId: string) {
    if (revokedConsentIds.has(consentId)) {
      setStatusActionMessage(
        lang === 'ar'
          ? '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0645\u0648\u0627\u0641\u0642\u0629 \u062a\u0645 \u0625\u0644\u063a\u0627\u0624\u0647.'
          : 'Cannot resend a revoked consent link.'
      );
      return;
    }

    const confirmed = window.confirm(
      lang === 'ar'
        ? `\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0631\u0642\u0645 ${consentId}?`
        : `Do you want to resend consent link ${consentId}?`
    );

    if (!confirmed) return;

    try {
      await runSignatureOrchestrationAction(consentId, 'resend');

      updateSelectedConsentStatus(consentId, 'sent', 'SENT');

      await recordStatusAction(
        consentId,
        'consent_link_resent',
        `RESEND: Consent link resent for ${consentId}`,
        { uiAction: 'RESEND', signatureRequestId: selected.signatureRequestId, statusAfterAction: 'SENT' },
      );

      setStatusActionMessage(
        lang === 'ar'
          ? `\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0631\u0642\u0645 ${consentId}.`
          : `Secure consent link resent for ${consentId}.`
      );

      window.alert(
        lang === 'ar'
          ? '\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0628\u0646\u062c\u0627\u062d.'
          : 'Consent link resent successfully.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resend failed.';

      setStatusActionMessage(
        lang === 'ar'
          ? `\u062a\u0639\u0630\u0631\u062a \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0627\u0628\u0637: ${message}`
          : `Unable to resend consent link: ${message}`
      );

      window.alert(
        lang === 'ar'
          ? `\u062a\u0639\u0630\u0631\u062a \u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0627\u0628\u0637: ${message}`
          : `Unable to resend consent link: ${message}`
      );
    }
  }

  async function handleRevokeConsent(consentId: string) {
    const confirmed = window.confirm(
      lang === 'ar'
        ? `\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0631\u0642\u0645 ${consentId}? \u0644\u0646 \u064a\u062a\u0645\u0643\u0646 \u0627\u0644\u0645\u0631\u064a\u0636 \u0645\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0628\u0639\u062f \u0627\u0644\u0625\u0644\u063a\u0627\u0621.`
        : `Revoke consent link for ${consentId}? This action will invalidate the active signing link.`
    );

    if (!confirmed) return;

    try {
      await runSignatureOrchestrationAction(
        consentId,
        'revoke',
        'Revoked from Status Tracking',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Revoke failed.';
      setStatusActionMessage(
        lang === 'ar'
          ? `\u062a\u0639\u0630\u0631 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629: ${message}`
          : `Unable to revoke consent link: ${message}`
      );
      window.alert(
        lang === 'ar'
          ? `\u062a\u0639\u0630\u0631 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629: ${message}`
          : `Unable to revoke consent link: ${message}`
      );
      return;
    }

    setRevokedConsentIds((current) => {
      const next = new Set(current);
      next.add(consentId);
      return next;
    });

    updateSelectedConsentStatus(consentId, 'revoked', 'REVOKED');

    await recordStatusAction(
      consentId,
      'consent_link_revoked',
      `REVOKE: Consent link revoked for ${consentId}`,
      { uiAction: 'REVOKE', signatureRequestId: selected.signatureRequestId, statusAfterAction: 'REVOKED' },
    );

    setStatusActionMessage(
      lang === 'ar'
        ? `\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0631\u0642\u0645 ${consentId}.`
        : `Consent link revoked for ${consentId}.`
    );

    window.alert(
      lang === 'ar'
        ? '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0628\u0646\u062c\u0627\u062d.'
        : 'Consent link revoked successfully.'
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
      <div className="bg-white border-b border-[#D8DCE3] px-8 py-4">
        <h1 className="text-[#2F2F2F]">{lang === 'en' ? 'Consent Status Tracking' : 'متابعة حالة الموافقة'}</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{lang === 'en' ? 'Monitor consent lifecycle, view audit trail, and manage sent consents.' : 'راقب دورة حياة الموافقة واعرض مسار التدقيق وأدر الموافقات المرسلة.'}</p>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="space-y-3">
            {visibleTrackingRecords.map(record => {
              const lastDone = [...record.events].reverse().find(e => e.done);
              return (
                <div key={record.id}
                  onClick={() => setSelected(record)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${selected.id === record.id ? 'border-[#002B5C] shadow-sm' : 'border-[#D8DCE3] hover:border-[#4B9CD3]'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm text-[#2F2F2F]">{lang === 'en' ? record.name : record.nameAr}</div>
                      <div className="text-xs text-[#6B7280] font-mono">{record.mrn}</div>
                    </div>
                    <ClinicalBadge
                      variant={
                        record.status === 'evidence' || record.status === 'signed'
                          ? 'signed'
                          : record.status === 'revoked' || record.status === 'expired' || record.status === 'failed'
                            ? 'warning'
                            : 'sent'
                      }
                      label={
                        record.status === 'evidence'
                          ? (lang === 'en' ? 'Complete' : '\u0645\u0643\u062a\u0645\u0644')
                          : record.status === 'signed'
                            ? (lang === 'en' ? 'Signed' : '\u0645\u0648\u0642\u0639')
                            : record.status === 'revoked'
                              ? (lang === 'en' ? 'Revoked' : '\u0645\u0644\u063a\u0649')
                              : record.status === 'expired'
                                ? (lang === 'en' ? 'Expired' : '\u0645\u0646\u062a\u0647\u064a')
                                : record.status === 'failed'
                                  ? (lang === 'en' ? 'Failed' : '\u0641\u0634\u0644')
                                  : record.status === 'sent'
                                    ? (lang === 'en' ? 'Sent' : '\u0645\u0631\u0633\u0644')
                                    : record.status === 'opened'
                                      ? (lang === 'en' ? 'Opened' : '\u0645\u0641\u062a\u0648\u062d')
                                      : (lang === 'en' ? 'Active' : '\u0646\u0634\u0637')
                      }
                      dot
                    />
                  </div>
                  <div className="text-xs text-[#6B7280]">{lang === 'en' ? record.procedure : record.procedureAr}</div>
                  {lastDone && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="w-3 h-3 text-[#6B7280]" />
                      <span className="text-xs text-[#6B7280]">{lang === 'en' ? 'Last: ' : 'آخر: '}{lastDone.label} · {lastDone.time}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: detail */}
          <div className="col-span-2 space-y-4">
            {/* Header */}
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[#2F2F2F]">{lang === 'en' ? selected.name : selected.nameAr}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-[#6B7280]">{selected.id}</span>
                    <span className="text-xs text-[#6B7280]">{lang === 'en' ? selected.procedure : selected.procedureAr}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleResendConsentLink(selected.id)} className="flex items-center gap-1.5 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] text-xs px-3 py-1.5 rounded transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Resend' : 'إعادة الإرسال'}
                  </button>
                  <button onClick={() => handleRevokeConsent(selected.id)} className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 rounded transition-colors">
                    <XCircle className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Revoke' : 'إلغاء'}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-[#D8DCE3]" />
                <div className="space-y-1">
                  {selected.events.map((event, i) => (
                    <div key={event.stage} className="flex items-center gap-4 py-2 relative">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${event.done ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-[#D8DCE3]'}`}>
                        <event.icon className={`w-4 h-4 ${event.done ? 'text-emerald-600' : 'text-[#D8DCE3]'}`} />
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${event.done ? 'text-[#2F2F2F]' : 'text-[#6B7280]'}`}>{event.label}</span>
                      </div>
                      {event.time && (
                        <span className="text-xs font-mono text-[#6B7280]">{event.time}</span>
                      )}
                      {!event.done && !event.time && (
                        <span className="text-xs text-[#6B7280]">{lang === 'en' ? 'Pending' : 'قيد الانتظار'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Audit trail */}
            <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9] flex items-center gap-2">
                <Archive className="w-4 h-4 text-[#002B5C]" />

      {statusActionMessage ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {statusActionMessage}
        </div>
      ) : null}



                <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Audit Trail' : 'مسار التدقيق'}</span>
                <ClinicalBadge variant="info" label="Immutable" />
              </div>
              <div className="divide-y divide-[#EEF1F5]">
                {selectedRecentAuditActions.length > 0 ? (
                  <div className="border-b border-blue-100 bg-blue-50 px-5 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#002B5C]">
                      {lang === 'en' ? 'Recent Actions for This Consent' : '\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0623\u062e\u064a\u0631\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629'}
                    </div>
                    <div className="space-y-1">
                      {selectedRecentAuditActions.map((item, index) => (
                        <div key={`${selected.id}-recent-${item.time}-${index}`} className="grid grid-cols-4 gap-4 rounded bg-white px-3 py-2 text-xs">
                          <span className="font-mono text-[#6B7280]">{item.time}</span>
                          <span className="font-semibold text-[#002B5C]">{item.event}</span>
                          <span className="text-[#6B7280]">{item.actor}</span>
                          <span className="font-mono text-[#6B7280]">{item.ip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedAuditTrail.map((item, index) => (
                  <div key={`${selected.id}-${item.time}-${index}`} className="grid grid-cols-4 gap-4 px-5 py-3 text-xs">
                    <span className="font-mono text-[#6B7280]">{item.time}</span>
                    <span className="text-[#2F2F2F]">{item.event}</span>
                    <span className="text-[#6B7280]">{item.actor}</span>
                    <span className="font-mono text-[#6B7280]">{item.ip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence package */}
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Archive className="w-4 h-4 text-[#C9A13B]" />
                <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Evidence Package' : 'الحزمة الدليلية'}</span>
                {selected.status === 'evidence' && <ClinicalBadge variant="ready" label={lang === 'en' ? 'Sealed' : 'مختوم'} dot />}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Consent PDF', size: '124 KB', ready: selected.status === 'evidence' },
                  { label: 'Physician Disclosure', size: '8 KB', ready: true },
                  { label: 'Anesthesia Data', size: '6 KB', ready: true },
                  { label: 'Education Package', size: '18 KB', ready: true },
                  { label: 'OTP Verification Log', size: '2 KB', ready: selected.status === 'evidence' },
                  { label: 'Evidence Seal (SHA-256)', size: '1 KB', ready: selected.status === 'evidence' },
                ].map(item => (
                  <div key={item.label} className={`border rounded p-3 ${item.ready ? 'border-emerald-200 bg-emerald-50' : 'border-[#D8DCE3] bg-[#F8F9FB]'}`}>
                    <div className={`w-5 h-5 rounded-full mb-2 flex items-center justify-center ${item.ready ? 'bg-emerald-100' : 'bg-[#EEF1F5]'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${item.ready ? 'text-emerald-600' : 'text-[#D8DCE3]'}`} />
                    </div>
                    <p className="text-xs font-medium text-[#2F2F2F] leading-snug">{item.label}</p>
                    <p className="text-[10px] font-mono text-[#6B7280] mt-0.5">{item.size}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
