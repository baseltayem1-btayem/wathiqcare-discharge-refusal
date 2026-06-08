import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Clock, Shield, Activity } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
}

const anesthesiaTypes = [
  { id: 'GA', label: 'General Anesthesia', labelAr: 'تخدير عام', desc: 'Patient fully unconscious. Requires airway management.' },
  { id: 'SA', label: 'Spinal Anesthesia', labelAr: 'تخدير شوكي', desc: 'Regional block via subarachnoid injection.' },
  { id: 'EP', label: 'Epidural Anesthesia', labelAr: 'تخدير فوق الجافية', desc: 'Continuous epidural catheter placement.' },
  { id: 'LA', label: 'Local Anesthesia + Sedation', labelAr: 'تخدير موضعي + تخدير خفيف', desc: 'Local block with conscious sedation.' },
];

const phases = [
  { key: 'pre', icon: Clock, label: 'Pre-Anesthesia Evaluation', labelAr: 'التقييم قبل التخدير', color: '#4B9CD3' },
  { key: 'intra', icon: Activity, label: 'Intraoperative Plan', labelAr: 'الخطة داخل العملية', color: '#002B5C' },
  { key: 'post', icon: Shield, label: 'Post-Anesthesia Recovery', labelAr: 'التعافي بعد التخدير', color: '#1A7F4B' },
];

