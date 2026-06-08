import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Monitor, FileText, Eye, Archive } from 'lucide-react';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
}

const previewTabs = [
  { id: 'patient', label: 'Patient View', labelAr: 'عرض المريض', icon: Eye },
  { id: 'pdf', label: 'PDF Preview', labelAr: 'معاينة PDF', icon: FileText },
  { id: 'evidence', label: 'Evidence Package', labelAr: 'الحزمة الدليلية', icon: Archive },
];

export function StepPreview({ lang, onNext, onPrev, onComplete }: Props) {
  const [previewTab, setPreviewTab] = useState('patient');
  const [confirmed, setConfirmed] = useState(false);

  const handleComplete = () => {
    onComplete('preview', ['v14']);
    onNext();
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Patient Preview Simulation' : 'محاكاة معاينة المريض'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'See exactly what the patient will see before you send the consent link.' : 'شاهد بالضبط ما سيراه المريض قبل إرسال رابط الموافقة.'}</p>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-5 gap-4">
        {/* Physician controls */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-[#002B5C]" />
              <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Authoring Controls' : 'أدوات التأليف'}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{lang === 'en' ? 'Patient Language' : 'لغة المريض'}</label>
                <div className="flex gap-2">
                  {['English', 'Arabic', 'Both'].map(l => (
                    <button key={l} className={`flex-1 py-1.5 text-xs border rounded font-medium transition-colors ${l === 'Both' ? 'bg-[#002B5C] text-white border-[#002B5C]' : 'border-[#D8DCE3] text-[#6B7280] hover:bg-[#F4F6F9]'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{lang === 'en' ? 'Font Size' : 'حجم الخط'}</label>
                <div className="flex gap-2">
                  {['Small', 'Normal', 'Large'].map((s, i) => (
                    <button key={s} className={`flex-1 py-1.5 text-xs border rounded transition-colors ${i === 1 ? 'bg-[#F4F6F9] border-[#002B5C] text-[#002B5C]' : 'border-[#D8DCE3] text-[#6B7280] hover:bg-[#F4F6F9]'}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#EEF1F5]">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{lang === 'en' ? 'Content Included' : 'المحتوى المدرج'}</p>
                {[
                  { label: lang === 'en' ? 'Procedure description' : 'وصف الإجراء', done: true },
                  { label: lang === 'en' ? 'Reasons & indication' : 'الأسباب والمؤشرات', done: true },
                  { label: lang === 'en' ? 'Patient-specific risks' : 'المخاطر الخاصة بالمريض', done: true },
                  { label: lang === 'en' ? 'Alternatives discussed' : 'البدائل المناقشة', done: true },
                  { label: lang === 'en' ? 'Anesthesia plan' : 'خطة التخدير', done: true },
                  { label: lang === 'en' ? 'Education package' : 'حزمة التثقيف', done: true },
                  { label: lang === 'en' ? 'Arabic translation' : 'الترجمة العربية', done: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 py-1">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className={`text-xs ${item.done ? 'text-[#2F2F2F]' : 'text-amber-700'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">{lang === 'en' ? 'PDF Metadata' : 'بيانات PDF'}</p>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Patient MRN', value: 'MRN-2024-0847' },
                { label: 'Physician', value: 'Dr. K. Al-Qahtani' },
                { label: 'Procedure', value: 'Lap. Cholecystectomy' },
                { label: 'Version', value: 'v1.0 (Draft)' },
                { label: 'Created', value: '28 May 2026, 10:34' },
                { label: 'Hash', value: 'SHA256: pending...' },
              ].map(m => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-[#6B7280]">{m.label}</span>
                  <span className="font-mono text-[#2F2F2F]">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview area */}
        <div className="col-span-3 bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
          <div className="border-b border-[#D8DCE3]">
            <div className="flex">
              {previewTabs.map(tab => (
                <button key={tab.id}
                  onClick={() => setPreviewTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${previewTab === tab.id ? 'border-[#4B9CD3] text-[#002B5C]' : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'}`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {lang === 'en' ? tab.label : tab.labelAr}
                </button>
              ))}
            </div>
          </div>

          <div className="p-0 overflow-y-auto" style={{ maxHeight: '520px' }}>
            {previewTab === 'patient' && (
              <div className="p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {/* Simulated patient view */}
                <div className="border-2 border-dashed border-[#4B9CD3]/30 rounded-lg p-4 mb-4 bg-[#EBF3FB]/30">
                  <p className="text-xs text-[#4B9CD3] font-medium text-center">— Patient View Simulation — What the patient sees on their device —</p>
                </div>

                <div className="text-center mb-6">
                  <div className="text-lg font-semibold text-[#002B5C]">WathiqCare</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">Digital Informed Consent</div>
                </div>

                <div className="bg-[#F4F6F9] border border-[#D8DCE3] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Mohammed Al-Rashidi' : 'محمد الراشدي'}</span>
                    <span className="text-xs font-mono text-[#6B7280]">MRN-2024-0847</span>
                  </div>
                  <div className="text-xs text-[#6B7280] space-y-1">
                    <div>Procedure: <span className="text-[#2F2F2F] font-medium">{lang === 'en' ? 'Laparoscopic Cholecystectomy' : 'استئصال المرارة بالمنظار'}</span></div>
                    <div>Department: <span className="text-[#2F2F2F]">General Surgery</span></div>
                    <div>Physician: <span className="text-[#2F2F2F]">Dr. Khalid Al-Qahtani</span></div>
                  </div>
                </div>

                {[
                  { title: lang === 'en' ? 'What will happen?' : 'ماذا سيحدث؟', body: lang === 'en' ? 'Your surgeon will make 3–4 small cuts in your abdomen and use a small camera and tools to remove your gallbladder. You will be under general anesthesia and will not feel anything.' : 'سيجري طبيبك 3-4 شقوق صغيرة في بطنك ويستخدم كاميرا صغيرة وأدوات لإزالة مرارتك. ستكون تحت التخدير العام ولن تشعر بأي شيء.' },
                  { title: lang === 'en' ? 'Why do you need this?' : 'لماذا تحتاج إلى هذا؟', body: lang === 'en' ? 'You have gallstones that are causing pain and other symptoms. This surgery will remove the source of the problem.' : 'لديك حصى في المرارة تسبب ألماً وأعراضاً أخرى. ستزيل هذه الجراحة مصدر المشكلة.' },
                  { title: lang === 'en' ? 'What are the risks?' : 'ما هي المخاطر؟', body: lang === 'en' ? 'As with any surgery, there are risks including bleeding, infection, or injury to nearby structures. Your doctor has discussed your specific risks with you.' : 'كما هو الحال مع أي جراحة، هناك مخاطر تشمل النزيف والعدوى وإصابة الهياكل المجاورة. ناقش طبيبك معك مخاطرك المحددة.' },
                ].map(section => (
                  <div key={section.title} className="mb-4 border border-[#D8DCE3] rounded-lg p-4">
                    <h4 className="text-sm text-[#002B5C] mb-2">{section.title}</h4>
                    <p className="text-xs text-[#2F2F2F] leading-relaxed">{section.body}</p>
                  </div>
                ))}

                <div className="bg-[#002B5C] rounded-lg p-4 text-center">
                  <p className="text-white text-xs mb-3">{lang === 'en' ? 'I have read and understood the above information.' : 'لقد قرأت وفهمت المعلومات المذكورة أعلاه.'}</p>
                  <div className="bg-white/20 border border-white/30 rounded py-2 text-white text-sm font-medium">OTP Verification Button</div>
                </div>
              </div>
            )}

            {previewTab === 'pdf' && (
              <div className="p-6">
                <div className="border border-[#D8DCE3] rounded bg-white shadow-sm p-6 text-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8DCE3] pb-3">
                    <div>
                      <div className="font-semibold text-[#002B5C] text-base">WathiqCare</div>
                      <div className="text-[#6B7280]">Digital Informed Consent Document</div>
                    </div>
                    <div className="text-right text-[#6B7280]">
                      <div className="font-mono">DOC-2024-0847-01</div>
                      <div>28 May 2026</div>
                    </div>
                  </div>
                  <table className="w-full border-collapse border border-[#D8DCE3]">
                    <tbody>
                      {[
                        ['Patient Name', 'Mohammed Ibrahim Al-Rashidi'],
                        ['MRN', 'MRN-2024-0847'],
                        ['Date of Birth', '14 March 1978'],
                        ['Procedure', 'Laparoscopic Cholecystectomy (CPT 47562)'],
                        ['Physician', 'Dr. Khalid Al-Qahtani, FACS'],
                        ['Department', 'General Surgery'],
                        ['Anesthesia', 'General Anesthesia (GA)'],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-[#EEF1F5]">
                          <td className="px-3 py-1.5 font-semibold text-[#6B7280] bg-[#F4F6F9] w-36">{k}</td>
                          <td className="px-3 py-1.5 text-[#2F2F2F]">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border border-[#D8DCE3] p-3 rounded">
                    <p className="font-semibold text-[#002B5C] mb-1">Disclosure Summary</p>
                    <p className="text-[#2F2F2F] leading-relaxed">Laparoscopic cholecystectomy was explained to the patient including the procedure description, clinical indication, specific risks, expected outcomes, and alternatives discussed. The patient was informed of their right to refuse treatment...</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#D8DCE3]">
                    <div className="border border-[#D8DCE3] rounded p-3 text-center">
                      <div className="text-[#6B7280] mb-6">Physician Signature</div>
                      <div className="border-b border-[#2F2F2F] w-24 mx-auto" />
                    </div>
                    <div className="border border-[#D8DCE3] rounded p-3 text-center">
                      <div className="text-[#6B7280] mb-6">Patient Digital Signature</div>
                      <div className="border-b border-[#2F2F2F] w-24 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'evidence' && (
              <div className="p-6 space-y-3">
                <p className="text-xs text-[#6B7280]">{lang === 'en' ? 'Evidence package components for audit and legal review:' : 'مكونات الحزمة الدليلية للتدقيق والمراجعة القانونية:'}</p>
                {[
                  { label: 'Consent Document (PDF)', size: '124 KB', status: 'pending' },
                  { label: 'Physician Disclosure (Structured)', size: '8 KB', status: 'ready' },
                  { label: 'Anesthesia Module Data', size: '6 KB', status: 'ready' },
                  { label: 'Patient Education Content', size: '18 KB', status: 'ready' },
                  { label: 'OTP Verification Log', size: '2 KB', status: 'pending' },
                  { label: 'Patient Signature (Digital)', size: '—', status: 'pending' },
                  { label: 'Access & View Timestamp Log', size: '—', status: 'pending' },
                  { label: 'Evidence Package Seal (SHA-256)', size: '—', status: 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between border border-[#D8DCE3] rounded px-4 py-3 bg-white">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-[#6B7280]" />
                      <span className="text-sm text-[#2F2F2F]">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#6B7280]">{item.size}</span>
                      <span className={`text-xs border rounded px-1.5 py-0.5 ${item.status === 'ready' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Physician confirmation */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#002B5C]" />
          <div>
            <span className="text-sm font-medium text-[#2F2F2F]">
              {lang === 'en'
                ? 'I confirm that I have reviewed the patient view, PDF, and evidence package. The content is accurate, complete, and legally defensible.'
                : 'أؤكد أنني راجعت عرض المريض وملف PDF والحزمة الدليلية. المحتوى دقيق ومكتمل وقابل للدفاع عنه قانونياً.'}
            </span>
          </div>
        </label>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={handleComplete} disabled={!confirmed} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
          {lang === 'en' ? 'Continue to Validation' : 'متابعة للتحقق'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
