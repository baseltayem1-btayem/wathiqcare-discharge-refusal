import React, { useState } from 'react';
import { ChevronLeft, Send, Phone, Mail, Globe, Clock, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
}

export function StepSend({ lang, onPrev, onComplete }: Props) {
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email' | 'both'>('sms');
  const [patientLang, setPatientLang] = useState<'en' | 'ar' | 'both'>('both');
  const [expiryHours, setExpiryHours] = useState('48');
  const [physicianConfirmed, setPhysicianConfirmed] = useState(false);
  const [sent, setSent] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleSend = () => {
    if (physicianConfirmed) {
      onComplete('send', ['v16']);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-emerald-700">{lang === 'en' ? 'Consent Link Sent Successfully' : 'تم إرسال رابط الموافقة بنجاح'}</h2>
          <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'The patient will receive an OTP-secured link to review and sign the consent.' : 'سيتلقى المريض رابطاً آمناً بـ OTP لمراجعة الموافقة والتوقيع عليها.'}</p>
        </div>
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-5 w-full max-w-md text-left">
          <div className="space-y-2 text-sm">
            {[
              { label: 'Sent to', value: '+966 50 234 5678' },
              { label: 'Method', value: 'SMS OTP' },
              { label: 'Language', value: 'Arabic & English' },
              { label: 'Expires', value: 'in 48 hours' },
              { label: 'Reference', value: 'CNS-2024-0847-001' },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-[#6B7280]">{item.label}</span>
                <span className="font-medium text-[#2F2F2F] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <ClinicalBadge variant="info" label={lang === 'en' ? 'Tracking consent in Status tab' : 'متابعة الموافقة في تبويب الحالة'} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Send Secure Consent Link' : 'إرسال رابط الموافقة الآمن'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Confirm patient contact details and OTP method before sending.' : 'أكد بيانات التواصل مع المريض وطريقة OTP قبل الإرسال.'}</p>
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
              defaultValue="+966 50 234 5678"
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
              defaultValue="m.alrashidi@email.com"
              className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]"
            />
          </div>
        </div>
      </div>

      {/* OTP method */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">{lang === 'en' ? 'OTP Signing Method' : 'طريقة التوقيع بـ OTP'}</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'sms' as const, label: lang === 'en' ? 'SMS Only' : 'رسالة SMS فقط', icon: Phone, desc: lang === 'en' ? 'OTP sent to mobile' : 'OTP مُرسَل للجوال' },
            { id: 'email' as const, label: lang === 'en' ? 'Email Only' : 'بريد إلكتروني فقط', icon: Mail, desc: lang === 'en' ? 'OTP sent to email' : 'OTP مُرسَل للبريد' },
            { id: 'both' as const, label: lang === 'en' ? 'SMS + Email' : 'SMS + بريد إلكتروني', icon: Shield, desc: lang === 'en' ? 'Dual verification' : 'تحقق مزدوج' },
          ].map(method => (
            <div key={method.id}
              onClick={() => setOtpMethod(method.id)}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${otpMethod === method.id ? 'border-[#002B5C] bg-blue-50' : 'border-[#D8DCE3] hover:bg-[#F4F6F9]'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <method.icon className="w-4 h-4 text-[#002B5C]" />
                <span className="text-sm font-medium text-[#2F2F2F]">{method.label}</span>
              </div>
              <p className="text-xs text-[#6B7280]">{method.desc}</p>
            </div>
          ))}
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
              <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] block mb-1">{lang === 'en' ? 'Max Resend Attempts' : 'الحد الأقصى لإعادة الإرسال'}</label>
              <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                <option>3 attempts</option>
                <option>5 attempts</option>
                <option>Unlimited</option>
              </select>
            </div>
          </div>
        </div>
      </div>

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
        <button onClick={handleSend} disabled={!physicianConfirmed} className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded text-sm font-semibold transition-colors">
          <Send className="w-4 h-4" />
          {lang === 'en' ? 'Send Consent Link' : 'إرسال رابط الموافقة'}
        </button>
      </div>
    </div>
  );
}
