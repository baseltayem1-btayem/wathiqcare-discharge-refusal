"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard, Search, FileText, Activity,
  ChevronDown, Bell, LogOut, Settings, Shield, User,
} from 'lucide-react';
import { PhysicianDashboard } from './PhysicianDashboard';
import { PatientSearch } from './PatientSearch';
import { ConsentBuilder } from './ConsentBuilder';
import { StatusTracking } from './StatusTracking';
import type { Patient, Encounter } from './clinical/ClinicalTypes';

type Screen = 'dashboard' | 'search' | 'consent-builder' | 'status' | 'support-settings';

const physicianProfile = {
  name: 'Dr. Khalid Al-Qahtani',
  specialty: 'General Surgery - FACS',
  licenseNumber: 'SCFHS-245871',
  licenseExpiryDate: '2026-12-31',
} as const;

function getMedicalLicenseStatus(expiryDate: string) {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return 'unknown';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiringSoon';
  return 'active';
}


const physicianNotifications = [
  {
    id: 'notif-incomplete-disclosures',
    title: 'Incomplete mandatory disclosures',
    message: '3 consents require completion before surgery can proceed.',
    time: 'Today',
    severity: 'critical',
  },
  {
    id: 'notif-awaiting-signature',
    title: 'Patient signature pending',
    message: '12 consent links are sent and awaiting patient action.',
    time: 'Today',
    severity: 'info',
  },
  {
    id: 'notif-license-status',
    title: 'Medical license status verified',
    message: `License expiry: ${physicianProfile.licenseExpiryDate}`,
    time: 'System check',
    severity: 'success',
  },
];

const navItems = [
  { id: 'dashboard' as Screen, label: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'search' as Screen, label: 'Patient Search', labelAr: 'البحث عن مريض', icon: Search },
  { id: 'consent-builder' as Screen, label: 'Consent Builder', labelAr: 'بناء الموافقة', icon: FileText },
  { id: 'status' as Screen, label: 'Status Tracking', labelAr: 'متابعة الحالة', icon: Activity },
  { id: 'support-settings', label: 'Support & Settings', labelAr: 'الدعم والإعدادات', icon: Settings },
];




