"use client";

import React, { useState } from 'react';
import {
  CheckCircle2, Circle, Clock, Send, Eye, ShieldCheck,
  BookOpen, FileText, Archive, RotateCcw, XCircle, ChevronRight,
} from 'lucide-react';
import { ClinicalBadge } from './clinical/ClinicalBadge';

import { consentRecords } from './fixtures/status-tracking';

interface Props {
  lang: 'en' | 'ar';
}

export function StatusTracking({ lang }: Props) {
  const [statusActionMessage, setStatusActionMessage] = useState<string | null>(null);
  const [auditActionsByConsentId, setAuditActionsByConsentId] = useState<Record<string, Array<{
    time: string;
    event: string;
    actor: string;
    ip: string;
    source: string;
  }>>>({});

  const recordStatusAction = (consentId: string, event: string) => {
    const now = new Date();

    setAuditActionsByConsentId((current) => ({
      ...current,
      [consentId]: [
        {
          time: now.toLocaleTimeString('en-GB', { hour12: false }),
          event,
          actor: 'Dr. K. Al-Qahtani',
          ip: '10.1.4.22',
          source: 'Physician Portal',
        },
        ...(current[consentId] || []),
      ],
    }));
  };

  const [revokedConsentIds, setRevokedConsentIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState(consentRecords[0]);

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

  function handleResendConsentLink(consentId: string) {
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

    recordStatusAction(consentId, `Consent link resent for ${consentId}`);

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
  }

  function handleRevokeConsent(consentId: string) {
    const confirmed = window.confirm(
      lang === 'ar'
        ? `\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0644\u063a\u0627\u0621 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0631\u0642\u0645 ${consentId}? \u0644\u0646 \u064a\u062a\u0645\u0643\u0646 \u0627\u0644\u0645\u0631\u064a\u0636 \u0645\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u0628\u0639\u062f \u0627\u0644\u0625\u0644\u063a\u0627\u0621.`
        : `Revoke consent link for ${consentId}? This action will invalidate the active signing link.`
    );

    if (!confirmed) return;

    setRevokedConsentIds((current) => {
      const next = new Set(current);
      next.add(consentId);
      return next;
    });

    recordStatusAction(consentId, `Consent link revoked for ${consentId}`);

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
            {consentRecords.map(record => {
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
                    <ClinicalBadge variant={record.status === 'evidence' ? 'signed' : 'sent'} label={record.status === 'evidence' ? (lang === 'en' ? 'Complete' : 'مكتمل') : (lang === 'en' ? 'Active' : 'نشط')} dot />
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
