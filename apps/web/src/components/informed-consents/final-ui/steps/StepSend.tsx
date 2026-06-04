"use client";

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Send, Phone, Mail, Globe, Clock, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
  mobile: string;
  email: string;
  linkedDocumentId?: string;
  documentReady?: boolean;
  isLinkingDocument?: boolean;
  documentError?: string | null;
}

type SecureSigningWorkflowResponse = {
  workflow: {
    signingUrl: string;
    recipientEmail?: string;
    emailDeliveryStatus?: 'sent' | 'failed';
    emailFailureReason?: string | null;
    createdAt: string;
  };
};

export function StepSend({ lang, onPrev, onComplete, mobile, email, linkedDocumentId = '', documentReady = false, isLinkingDocument = false, documentError = null }: Props) {
  const searchParams = useSearchParams();
  const documentId = linkedDocumentId.trim() || (searchParams.get('documentId') || '').trim();
  const [patientLang, setPatientLang] = useState<'en' | 'ar' | 'both'>('both');
  const [expiryHours, setExpiryHours] = useState('48');
  const [physicianConfirmed, setPhysicianConfirmed] = useState(false);
  const [emailAddress, setEmailAddress] = useState(email);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<SecureSigningWorkflowResponse['workflow'] | null>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isDelivered = workflow?.emailDeliveryStatus === 'sent';

  const getLocalizedSendError = (message: string) => {
    if (message.includes('Missing permission: consent:send_signature')) {
      return lang === 'en'
        ? 'Cannot send: this account does not have permission to send the signing link.'
        : 'لا يمكن الإرسال: الحساب لا يملك صلاحية إرسال رابط التوقيع.';
    }

    if (message.includes('Consent document not found')) {
      return lang === 'en'
        ? 'Cannot send the link: no linked consent document exists.'
        : 'لا يمكن إرسال الرابط: لا يوجد مستند موافقة مرتبط.';
    }

    return lang === 'en' ? message : message;
  };

  const handleSend = async () => {
    if (!physicianConfirmed || sending) return;

    const normalizedEmail = emailAddress.trim();
    if (!documentId) {
      setWorkflow(null);
      setError(lang === 'en' ? 'Cannot send the link: no linked consent document exists.' : 'لا يمكن إرسال الرابط: لا يوجد مستند موافقة مرتبط.');
      return;
    }

    if (!normalizedEmail) {
      setWorkflow(null);
      setError(lang === 'en' ? 'Enter the patient email address before sending.' : 'أدخل البريد الإلكتروني للمريض قبل الإرسال.');
      return;
    }

    setSending(true);
    setError(null);
    setWorkflow(null);

    try {
      const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/secure-signing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber: mobile,
          recipientEmail: normalizedEmail,
        }),
      });

      const payload = await response.json().catch(() => null) as SecureSigningWorkflowResponse | { error?: string; message?: string } | null;

      if (!response.ok) {
        throw new Error((payload && 'message' in payload && payload.message) || (payload && 'error' in payload && payload.error) || 'Failed to send secure signing link');
      }

      if (!payload || !('workflow' in payload)) {
        throw new Error('Secure signing response was empty');
      }

      if (payload.workflow.emailDeliveryStatus !== 'sent') {
        throw new Error(payload.workflow.emailFailureReason || 'Secure signing email delivery failed');
      }

      setWorkflow(payload.workflow);
      onComplete('send', ['v16']);
    } catch (sendError) {
      setWorkflow(null);
      const message = sendError instanceof Error ? sendError.message : 'Failed to send secure signing link';
      setError(getLocalizedSendError(message));
    } finally {
      setSending(false);
    }
  };

  if (isDelivered) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <div className="w-full max-w-md bg-emerald-50 border border-emerald-200 rounded px-4 py-3 text-left" data-testid="step-send-success-banner">
          <span className="text-xs font-semibold text-emerald-800">
            {lang === 'en'
              ? 'Controlled pilot — secure link email delivery is active for this live consent document. SMS remains disabled on this surface.'
              : 'تجربة محكومة — إرسال رابط الموافقة عبر البريد الإلكتروني مفعل لهذا المستند الحي. ما يزال SMS معطلاً في هذه الشاشة.'}
          </span>
        </div>
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-emerald-700">{lang === 'en' ? 'Consent Link Sent Successfully' : 'تم إرسال رابط الموافقة بنجاح'}</h2>
          <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'The patient will receive a secure signing link by email to review and sign the consent.' : 'سيتلقى المريض رابط توقيع آمن عبر البريد الإلكتروني لمراجعة الموافقة والتوقيع عليها.'}</p>
        </div>
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5 w-full max-w-md text-left">
          <div className="space-y-2 text-sm">
            {[
              { label: 'Sent to', value: workflow?.recipientEmail || emailAddress },
              { label: 'Method', value: 'Email secure link' },
              { label: 'Language', value: 'Arabic & English' },
              { label: 'Expires', value: 'in 48 hours' },
              { label: 'Document ID', value: documentId },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-[#6B7280]">{item.label}</span>
                <span className="font-medium text-[#2F2F2F] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        {workflow?.signingUrl ? (
          <div className="bg-white border border-[#D8DCE3] rounded-lg p-5 w-full max-w-md text-left">
            <div className="text-xs font-semibold text-[#6B7280] mb-2">{lang === 'en' ? 'Generated secure link' : 'الرابط الآمن المُنشأ'}</div>
            <div className="text-xs text-[#2F2F2F] break-all font-mono">{workflow.signingUrl}</div>
          </div>
        ) : null}
        <ClinicalBadge variant="info" label={lang === 'en' ? 'Tracking consent in Status tab' : 'متابعة الموافقة في تبويب الحالة'} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-4 py-3" data-testid="step-send-pilot-banner">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span className="text-xs font-semibold text-amber-800">
          {lang === 'en'
            ? 'Controlled pilot — this step sends a real secure signing link by email only when the live API succeeds. SMS remains disabled on this surface.'
            : 'تجربة محكومة — ترسل هذه الخطوة رابط توقيع آمن فعلي عبر البريد الإلكتروني فقط عند نجاح الـ API الحي. يبقى SMS معطلاً في هذه الشاشة.'}
        </span>
      </div>
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Send Secure Consent Link' : 'إرسال رابط الموافقة الآمن'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Confirm the patient email address before dispatching the secure link.' : 'أكد البريد الإلكتروني للمريض قبل إرسال الرابط الآمن.'}</p>
      </div>

      <div className={`flex items-center gap-2 rounded px-4 py-2.5 border ${documentId ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <Shield className={`w-4 h-4 shrink-0 ${documentId ? 'text-emerald-600' : 'text-amber-600'}`} />
        <span className={`text-xs ${documentId ? 'text-emerald-800' : 'text-amber-800'}`}>
          {documentId
            ? (lang === 'en' ? `Linked consent document ready: ${documentId}` : `مستند الموافقة المرتبط جاهز: ${documentId}`)
            : isLinkingDocument
            ? (lang === 'en' ? 'Linking the generated consent document before send...' : 'جارٍ ربط مستند الموافقة المُولَّد قبل الإرسال...')
            : documentReady
            ? (lang === 'en' ? 'PDF is marked ready, but no linked consent document was returned yet.' : 'تم تعليم ملف PDF كجاهز، لكن لم يتم إرجاع مستند موافقة مرتبط بعد.')
            : (lang === 'en' ? 'Waiting for a valid linked consent document before send.' : 'بانتظار مستند موافقة مرتبط صالح قبل الإرسال.')}
        </span>
      </div>

      {/* Patient contact */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">{lang === 'en' ? 'Patient Contact Details' : 'بيانات التواصل مع المريض'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Mobile Number' : 'رقم الجوال'}
            </label>
            <input
              type="tel"
              value={mobile}
              readOnly
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
              value={emailAddress}
              onChange={event => setEmailAddress(event.target.value)}
              placeholder="patient@example.com"
              title={lang === 'en' ? 'Patient email address' : 'البريد الإلكتروني للمريض'}
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
            />
          </div>
        </div>
      </div>

      {/* Delivery method */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">{lang === 'en' ? 'Delivery Channel' : 'قناة الإرسال'}</h3>
        <div className="border border-[#002B5C] bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Mail className="w-4 h-4 text-[#002B5C]" />
            <span className="text-sm font-medium text-[#2F2F2F]">{lang === 'en' ? 'Email Only' : 'بريد إلكتروني فقط'}</span>
          </div>
          <p className="text-xs text-[#6B7280]">{lang === 'en' ? 'This pilot activates secure-link delivery by email only. SMS remains disabled unless approved separately.' : 'يفعّل هذا المسار التجريبي إرسال الرابط الآمن عبر البريد الإلكتروني فقط. يظل SMS معطلاً ما لم يعتمد بشكل مستقل.'}</p>
        </div>
      </div>

      {/* Language + expiry */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
          <h3 className="text-[#2F2F2F] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#002B5C]" />
            {lang === 'en' ? 'Consent Language' : 'لغة الموافقة'}
          </h3>
          <div className="space-y-2">
            {[
              { id: 'en' as const, label: 'English only' },
              { id: 'ar' as const, label: 'Arabic only — عربي فقط' },
              { id: 'both' as const, label: 'Bilingual (EN + AR)' },
            ].map(l => (
              <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={patientLang === l.id} onChange={() => setPatientLang(l.id)} className="accent-[#002B5C]" />
                <span className="text-sm text-[#2F2F2F]">{l.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
          <h3 className="text-[#2F2F2F] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#002B5C]" />
            {lang === 'en' ? 'Link Expiry & Limits' : 'انتهاء الرابط والحدود'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'en' ? 'Expiry Duration' : 'مدة الانتهاء'}</label>
              <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} disabled title={lang === 'en' ? 'Secure link expiry duration' : 'مدة انتهاء الرابط الآمن'} className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] disabled:opacity-70">
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </select>
              <p className="mt-1 text-[11px] text-[#6B7280]">{lang === 'en' ? 'The current API controls expiry server-side.' : 'يتحكم الـ API الحالي في مدة الانتهاء من جهة الخادم.'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'en' ? 'Max Resend Attempts' : 'الحد الأقصى لإعادة الإرسال'}</label>
              <select disabled title={lang === 'en' ? 'Maximum resend attempts' : 'الحد الأقصى لإعادة الإرسال'} className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] disabled:opacity-70">
                <option>3 attempts</option>
                <option>5 attempts</option>
                <option>Unlimited</option>
              </select>
              <p className="mt-1 text-[11px] text-[#6B7280]">{lang === 'en' ? 'Resend policy remains managed by the live consent workflow.' : 'تظل سياسة إعادة الإرسال مُدارة من مسار الموافقة الحي.'}</p>
            </div>
          </div>
        </div>
      </div>

      {!documentId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800">{lang === 'en' ? 'Cannot send the link without a linked consent document.' : 'لا يمكن إرسال الرابط: لا يوجد مستند موافقة مرتبط.'}</span>
        </div>
      )}

      {documentError && !documentId && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs text-red-800">{lang === 'en' ? `Failed to link the generated consent document: ${documentError}` : `تعذر ربط مستند الموافقة المُولَّد: ${documentError}`}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs text-red-800">{error}</span>
        </div>
      )}

      {/* Final confirmation */}
      <div className={`bg-[#002B5C]/5 border border-[#002B5C]/20 rounded-lg p-5 ${!physicianConfirmed ? 'opacity-100' : 'border-emerald-300 bg-emerald-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#002B5C]" />
          <span className="text-sm font-semibold text-[#002B5C]">{lang === 'en' ? 'Physician Final Confirmation' : 'التأكيد النهائي للطبيب'}</span>
        </div>
        <div className="space-y-2 text-xs text-[#2F2F2F] mb-4">
          {[
            lang === 'en' ? 'I have verified patient identity and contact details.' : 'لقد تحققت من هوية المريض وبيانات التواصل.',
            lang === 'en' ? 'I confirm all disclosures are accurate and complete.' : 'أؤكد أن جميع الإفصاحات دقيقة ومكتملة.',
            lang === 'en' ? 'I authorize sending the consent link to this patient.' : 'أفوّض إرسال رابط الموافقة إلى هذا المريض.',
            lang === 'en' ? 'I understand this action will be recorded in the audit trail.' : 'أفهم أن هذا الإجراء سيُسجَّل في مسار التدقيق.',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${physicianConfirmed ? 'bg-emerald-500' : 'bg-[#002B5C]/20'}`} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={physicianConfirmed} onChange={e => setPhysicianConfirmed(e.target.checked)} className="w-4 h-4 accent-[#002B5C]" />
          <span className="text-sm font-semibold text-[#002B5C]">
            {lang === 'en' ? 'I confirm all the above statements are true and authorize sending.' : 'أؤكد صحة جميع البيانات أعلاه وأفوّض الإرسال.'}
          </span>
        </label>
      </div>

      {!physicianConfirmed && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800">{lang === 'en' ? 'Send button is disabled until physician confirmation is checked.' : 'زر الإرسال معطَّل حتى يتم تأكيد الطبيب.'}</span>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={() => { void handleSend(); }} disabled={!physicianConfirmed || sending || !documentId || isLinkingDocument} className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded text-sm font-semibold transition-colors">
          <Send className="w-4 h-4" />
          {sending
            ? (lang === 'en' ? 'Sending Email Link...' : 'جارٍ إرسال رابط البريد...')
            : isLinkingDocument
            ? (lang === 'en' ? 'Linking Consent Document...' : 'جارٍ ربط مستند الموافقة...')
            : (lang === 'en' ? 'Send Consent Link' : 'إرسال رابط الموافقة')}
        </button>
      </div>
    </div>
  );
}
