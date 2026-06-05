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
  const medicalLicenseStatus = getMedicalLicenseStatus(physicianProfile.licenseExpiryDate);
  const [supportRequestModal, setSupportRequestModal] = useState<null | 'settings' | 'technical-ticket' | 'legal-consultation' | 'medical-communication'>(null);
  const [platformSettings, setPlatformSettings] = useState(() => ({
    emailNotifications: true,
    smsNotifications: true,
    whatsappCommunication: true,
    inAppAlerts: true,
    trakCareSync: true,
    docuWareArchive: true,
    auditLogEnabled: true,
    showRequestContext: true,
    sessionTimeoutMinutes: '30',
    defaultLanguage: lang,
  }));

  const updatePlatformSetting = (key: keyof typeof platformSettings, value: boolean | string) => {
    setPlatformSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };


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

  const medicalCommunicationWhatsAppRoutes: Record<string, string> = {
    'Attending Physician': process.env.NEXT_PUBLIC_WHATSAPP_ATTENDING_PHYSICIAN || '',
    Anesthesiologist: process.env.NEXT_PUBLIC_WHATSAPP_ANESTHESIOLOGIST || '',
    'Nursing Team': process.env.NEXT_PUBLIC_WHATSAPP_NURSING_TEAM || '',
    'Medical Complaints': process.env.NEXT_PUBLIC_WHATSAPP_MEDICAL_COMPLAINTS || '',
    'Patient Experience': process.env.NEXT_PUBLIC_WHATSAPP_PATIENT_EXPERIENCE || '',
    Other: process.env.NEXT_PUBLIC_WHATSAPP_MEDICAL_COMMUNICATION_GENERAL || '',
  };

  const cards = [
    {
      title: isArabic ? '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Settings',
      description: isArabic ? '\u0625\u062f\u0627\u0631\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0648\u0627\u0644\u0623\u0631\u0634\u0641\u0629 \u0648\u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642.' : 'Manage account settings, alerts, sync, archiving, and audit log.',
      button: isArabic ? '\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0644\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Open Settings',
      icon: Settings,
      tone: 'blue',
      modal: 'settings',
    },
    {
      title: isArabic ? '\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0637\u0628\u064a' : 'Medical Communication',
      description: isArabic ? '\u0642\u0646\u0627\u0629 \u062a\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u064a\u0646 \u0627\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u060c \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u0627\u0644\u062a\u0645\u0631\u064a\u0636\u060c \u0627\u0644\u0634\u0643\u0627\u0648\u0649 \u0627\u0644\u0637\u0628\u064a\u0629\u060c \u0648\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u0631\u0636\u0649.' : 'Direct WhatsApp communication between the attending physician, anesthesiologist, nursing, medical complaints, and patient experience.',
      button: isArabic ? '\u0628\u062f\u0621 \u0645\u062d\u0627\u062f\u062b\u0629 \u0648\u0627\u062a\u0633\u0627\u0628' : 'Start WhatsApp Chat',
      icon: Activity,
      tone: 'purple',
      modal: 'medical-communication',
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

        const modal = button.getAttribute('data-modal') as
          | null
          | 'settings'
          | 'medical-communication'
          | 'legal-consultation'
          | 'technical-ticket';

        if (modal === 'settings') {
          event.preventDefault();
          event.stopPropagation();
          setSupportRequestModal('settings');
          return;
        }

        if (modal === 'medical-communication') {
          event.preventDefault();
          event.stopPropagation();
          setSupportRequestModal('medical-communication');
          return;
        }

        if (modal === 'legal-consultation') {
          event.preventDefault();
          event.stopPropagation();
          setSupportRequestModal('legal-consultation');
          return;
        }

        if (modal === 'technical-ticket') {
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
                  data-modal={card.modal || undefined}
                  onClick={() => {
                    if (card.modal) {
                      setSupportRequestModal(card.modal);
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

        {supportRequestModal === 'settings' ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-5xl rounded-xl border border-[#D8DCE3] bg-white shadow-xl" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="flex items-start justify-between border-b border-[#EEF1F5] px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-[#002B5C]">
                    {isArabic ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0637\u0628\u064a\u0628' : 'Physician User Settings'}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {isArabic ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0634\u062e\u0635\u064a\u0629 \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629 \u0628\u0634\u0643\u0644 \u0622\u0645\u0646 \u0648\u0633\u0644\u064a\u0645\u060c \u0645\u0639 \u0639\u0631\u0636 \u062d\u0627\u0644\u0629 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0641\u0642\u0637.' : 'Personal settings for safe physician use, with system status shown as view-only.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportRequestModal(null)}
                  className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]"
                >
                  ?
                </button>
              </div>

              <div className="max-h-[78vh] overflow-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u0628\u064a\u0627\u0646\u0627\u062a\u064a \u0648\u0627\u0644\u062a\u0631\u062e\u064a\u0635' : 'My Profile & License'}
                    </h3>

                    <div className="mt-4 space-y-2 rounded bg-white px-3 py-3 text-sm">
                      <div><span className="font-medium">Name:</span> {physicianProfile.name}</div>
                      <div><span className="font-medium">Specialty:</span> {physicianProfile.specialty}</div>
                      <div><span className="font-medium">License:</span> {physicianProfile.licenseNumber}</div>
                      <div><span className="font-medium">Expiry:</span> {physicianProfile.licenseExpiryDate}</div>
                      <div>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          medicalLicenseStatus === 'expired'
                            ? 'bg-red-100 text-red-700'
                            : medicalLicenseStatus === 'expiring-soon'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          {medicalLicenseStatus === 'expired'
                            ? 'Expired'
                            : medicalLicenseStatus === 'expiring-soon'
                              ? 'Expiring Soon'
                              : 'Active'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSupportRequestModal('technical-ticket');
                      }}
                      className="mt-4 w-full rounded border border-[#002B5C] px-4 py-2 text-sm font-semibold text-[#002B5C] hover:bg-blue-50"
                    >
                      {isArabic ? '\u0637\u0644\u0628 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0631\u062e\u064a\u0635' : 'Request License Update'}
                    </button>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u062a\u0646\u0628\u064a\u0647\u0627\u062a\u064a' : 'My Notifications'}
                    </h3>

                    <div className="mt-4 space-y-3 text-sm">
                      {[
                        ['emailNotifications', isArabic ? '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a' : 'Email notifications'],
                        ['smsNotifications', isArabic ? '\u0631\u0633\u0627\u0626\u0644 SMS / OTP' : 'SMS / OTP notifications'],
                        ['whatsappCommunication', isArabic ? '\u062a\u0648\u0627\u0635\u0644 WhatsApp' : 'WhatsApp communication'],
                        ['inAppAlerts', isArabic ? '\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0646\u0635\u0629' : 'In-app alerts'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(platformSettings[key as keyof typeof platformSettings])}
                            onChange={(event) => updatePlatformSetting(key as keyof typeof platformSettings, event.target.checked)}
                          />
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0637\u0628\u064a' : 'Medical Communication'}
                    </h3>

                    <div className="mt-4 space-y-3 text-sm">
                      <label className="block">
                        <span className="font-medium">{isArabic ? '\u0627\u0644\u062c\u0647\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629' : 'Default target'}</span>
                        <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2">
                          <option>Attending Physician</option>
                          <option>Anesthesiologist</option>
                          <option>Nursing Team</option>
                          <option>Medical Complaints</option>
                          <option>Patient Experience</option>
                        </select>
                      </label>

                      <div className="rounded bg-white px-3 py-3">
                        <div className="font-medium text-[#002B5C]">{isArabic ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0648\u062c\u064a\u0647' : 'Routing status'}</div>
                        <div className="mt-2 space-y-1 text-xs text-[#4B5563]">
                          <div>Attending Physician: View only</div>
                          <div>Anesthesiologist: View only</div>
                          <div>Nursing Team: View only</div>
                          <div>Medical Complaints: View only</div>
                          <div>Patient Experience: View only</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-modal="medical-communication"
                        onClick={() => setSupportRequestModal('medical-communication')}
                        className="w-full rounded bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                      >
                        {isArabic ? '\u0641\u062a\u062d \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0637\u0628\u064a' : 'Open Medical Communication'}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u0627\u0644\u062c\u0644\u0633\u0629 \u0648\u0627\u0644\u0623\u0645\u0627\u0646' : 'Session & Security'}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                      <label>
                        <span className="font-medium">{isArabic ? '\u0645\u062f\u0629 \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u062c\u0644\u0633\u0629' : 'Session timeout'}</span>
                        <select
                          value={platformSettings.sessionTimeoutMinutes}
                          onChange={(event) => updatePlatformSetting('sessionTimeoutMinutes', event.target.value)}
                          className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2"
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">60 minutes</option>
                        </select>
                      </label>

                      <div className="rounded bg-white px-3 py-3 text-xs text-[#4B5563]">
                        MFA / OTP: Active<br />
                        Role: Physician User<br />
                        Access: Consent issuance and follow-up only
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u062a\u0641\u0636\u064a\u0644\u0627\u062a \u0627\u0644\u0639\u0631\u0636' : 'Display Preferences'}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                      <label>
                        <span className="font-medium">{isArabic ? '\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629' : 'Default language'}</span>
                        <select
                          value={platformSettings.defaultLanguage}
                          onChange={(event) => updatePlatformSetting('defaultLanguage', event.target.value)}
                          className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2"
                        >
                          <option value="en">English</option>
                          <option value="ar">Arabic</option>
                        </select>
                      </label>

                      <label>
                        <span className="font-medium">{isArabic ? '\u0643\u062b\u0627\u0641\u0629 \u0627\u0644\u0634\u0627\u0634\u0629' : 'Screen density'}</span>
                        <select className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2">
                          <option>Comfortable</option>
                          <option>Compact</option>
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645' : 'System Status - View Only'}
                    </h3>

                    <div className="mt-4 space-y-2 text-sm">
                      {[
                        ['TrakCare Sync', 'Active', 'Last sync: Today 10:25 AM'],
                        ['DocuWare Archive', 'Active', 'Last archive: Successful'],
                        ['Email Provider', 'Configured', 'Provider managed by IT'],
                        ['SMS / OTP Provider', 'Configured', 'Provider managed by IT'],
                        ['WhatsApp Routing', 'Configured by Admin', 'Numbers are not editable by physician'],
                        ['Audit Log', 'Enabled', 'Immutable activity record'],
                      ].map(([name, status, detail]) => (
                        <div key={name} className="rounded bg-white px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{name}</span>
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{status}</span>
                          </div>
                          <div className="mt-1 text-xs text-[#6B7280]">{detail}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#D8DCE3] bg-[#F8FAFC] p-4 xl:col-span-3">
                    <h3 className="font-bold text-[#002B5C]">
                      {isArabic ? '\u0637\u0644\u0628\u0627\u062a\u064a \u0648\u0627\u0644\u062a\u0634\u062e\u064a\u0635' : 'My Requests & Diagnostics'}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                      <button
                        type="button"
                        data-modal="technical-ticket"
                        onClick={() => setSupportRequestModal('technical-ticket')}
                        className="rounded border border-[#002B5C] bg-white px-4 py-3 font-semibold text-[#002B5C] hover:bg-blue-50"
                      >
                        {isArabic ? '\u0641\u062a\u062d \u062a\u0630\u0643\u0631\u0629 \u062f\u0639\u0645' : 'Open Support Ticket'}
                      </button>

                      <button
                        type="button"
                        data-modal="legal-consultation"
                        onClick={() => setSupportRequestModal('legal-consultation')}
                        className="rounded border border-green-700 bg-white px-4 py-3 font-semibold text-green-700 hover:bg-green-50"
                      >
                        {isArabic ? '\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629' : 'Request Legal Consultation'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const diagnostics = {
                            user: physicianProfile.name,
                            specialty: physicianProfile.specialty,
                            page: supportRequestContext.page,
                            timestamp: new Date().toISOString(),
                            sessionReference: supportRequestContext.sessionReference,
                            settings: platformSettings,
                          };

                          try {
                            navigator.clipboard?.writeText(JSON.stringify(diagnostics, null, 2));
                          } catch {
                            // Clipboard may be unavailable.
                          }

                          window.alert(isArabic ? '\u062a\u0645 \u062a\u062c\u0647\u064a\u0632 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0634\u062e\u064a\u0635.' : 'Diagnostic information prepared.');
                        }}
                        className="rounded border border-amber-600 bg-white px-4 py-3 font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        {isArabic ? '\u062a\u0635\u062f\u064a\u0631 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0634\u062e\u064a\u0635' : 'Export Diagnostic Info'}
                      </button>
                    </div>
                  </section>
                </div>

                <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {isArabic ? '\u0647\u0630\u0647 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u062e\u0627\u0635\u0629 \u0628\u0627\u0644\u0637\u0628\u064a\u0628. \u0623\u0645\u0627 \u0625\u0639\u062f\u0627\u062f\u0627\u062a TrakCare \u0648DocuWare \u0648\u0645\u0632\u0648\u062f\u064a \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u0623\u0631\u0642\u0627\u0645 WhatsApp \u0641\u062a\u062f\u0627\u0631 \u0645\u0646 IT/Admin \u0641\u0642\u0637.' : 'These are physician user settings. TrakCare, DocuWare, provider credentials, and WhatsApp routing numbers are managed by IT/Admin only.'}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSupportRequestModal(null)}
                    className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]"
                  >
                    {isArabic ? '\u0625\u063a\u0644\u0627\u0642' : 'Close'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem('wathiqcare-physician-user-settings', JSON.stringify(platformSettings));
                      } catch {
                        // localStorage may be unavailable.
                      }

                      window.alert(isArabic ? '\u062a\u0645 \u062d\u0641\u0638 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0637\u0628\u064a\u0628.' : 'Physician settings saved.');
                      setSupportRequestModal(null);
                    }}
                    className="rounded bg-[#002B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003B7A]"
                  >
                    {isArabic ? '\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {supportRequestModal === 'medical-communication' ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-2xl rounded-xl border border-[#D8DCE3] bg-white shadow-xl" dir={isArabic ? 'rtl' : 'ltr'}>
              <div className="flex items-start justify-between border-b border-[#EEF1F5] px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-[#002B5C]">
                    {isArabic ? '\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0637\u0628\u064a' : 'Medical Communication'}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {isArabic ? '\u0642\u0646\u0627\u0629 \u062a\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u064a\u0646 \u0627\u0644\u0637\u0628\u064a\u0628 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u060c \u0637\u0628\u064a\u0628 \u0627\u0644\u062a\u062e\u062f\u064a\u0631\u060c \u0627\u0644\u062a\u0645\u0631\u064a\u0636\u060c \u0627\u0644\u0634\u0643\u0627\u0648\u0649 \u0627\u0644\u0637\u0628\u064a\u0629\u060c \u0648\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u0631\u0636\u0649.' : 'Direct WhatsApp communication between the attending physician, anesthesiologist, nursing, medical complaints, and patient experience.'}
                  </p>
                </div>
                <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F4F6F9]">?</button>
              </div>

              <form
                className="space-y-4 px-6 py-5"
                onSubmit={(event) => {
                  event.preventDefault();

                  const formData = new FormData(event.currentTarget);
                  const target = String(formData.get('target') || '');
                  const message = String(formData.get('message') || '');
                  const selectedWhatsAppNumber = medicalCommunicationWhatsAppRoutes[target] || medicalCommunicationWhatsAppRoutes.Other;

                  if (!selectedWhatsAppNumber) {
                    window.alert(
                      isArabic
                        ? '\u0631\u0642\u0645 \u0648\u0627\u062a\u0633\u0627\u0628 \u0627\u0644\u062c\u0647\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u063a\u064a\u0631 \u0645\u0636\u0627\u0641 \u0641\u064a \u0645\u062a\u063a\u064a\u0631\u0627\u062a \u0627\u0644\u0628\u064a\u0626\u0629.'
                        : `WhatsApp number for ${target} is not configured.`
                    );
                    return;
                  }

                  const whatsappMessage = [
                    'WathiqCare Medical Communication',
                    `Target: ${target}`,
                    `User: ${supportRequestContext.user}`,
                    `Specialty: ${supportRequestContext.specialty}`,
                    `Page: ${supportRequestContext.page}`,
                    `Timestamp: ${supportRequestContext.timestamp}`,
                    `Session: ${supportRequestContext.sessionReference}`,
                    '',
                    message,
                  ].join('\n');

                  const normalizedNumber = selectedWhatsAppNumber.replace(/[^0-9]/g, '');
                  const url = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(whatsappMessage)}`;

                  window.open(url, '_blank', 'noopener,noreferrer');
                  setSupportRequestModal(null);
                }}
              >
                <label className="block">
                  <span className="text-sm font-medium text-[#2F2F2F]">
                    {isArabic ? '\u062c\u0647\u0629 \u0627\u0644\u062a\u0648\u0627\u0635\u0644' : 'Communication Target'}
                  </span>
                  <select name="target" className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm">
                    <option value="Attending Physician">Attending Physician</option>
                    <option value="Anesthesiologist">Anesthesiologist</option>
                    <option value="Nursing Team">Nursing Team</option>
                    <option value="Medical Complaints">Medical Complaints</option>
                    <option value="Patient Experience">Patient Experience</option>
                    <option value="Other">Other / General Medical Communication</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#2F2F2F]">
                    {isArabic ? '\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629' : 'Message'}
                  </span>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="mt-1 w-full rounded border border-[#D8DCE3] px-3 py-2 text-sm"
                    placeholder={isArabic ? '\u0627\u0643\u062a\u0628 \u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u062a\u0648\u0627\u0635\u0644\u060c \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0623\u0648 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629.' : 'Write the medical communication topic, case, or note requiring follow-up.'}
                  />
                </label>

                <div className="rounded border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                  {isArabic ? '\u0633\u064a\u062a\u0645 \u0625\u0631\u0641\u0627\u0642 \u0633\u064a\u0627\u0642 \u0627\u0644\u0637\u0644\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627: \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u060c \u0627\u0644\u0635\u0641\u062d\u0629\u060c \u0627\u0644\u0648\u0642\u062a\u060c \u0648\u0645\u0631\u062c\u0639 \u0627\u0644\u062c\u0644\u0633\u0629.' : 'The request will automatically include user, page, timestamp, and session reference.'}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setSupportRequestModal(null)} className="rounded border border-[#D8DCE3] px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F4F6F9]">
                    {isArabic ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
                  </button>
                  <button type="submit" className="rounded bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800">
                    {isArabic ? '\u0641\u062a\u062d \u0648\u0627\u062a\u0633\u0627\u0628' : 'Open WhatsApp'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

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
                <div className={licenseStatus === 'expired' ? 'text-red-300' : licenseStatus === 'expiring-soon' ? 'text-amber-300' : 'text-emerald-300'}>
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
