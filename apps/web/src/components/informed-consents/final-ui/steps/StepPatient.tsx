"use client";

import React, { useState } from 'react';
import { User, AlertTriangle, Droplets, Phone, Mail, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
  mobile: string;
  email: string;
  onMobileChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}

export function StepPatient({ lang, onNext, onComplete, mobile, email, onMobileChange, onEmailChange }: Props) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [contactVerified, setContactVerified] = useState(false);

  const handleContinue = () => {
    if (!contactVerified) return;
    onComplete('patient', ['v1', 'v2', 'v16']);
    onNext();
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#002B5C]">{lang === 'en' ? 'Patient Identity Confirmation' : 'تأكيد هوية المريض'}</h2>
          <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Verify all patient details before proceeding to consent issuance.' : 'تحقق من جميع بيانات المريض قبل الشروع في إصدار الموافقة.'}</p>
        </div>
        <ClinicalBadge variant="ready" label={lang === 'en' ? 'Identity Confirmed' : 'الهوية مؤكدة'} dot />
      </div>

      {/* Patient card */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        {/* Header banner */}
        <div className="bg-[#002B5C] px-6 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-lg leading-tight">
              {lang === 'en' ? 'Mohammed Ibrahim Al-Rashidi' : 'محمد إبراهيم الراشدي'}
            </div>
            <div className="text-blue-200 text-sm mt-0.5 font-mono">MRN-2024-0847 · ENC-2024-1847</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-red-500/20 border border-red-400 rounded px-2.5 py-1.5 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-red-300" />
              <span className="text-red-200 text-sm font-semibold">A+</span>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="p-6 grid grid-cols-3 gap-6">
          {[
            { label: lang === 'en' ? 'Date of Birth' : 'تاريخ الميلاد', value: '14 March 1978 (46y)', icon: User },
            { label: lang === 'en' ? 'Gender' : 'الجنس', value: lang === 'en' ? 'Male' : 'ذكر', icon: User },
            { label: lang === 'en' ? 'Nationality' : 'الجنسية', value: lang === 'en' ? 'Saudi Arabian' : 'سعودي', icon: Shield },
            { label: lang === 'en' ? 'Mobile' : 'الجوال', value: '+966 50 234 5678', icon: Phone },
            { label: lang === 'en' ? 'Email' : 'البريد الإلكتروني', value: 'm.alrashidi@email.com', icon: Mail },
            { label: lang === 'en' ? 'Department' : 'القسم', value: lang === 'en' ? 'General Surgery' : 'الجراحة العامة', icon: Shield },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-[#EBF3FB] flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-[#4B9CD3]" />
              </div>
              <div>
                <div className="text-xs text-[#6B7280] font-medium">{item.label}</div>
                <div className="text-sm text-[#2F2F2F] mt-0.5">{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Allergy alert */}
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">{lang === 'en' ? 'Documented Allergies' : 'الحساسية الموثقة'}</span>
            </div>
            <div className="flex gap-2">
              {['Penicillin', 'NSAIDs'].map(a => (
                <span key={a} className="bg-red-100 border border-red-300 text-red-800 text-xs font-semibold px-2.5 py-1 rounded">{a}</span>
              ))}
            </div>
            <p className="text-xs text-red-700 mt-2">{lang === 'en' ? 'These allergies must be referenced in the consent document and anesthesia module.' : 'يجب الإشارة إلى هذه الحساسيات في وثيقة الموافقة وفي وحدة التخدير.'}</p>
          </div>
        </div>
      </div>

      {/* Encounter card */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#2F2F2F]">{lang === 'en' ? 'Linked Encounter' : 'الزيارة المرتبطة'}</h3>
          <ClinicalBadge variant="ready" label={lang === 'en' ? 'Active' : 'نشطة'} dot />
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Encounter ID', value: 'ENC-2024-1847' },
            { label: lang === 'en' ? 'Type' : 'النوع', value: lang === 'en' ? 'Pre-Operative' : 'ما قبل الجراحة' },
            { label: lang === 'en' ? 'Date' : 'التاريخ', value: '28 May 2026' },
            { label: lang === 'en' ? 'Physician' : 'الطبيب', value: 'Dr. Khalid Al-Qahtani' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-xs text-[#6B7280]">{item.label}</div>
              <div className="font-medium text-[#2F2F2F] mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Contact Details Verification */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5" data-testid="patient-contact-verification">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#2F2F2F]">{lang === 'en' ? 'Patient Contact Details Verification' : 'التحقق من بيانات التواصل مع المريض'}</h3>
          <ClinicalBadge variant={contactVerified ? 'ready' : 'warning'} label={contactVerified ? (lang === 'en' ? 'Verified' : 'تم التحقق') : (lang === 'en' ? 'Pending Verification' : 'بانتظار التحقق')} dot />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Mobile Number' : 'رقم الجوال'}
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={e => { onMobileChange(e.target.value); setContactVerified(false); }}
              placeholder="+966 5x xxx xxxx"
              title={lang === 'en' ? 'Patient mobile number' : 'رقم جوال المريض'}
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Email Address' : 'البريد الإلكتروني'}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { onEmailChange(e.target.value); setContactVerified(false); }}
              placeholder="patient@example.com"
              title={lang === 'en' ? 'Patient email address' : 'البريد الإلكتروني للمريض'}
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">{lang === 'en' ? 'Preferred Notification Channel' : 'قناة الإشعار المفضّلة'}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sms' as const, label: lang === 'en' ? 'SMS' : 'رسالة نصية', icon: Phone },
              { id: 'email' as const, label: lang === 'en' ? 'Email' : 'بريد إلكتروني', icon: Mail },
              { id: 'both' as const, label: lang === 'en' ? 'SMS + Email' : 'رسالة + بريد', icon: Shield },
            ].map(ch => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannel(ch.id)}
                className={`border rounded px-3 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${channel === ch.id ? 'border-[#002B5C] bg-blue-50 text-[#002B5C]' : 'border-[#D8DCE3] text-[#6B7280] hover:bg-[#F4F6F9]'}`}
              >
                <ch.icon className="w-3.5 h-3.5" />
                {ch.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={contactVerified}
            onChange={e => setContactVerified(e.target.checked)}
            className="w-4 h-4 accent-[#002B5C] mt-0.5"
            data-testid="patient-contact-verified-checkbox"
          />
          <span className="text-sm text-[#2F2F2F]">
            {lang === 'en'
              ? 'I confirm I have verified the patient\u2019s mobile number, email address, and preferred notification channel with the patient directly.'
              : 'أؤكد أنني تحققت من رقم الجوال والبريد الإلكتروني وقناة الإشعار المفضّلة مع المريض مباشرةً.'}
          </span>
        </label>
        {!contactVerified && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800">{lang === 'en' ? 'Continue is disabled until contact details are verified.' : 'زر المتابعة معطَّل حتى يتم التحقق من بيانات التواصل.'}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!contactVerified}
          data-testid="patient-continue-button"
          className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
        >
          {contactVerified && <CheckCircle2 className="w-4 h-4" />}
          {lang === 'en' ? 'Continue to Procedure' : 'متابعة لاختيار الإجراء'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