export function StepAnesthesia({ lang, onNext, onPrev, onComplete }: Props) {
  const [selectedType, setSelectedType] = useState('GA');
  const [activePhase, setActivePhase] = useState('pre');
  const [fastingAcknowledged, setFastingAcknowledged] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'reviewed'>('pending');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleComplete = () => {
    onComplete('anesthesia', ['v6', 'v7', 'v8']);
    onNext();
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#002B5C]">{lang === 'en' ? 'Anesthesia Module' : 'وحدة التخدير'}</h2>
          <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Perioperative anesthesia planning and patient disclosure.' : 'تخطيط التخدير حول الجراحة وإفصاح المريض.'}</p>
        </div>
        <div className="flex items-center gap-2">
          {reviewStatus === 'reviewed'
            ? <ClinicalBadge variant="ready" label={lang === 'en' ? 'Anesthesiologist Reviewed' : 'مراجعة طبيب التخدير'} dot />
            : <ClinicalBadge variant="warning" label={lang === 'en' ? 'Pending Review' : 'في انتظار المراجعة'} dot />
          }
        </div>
      </div>

      {/* Anesthesia type */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <h3 className="text-[#2F2F2F] mb-4">{lang === 'en' ? 'Anesthesia Type' : 'نوع التخدير'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {anesthesiaTypes.map(at => (
            <div key={at.id} onClick={() => setSelectedType(at.id)}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedType === at.id ? 'border-[#002B5C] bg-blue-50' : 'border-[#D8DCE3] hover:bg-[#F4F6F9]'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedType === at.id ? 'border-[#002B5C]' : 'border-[#D8DCE3]'}`}>
                  {selectedType === at.id && <div className="w-2 h-2 rounded-full bg-[#002B5C]" />}
                </div>
                <span className="font-medium text-sm text-[#2F2F2F]">{lang === 'en' ? at.label : at.labelAr}</span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1.5 ml-5">{at.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Perioperative phases */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        <div className="flex border-b border-[#D8DCE3]">
          {phases.map(phase => (
            <button key={phase.key}
              onClick={() => setActivePhase(phase.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${activePhase === phase.key ? 'border-[#002B5C] text-[#002B5C] bg-blue-50/50' : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'}`}>
              <phase.icon className="w-4 h-4" />
              {lang === 'en' ? phase.label : phase.labelAr}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activePhase === 'pre' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'ASA Classification' : 'تصنيف ASA'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>ASA I — Normal healthy patient</option>
                    <option>ASA II — Mild systemic disease</option>
                    <option>ASA III — Severe systemic disease</option>
                    <option>ASA IV — Life-threatening disease</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Airway Assessment (Mallampati)' : 'تقييم مجرى الهواء'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>Class I — Full visibility</option>
                    <option>Class II — Partial uvula visible</option>
                    <option>Class III — Soft palate visible</option>
                    <option>Class IV — Hard palate only</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">{lang === 'en' ? 'Fasting Instructions (NPO)' : 'تعليمات الصيام (NPO)'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  {[
                    { item: lang === 'en' ? 'Solid food' : 'طعام صلب', time: '8 hours' },
                    { item: lang === 'en' ? 'Clear liquids' : 'سوائل صافية', time: '2 hours' },
                    { item: lang === 'en' ? 'Breast milk' : 'حليب الأم', time: '4 hours' },
                  ].map(f => (
                    <div key={f.item} className="bg-white border border-amber-200 rounded p-2.5 text-center">
                      <div className="text-amber-800 font-semibold">{f.time}</div>
                      <div className="text-xs text-amber-700 mt-0.5">{f.item}</div>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fastingAcknowledged} onChange={e => setFastingAcknowledged(e.target.checked)} className="w-3.5 h-3.5 accent-amber-600" />
                  <span className="text-xs text-amber-800">{lang === 'en' ? 'Fasting instructions will be included in patient education package.' : 'ستُضمَّن تعليمات الصيام في حزمة تثقيف المريض.'}</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Allergy Notes for Anesthesia' : 'ملاحظات الحساسية للتخدير'}</label>
                <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="text-xs text-red-800">{lang === 'en' ? 'Patient is allergic to Penicillin and NSAIDs — confirm no cross-reactivity with planned anesthetic agents.' : 'المريض لديه حساسية من البنسلين ومضادات الالتهاب — تأكد من عدم وجود تفاعل متقاطع مع عوامل التخدير المخططة.'}</span>
                </div>
                <textarea
                  rows={2}
                  placeholder={lang === 'en' ? 'Additional anesthesia notes...' : 'ملاحظات إضافية للتخدير...'}
                  className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${lang === 'ar' ? 'text-right' : ''}`}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}

          {activePhase === 'intra' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Induction Agent' : 'عامل التحريض'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>Propofol 1.5–2 mg/kg IV</option>
                    <option>Ketamine 1–2 mg/kg IV</option>
                    <option>Etomidate 0.3 mg/kg IV</option>
                    <option>Sevoflurane inhalation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Maintenance' : 'الصيانة'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>Sevoflurane + O2/Air</option>
                    <option>Isoflurane + N2O/O2</option>
                    <option>TIVA — Propofol infusion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Monitoring Plan' : 'خطة المراقبة'}</label>
                <div className="flex gap-2 flex-wrap">
                  {['ECG', 'SpO2', 'NIBP', 'ETCO2', 'Temperature', 'Neuromuscular', 'Arterial line'].map(m => (
                    <span key={m} className="border border-[#D8DCE3] rounded px-2.5 py-1 text-xs text-[#2F2F2F] bg-[#F4F6F9] cursor-pointer hover:border-[#002B5C] hover:bg-blue-50">{m}</span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Anesthesia Risks to Disclose' : 'مخاطر التخدير المطلوب إفصاحها'}</label>
                <div className="space-y-2">
                  {[
                    { risk: lang === 'en' ? 'Nausea and vomiting (20–30%)' : 'الغثيان والتقيؤ (20-30%)', severity: 'warning' as const },
                    { risk: lang === 'en' ? 'Sore throat from intubation' : 'التهاب الحلق من التنبيب', severity: 'warning' as const },
                    { risk: lang === 'en' ? 'Dental injury (rare)' : 'إصابة الأسنان (نادر)', severity: 'info' as const },
                    { risk: lang === 'en' ? 'Awareness during anesthesia (1 in 1000)' : 'الاستيقاظ أثناء التخدير (1 في 1000)', severity: 'critical' as const },
                    { risk: lang === 'en' ? 'Allergic reaction to anesthetic agents' : 'تفاعل تحسسي مع عوامل التخدير', severity: 'critical' as const },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 border border-[#D8DCE3] rounded bg-[#F8F9FB]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs text-[#2F2F2F] flex-1">{r.risk}</span>
                      <ClinicalBadge variant={r.severity} label={r.severity === 'critical' ? (lang === 'en' ? 'Critical' : 'حرج') : r.severity === 'warning' ? (lang === 'en' ? 'Warn' : 'تنبيه') : 'Info'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePhase === 'post' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Recovery Location' : 'مكان التعافي'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>PACU (Post-Anesthesia Care Unit)</option>
                    <option>ICU — High-dependency monitoring</option>
                    <option>Surgical ward</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Estimated PACU Stay' : 'مدة إقامة PACU المتوقعة'}</label>
                  <select className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3]">
                    <option>30 minutes</option>
                    <option>60 minutes</option>
                    <option>90 minutes</option>
                    <option>Until criteria met (Aldrete score ≥9)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2">{lang === 'en' ? 'Post-Anesthesia Instructions for Patient' : 'تعليمات ما بعد التخدير للمريض'}</label>
                <textarea
                  rows={4}
                  defaultValue={lang === 'en'
                    ? 'Do not drive or operate machinery for 24 hours. Avoid alcohol for 24 hours. Rest and have a responsible adult accompany you. Contact us immediately if you experience severe headache, difficulty breathing, or chest pain.'
                    : 'لا تقود السيارة أو تشغل الآلات لمدة 24 ساعة. تجنب الكحول لمدة 24 ساعة. استرح وتأكد من وجود شخص بالغ مسؤول معك. اتصل بنا فوراً إذا عانيت من صداع شديد أو صعوبة في التنفس أو ألم في الصدر.'}
                  className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${lang === 'ar' ? 'text-right' : ''}`}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review status */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#2F2F2F]">{lang === 'en' ? 'Anesthesiologist Review' : 'مراجعة طبيب التخدير'}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{lang === 'en' ? 'Dr. Rania Al-Farsi (Anesthesiology)' : 'د. رانيا الفارسي (قسم التخدير)'}</p>
        </div>
        <div className="flex items-center gap-2">
          {reviewStatus === 'reviewed' ? (
            <ClinicalBadge variant="ready" label={lang === 'en' ? 'Reviewed & Approved' : 'تمت المراجعة والموافقة'} dot />
          ) : (
            <button onClick={() => setReviewStatus('reviewed')} className="border border-[#002B5C] text-[#002B5C] hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-medium transition-colors">
              {lang === 'en' ? 'Mark as Reviewed' : 'تحديد كـ"تمت المراجعة"'}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={handleComplete} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
          {lang === 'en' ? 'Continue to Disclosures' : 'متابعة للإفصاحات'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