function SupportSettingsScreen({ lang }: { lang: 'en' | 'ar' }) {
  const isArabic = lang === 'ar';
  const [supportRequestModal, setSupportRequestModal] = useState<null | 'technical-ticket' | 'legal-consultation'>(null);
  const [supportRequestContext] = useState(() => ({
    user: physicianProfile.name,
    specialty: physicianProfile.specialty,
    licenseNumber: physicianProfile.licenseNumber,
    licenseExpiryDate: physicianProfile.licenseExpiryDate,
    module: 'Informed Consents',
    page: 'Support & Settings',
    source: 'WathiqCare Physician Portal',
    timestamp: new Date().toISOString(),
    sessionReference: `WTC-${Date.now().toString(36).toUpperCase()}`,
  }));

  const cards = [
    {
      title: isArabic ? '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Settings',
      description: isArabic ? '\u0625\u062f\u0627\u0631\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0648\u0627\u0644\u0623\u0631\u0634\u0641\u0629 \u0648\u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642.' : 'Manage account settings, alerts, sync, archiving, and audit log.',
      button: isArabic ? '\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0644\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Open Settings',
      icon: Settings,
      tone: 'blue',
      modal: null,
    },
    {
      title: isArabic ? '\u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a' : 'Legal Support',
      description: isArabic ? '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0627\u0644\u0645\u062e\u062a\u0635 \u0644\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0644\u062a\u0648\u062c\u064a\u0647.' : 'Contact the legal team for support, review, and guidance.',
      button: isArabic ? '\u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a' : 'Legal Support',
      icon: Shield,
      tone: 'purple',
      modal: null,
    },
    {
      title: isArabic ? '\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629' : 'Request Legal Consultation',
      description: isArabic ? '\u0627\u0641\u062a\u062d \u0637\u0644\u0628\u064b\u0627 \u0642\u0627\u0646\u0648\u0646\u064a\u064b\u0627 \u0631\u0633\u0645\u064a\u064b\u0627 \u0645\u062a\u0639\u0644\u0642\u064b\u0627 \u0628\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0623\u0648 \u0627\u0644\u0635\u064a\u0627\u063a\u0629 \u0623\u0648 \u0627\u0644\u0633\u064a\u0627\u0633\u0627\u062a.' : 'Open a formal legal request related to consent, wording, or policies.',
      button: isArabic ? '\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629' : 'Request Consultation',
      icon: FileText,
      tone: 'green',
      modal: 'legal-consultation',
    },
    {
      title: isArabic ? '\u0641\u062a\u062d \u062a\u0630\u0643\u0631\u0629 \u062f\u0639\u0645 \u062a\u0642\u0646\u064a' : 'Open Technical Support Ticket',
      description: isArabic ? '\u0623\u0628\u0644\u063a \u0639\u0646 \u0645\u0634\u0643\u0644\u0629 \u062a\u0642\u0646\u064a\u0629 \u062a\u062a\u0639\u0644\u0642 \u0628\u0627\u0644\u0646\u0638\u0627\u0645 \u0623\u0648 \u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u0623\u0648 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0623\u0648 TrakCare \u0623\u0648 DocuWare.' : 'Report a technical issue related to the system, email, SMS, TrakCare, or DocuWare.',
      button: isArabic ? '\u0641\u062a\u062d \u062a\u0630\u0643\u0631\u0629 \u062f\u0639\u0645 \u062a\u0642\u0646\u064a' : 'Open Ticket',
      icon: Activity,
      tone: 'blue',
      modal: 'technical-ticket',
    },
  ] as const;

  const toneClasses = {
    blue: { icon: 'bg-blue-50 text-[#002B5C]', button: 'bg-[#002B5C] hover:bg-[#003B7A] text-white', border: 'border-blue-100' },
    purple: { icon: 'bg-purple-50 text-purple-700', button: 'bg-purple-700 hover:bg-purple-800 text-white', border: 'border-purple-100' },
    green: { icon: 'bg-green-50 text-green-700', button: 'bg-green-700 hover:bg-green-800 text-white', border: 'border-green-100' },
  } as const;

  return (
    <div
      className="flex-1 overflow-auto bg-[#F4F6F9]"
      dir={isArabic ? 'rtl' : 'ltr'}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');

        if (!button) return;

        const label = button.textContent?.trim() || '';

        const isLegalConsultation =
          label.includes('Request Consultation') ||
          label.includes('??? ??????? ???????');

        const isTechnicalTicket =
          label.includes('Open Ticket') ||
          label.includes('??? ????? ??? ????');

        if (isLegalConsultation) {
          event.preventDefault();
          event.stopPropagation();
          setSupportRequestModal('legal-consultation');
          return;
        }

        if (isTechnicalTicket) {
          event.preventDefault();
          event.stopPropagation();
          setSupportRequestModal('technical-ticket');
        }
      }}
    >
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">{isArabic ? '\u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Support & Settings'}</h1>
            <p className="mt-2 text-sm text-[#6B7280]">{isArabic ? '\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647 \u0645\u0646 \u062f\u0639\u0645 \u0648\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0641\u064a \u0645\u0633\u0627\u062d\u0629 \u0639\u0645\u0644 \u0645\u0628\u0633\u0637\u0629 \u0648\u0622\u0645\u0646\u0629.' : 'All support and settings needed in a simple, secure workspace.'}</p>
          </div>
          <Shield className="h-12 w-12 text-[#C9A13B]" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const tone = toneClasses[card.tone];

            return (
              <div key={card.title} className={`rounded-xl border ${tone.border} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}>
                <div className="mb-5 flex items-center justify-center">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full ${tone.icon}`}>
                    <Icon className="h-10 w-10" />
                  </div>
                </div>
                <h2 className="text-center text-xl font-bold text-[#002B5C]">{card.title}</h2>
                <p className="mt-4 min-h-[72px] text-center text-sm leading-6 text-[#4B5563]">{card.description}</p>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (card.title === 'Request Legal Consultation' || card.button === 'Request Consultation' || card.modal === 'legal-consultation') {
                      setSupportRequestModal('legal-consultation');
                      return;
                    }

                    if (card.title === 'Open Technical Support Ticket' || card.button === 'Open Ticket' || card.modal === 'technical-ticket') {
                      setSupportRequestModal('technical-ticket');
                    }
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    if (card.title === 'Request Legal Consultation' || card.button === 'Request Consultation' || card.modal === 'legal-consultation') {
                      setSupportRequestModal('legal-consultation');
                      return;
                    }

                    if (card.title === 'Open Technical Support Ticket' || card.button === 'Open Ticket' || card.modal === 'technical-ticket') {
                      setSupportRequestModal('technical-ticket');
                    }
                  }}
                  className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${tone.button}`}
                >
                  {card.button}
                </button>
              </div>
            );
          })}
        </div>

        {supportRequestModal === 'legal-consultation' ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-2xl rounded-xl border border-[#D8DCE3] bg-white shadow-xl" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="flex items-start justify-between border-b border-[#EEF1F5] px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-[#002B5C]">{isArabic ? '\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629' : 'Request Legal Consultation'}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{isArabic ? '\u0623\u062f\u062e\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0644\u0625\u0631\u0633\u0627\u0644\u0647 \u0625\u0644\u0649 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629.' : 'Enter the legal request details to submit them to Legal Affairs.'}</p>
                </div>
                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">?</button>
              </div>

              <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); console.info('WathiqCare legal consultation context', supportRequestContext); window.alert(isArabic ? '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0648\u062a\u0633\u062c\u064a\u0644\u0647 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.' : 'Legal consultation request created and logged for follow-up.'); setSupportRequestModal(null); }}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628' : 'Request Type'}</span>
                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
                      <option>Consent Wording Review</option>
                      <option>Policy Clarification</option>
                      <option>Patient Refusal / Special Case</option>
                      <option>Disclosure / Risk Statement</option>
                      <option>Legal Escalation</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629' : 'Priority'}</span>
                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
                      <option>Normal</option>
                      <option>Urgent</option>
                      <option>Critical</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0648\u0635\u0641 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629' : 'Consultation Description'}</span>
                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629\u060c \u0648\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u060c \u0648\u0623\u064a \u062d\u0627\u0644\u0629 \u0623\u0648 \u0645\u0631\u0641\u0642\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629.' : 'Describe the legal question, consent issue, and any case or attachment that should be reviewed.'} />
                </label>

                <input type="hidden" name="supportRequestContext" value={JSON.stringify(supportRequestContext)} />
                <div className="rounded border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800">
                  <div className="mb-2 font-semibold">
                    {isArabic ? '\u0633\u064a\u062a\u0645 \u0625\u0631\u0641\u0627\u0642 \u0633\u064a\u0627\u0642 \u0627\u0644\u0637\u0644\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627' : 'The request will automatically include this context'}
                  </div>
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'User'}:</span> {supportRequestContext.user}</div>
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0635\u0641\u062d\u0629' : 'Page'}:</span> {supportRequestContext.page}</div>
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0648\u0642\u062a' : 'Timestamp'}:</span> {supportRequestContext.timestamp}</div>
                    <div><span className="font-medium">{isArabic ? '\u0645\u0631\u062c\u0639 \u0627\u0644\u062c\u0644\u0633\u0629' : 'Session Reference'}:</span> {supportRequestContext.sessionReference}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">{isArabic ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}</button>
                  <button type="submit" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">{isArabic ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628' : 'Submit Request'}</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {supportRequestModal === 'technical-ticket' ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-2xl rounded-xl border border-[#D8DCE3] bg-white shadow-xl" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="flex items-start justify-between border-b border-[#EEF1F5] px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-[#002B5C]">{isArabic ? '\u0641\u062a\u062d \u062a\u0630\u0643\u0631\u0629 \u062f\u0639\u0645 \u062a\u0642\u0646\u064a' : 'Open Technical Support Ticket'}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">{isArabic ? '\u0623\u062f\u062e\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0634\u0643\u0644\u0629 \u0627\u0644\u062a\u0642\u0646\u064a\u0629 \u0644\u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0625\u0644\u0649 \u0641\u0631\u064a\u0642 \u0627\u0644\u062f\u0639\u0645.' : 'Enter the technical issue details to submit them to the support team.'}</p>
                </div>
                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">?</button>
              </div>

              <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); console.info('WathiqCare technical ticket context', supportRequestContext); window.alert(isArabic ? '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629 \u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u062a\u0642\u0646\u064a \u0648\u062a\u0633\u062c\u064a\u0644\u0647\u0627 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.' : 'Technical support ticket created and logged for follow-up.'); setSupportRequestModal(null); }}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0646\u0648\u0639 \u0627\u0644\u0645\u0634\u0643\u0644\u0629' : 'Issue Type'}</span>
                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
                      <option>System Access</option>
                      <option>Email Delivery</option>
                      <option>SMS / OTP Delivery</option>
                      <option>TrakCare Sync</option>
                      <option>DocuWare Archive</option>
                      <option>PDF / Evidence Package</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629' : 'Priority'}</span>
                    <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
                      <option>Normal</option>
                      <option>Urgent</option>
                      <option>Critical</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#2F2F2F]">{isArabic ? '\u0648\u0635\u0641 \u0627\u0644\u0645\u0634\u0643\u0644\u0629' : 'Issue Description'}</span>
                  <textarea required rows={5} className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm" placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0627 \u0627\u0644\u0645\u0634\u0643\u0644\u0629\u060c \u0645\u062a\u0649 \u062d\u062f\u062b\u062a\u060c \u0648\u0645\u0627 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629 \u0628\u0634\u0623\u0646\u0647\u0627.' : 'Describe the issue, when it happened, and the step that requires support.'} />
                </label>

                <input type="hidden" name="supportRequestContext" value={JSON.stringify(supportRequestContext)} />
                <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-[#002B5C]">
                  <div className="mb-2 font-semibold">
                    {isArabic ? '\u0633\u064a\u062a\u0645 \u0625\u0631\u0641\u0627\u0642 \u0633\u064a\u0627\u0642 \u0627\u0644\u0637\u0644\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627' : 'The request will automatically include this context'}
                  </div>
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'User'}:</span> {supportRequestContext.user}</div>
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0635\u0641\u062d\u0629' : 'Page'}:</span> {supportRequestContext.page}</div>
                    <div><span className="font-medium">{isArabic ? '\u0627\u0644\u0648\u0642\u062a' : 'Timestamp'}:</span> {supportRequestContext.timestamp}</div>
                    <div><span className="font-medium">{isArabic ? '\u0645\u0631\u062c\u0639 \u0627\u0644\u062c\u0644\u0633\u0629' : 'Session Reference'}:</span> {supportRequestContext.sessionReference}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">{isArabic ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}</button>
                  <button type="submit" className="rounded bg-[#002B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B7A]">{isArabic ? '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062a\u0630\u0643\u0631\u0629' : 'Submit Ticket'}</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
          {isArabic ? '\u062c\u0645\u064a\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u062a\u0633\u062c\u0644 \u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0648\u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0648\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.' : 'All requests and actions are logged for audit, compliance, and data protection.'}
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const licenseStatus = getMedicalLicenseStatus(physicianProfile.licenseExpiryDate);
  const isLicenseExpired = licenseStatus === 'expired';
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [alertCount, setAlertCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNewConsent = () => setScreen('search');
  const handleViewConsent = (_mrn: string) => setScreen('consent-builder');
  const handlePatientSelected = (patient: Patient, encounter: Encounter) => {
    setSelectedPatient(patient);
    setSelectedEncounter(encounter);
    setScreen('consent-builder');
  };

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Best-effort server-side logout.
    }

    try {
      localStorage.removeItem('wathiqcare_token');
      localStorage.removeItem('token');
      sessionStorage.clear();
    } catch {
      // Best-effort client-side cleanup.
    }

    window.location.href = '/login';
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14 }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col shrink-0 overflow-hidden" style={{ background: '#002B5C' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 overflow-hidden bg-transparent">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">WathiqCare</div>
              <div className="text-xs leading-tight" style={{ color: '#C9A13B' }}>Clinical Consent Platform</div>
            </div>
          </div>
        </div>

        {/* Physician info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{physicianProfile.name}</div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{physicianProfile.specialty}</div>
              <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
                <div style={{ color: 'rgba(255,255,255,0.45)' }}>License No: {physicianProfile.licenseNumber}</div>
                <div className={licenseStatus === 'expired' ? 'text-red-300' : licenseStatus === 'expiringSoon' ? 'text-amber-300' : 'text-emerald-300'}>
                  License Expiry: {physicianProfile.licenseExpiryDate}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <p className="text-xs uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Clinical Workspace</p>
          {navItems.map(item => {
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors text-left"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  borderLeft: isActive ? '3px solid #C9A13B' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{lang === 'en' ? item.label : item.labelAr}</span>
                {item.id === 'dashboard' && alertCount > 0 && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#C0392B', color: 'white', minWidth: 18, textAlign: 'center' }}>{alertCount}</span>
                )}
              </button>
            );
          })}

          <div className="border-t border-white/10 mt-3 pt-3">
            <p className="text-xs uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>System</p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-left text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
            >
              <LogOut className="w-4 h-4" />
              {lang === 'en' ? 'Sign Out' : 'تسجيل الخروج'}
            </button>
          </div>
        </nav>

        {/* Compliance footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>PDPL · HIPAA · HL7 FHIR</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>WathiqCare v2.4.1 · Session logged</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b flex items-center px-6 py-3 shrink-0" style={{ borderColor: '#D8DCE3' }}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#6B7280' }}>{lang === 'en' ? 'Department' : 'القسم'}: General Surgery</span>
              <span style={{ color: '#D8DCE3' }}>·</span>
              <span className="text-xs" style={{ color: '#6B7280' }}>28 May 2026</span>
              <span style={{ color: '#D8DCE3' }}>·</span>
              <span className="text-xs font-mono" style={{ color: '#6B7280' }}>Session: 2h 14m</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Lang toggle */}
            <div className="flex border rounded overflow-hidden text-xs" style={{ borderColor: '#D8DCE3' }}>
              <button
                onClick={() => setLang('en')}
                className="px-2.5 py-1.5 font-semibold transition-colors"
                style={{ background: lang === 'en' ? '#002B5C' : 'white', color: lang === 'en' ? 'white' : '#6B7280' }}>
                EN
              </button>
              <button
                onClick={() => setLang('ar')}
                className="px-2.5 py-1.5 font-semibold transition-colors"
                style={{ background: lang === 'ar' ? '#002B5C' : 'white', color: lang === 'ar' ? 'white' : '#6B7280' }}>
                ع
              </button>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                aria-label="Open notifications"
                onClick={() => setShowNotifications((value) => !value)}
                className="relative p-2 rounded hover:bg-[#F4F6F9] transition-colors"
              >
                <Bell className="w-4 h-4" style={{ color: '#6B7280' }} />
                {alertCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full px-1 text-[10px] leading-4 text-white text-center"
                    style={{ background: '#C0392B' }}
                  >
                    {alertCount}
                  </span>
                )}
              </button>

              {showNotifications ? (
                <div className="absolute right-0 top-10 z-50 w-96 rounded-lg border border-[#D8DCE3] bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#EEF1F5] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[#2F2F2F]">Notifications</div>
                      <div className="text-xs text-[#6B7280]">Physician consent alerts</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAlertCount(0);
                        setShowNotifications(false);
                      }}
                      className="text-xs font-medium text-[#002B5C] hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {physicianNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          if (notification.id === 'notif-incomplete-disclosures') {
                            setScreen('dashboard');
                          }
                          setShowNotifications(false);
                        }}
                        className="w-full border-b border-[#EEF1F5] px-4 py-3 text-left hover:bg-[#F4F6F9]"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2 w-2 rounded-full ${
                              notification.severity === 'critical'
                                ? 'bg-red-500'
                                : notification.severity === 'success'
                                  ? 'bg-emerald-500'
                                  : 'bg-[#4B9CD3]'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#2F2F2F]">{notification.title}</div>
                            <div className="mt-0.5 text-xs text-[#6B7280]">{notification.message}</div>
                            <div className="mt-1 text-[11px] text-[#9CA3AF]">{notification.time}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
              <span>Physician Portal</span>
              <span style={{ color: '#D8DCE3' }}>/</span>
              <span style={{ color: '#002B5C', fontWeight: 500 }}>
                {navItems.find(n => n.id === screen)?.[lang === 'en' ? 'label' : 'labelAr']}
              </span>
            </div>
          </div>
        </header>

        {/* Screen content */}
        <div className="flex-1 flex overflow-hidden" style={{ background: '#F4F6F9' }}>
          {screen === 'dashboard' && (
            <PhysicianDashboard onNewConsent={handleNewConsent} onViewConsent={handleViewConsent} licenseExpired={isLicenseExpired} licenseExpiryDate={physicianProfile.licenseExpiryDate} />
          )}
          {screen === 'search' && (
            <PatientSearch onSelectPatient={handlePatientSelected} />
          )}
          {screen === 'consent-builder' && (
            <ConsentBuilder lang={lang} licenseExpired={isLicenseExpired} licenseExpiryDate={physicianProfile.licenseExpiryDate} />
          )}
          {screen === 'status' && (
            <StatusTracking lang={lang} />
          )}
          {screen === 'support-settings' && (
            <SupportSettingsScreen lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}
