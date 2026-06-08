import React, { useState } from 'react';
import { Search, Shield, ChevronRight, AlertTriangle, User, Phone, Mail, Droplets, Calendar } from 'lucide-react';
import { ClinicalBadge } from './clinical/ClinicalBadge';
import type { Patient, Encounter } from './clinical/ClinicalTypes';

const mockPatients: Patient[] = [
  {
    mrn: 'MRN-2024-0847',
    name: 'Mohammed Ibrahim Al-Rashidi',
    nameAr: 'محمد إبراهيم الراشدي',
    dob: '1978-03-14',
    age: 46,
    gender: 'Male',
    nationality: 'Saudi',
    phone: '+966 50 234 5678',
    email: 'm.alrashidi@email.com',
    bloodType: 'A+',
    allergies: ['Penicillin', 'NSAIDs'],
  },
];

const mockEncounters: Encounter[] = [
  { id: 'ENC-2024-1847', date: '2026-05-28', type: 'Pre-Operative', department: 'General Surgery', physician: 'Dr. Khalid Al-Qahtani', status: 'active' },
  { id: 'ENC-2024-1721', date: '2026-05-15', type: 'Outpatient', department: 'General Surgery', physician: 'Dr. Khalid Al-Qahtani', status: 'closed' },
  { id: 'ENC-2024-1603', date: '2026-04-22', type: 'Emergency', department: 'Emergency Medicine', physician: 'Dr. Sara Al-Otibi', status: 'closed' },
];

interface Props {
  onSelectPatient: (patient: Patient, encounter: Encounter) => void;
}

export function PatientSearch({ onSelectPatient }: Props) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const handleSearch = () => {
    if (query.trim()) setSearched(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-white border-b border-[#D8DCE3] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[#2F2F2F]">{lang === 'en' ? 'Patient Search' : 'البحث عن المريض'}</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{lang === 'en' ? 'Search by MRN, name, or national ID' : 'ابحث برقم الملف الطبي أو الاسم أو رقم الهوية'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-[#D8DCE3] rounded overflow-hidden text-sm">
            <button onClick={() => setLang('en')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>EN</button>
            <button onClick={() => setLang('ar')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'ar' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>ع</button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* PHI warning */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Shield className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="text-sm font-semibold text-amber-800">
              {lang === 'en' ? 'Protected Health Information (PHI) — Authorized Access Only' : 'معلومات صحية محمية — للمخولين فقط'}
            </span>
            <p className="text-xs text-amber-700 mt-0.5">
              {lang === 'en'
                ? 'This session is being logged. Accessing patient records requires clinical justification per HIPAA and PDPL compliance policies.'
                : 'هذه الجلسة مسجلة. الوصول إلى سجلات المرضى يتطلب مسوّغاً سريرياً وفق سياسات الامتثال لنظام PDPL.'}
            </p>
          </div>
        </div>

        {/* Search box */}
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-6">
          <div className={`flex gap-3 ${lang === 'ar' ? 'flex-row-reverse' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex-1 relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={lang === 'en' ? 'Enter MRN, patient name, or national ID...' : 'أدخل رقم الملف الطبي أو الاسم أو رقم الهوية...'}
                className={`w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] focus:border-transparent placeholder:text-[#6B7280] ${lang === 'ar' ? 'pr-10 text-right' : 'pl-10'}`}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#002B5C] hover:bg-blue-900 text-white px-5 py-2.5 rounded text-sm font-medium transition-colors"
            >
              {lang === 'en' ? 'Search' : 'بحث'}
            </button>
          </div>

          {/* Search tips */}
          <div className={`flex gap-4 mt-3 flex-wrap ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
            {['MRN-XXXX-XXXX', 'Full Name', 'National ID / Iqama', 'Date of Birth'].map(tip => (
              <span key={tip} className="text-xs text-[#6B7280] bg-[#F4F6F9] border border-[#D8DCE3] px-2 py-0.5 rounded cursor-pointer hover:bg-[#EEF1F5]"
                onClick={() => setQuery(tip === 'MRN-XXXX-XXXX' ? 'MRN-2024-0847' : query)}>
                {tip}
              </span>
            ))}
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Search Results' : 'نتائج البحث'}</span>
              <span className="text-xs text-[#6B7280]">1 record found</span>
            </div>
            {mockPatients.map(p => (
              <div key={p.mrn} className={`border-b border-[#EEF1F5] ${selectedPatient?.mrn === p.mrn ? 'bg-blue-50 border-[#4B9CD3]' : 'hover:bg-[#F4F6F9]'} cursor-pointer transition-colors`}
                onClick={() => setSelectedPatient(p)}>
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#002B5C] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-[#2F2F2F]">{lang === 'en' ? p.name : p.nameAr}</span>
                      <span className="text-xs font-mono text-[#6B7280] bg-[#F4F6F9] px-2 py-0.5 rounded border border-[#D8DCE3]">{p.mrn}</span>
                      {p.allergies.length > 0 && (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span className="text-xs text-red-700 font-medium">Allergy: {p.allergies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                        <div>
                          <div className="text-xs text-[#6B7280]">DOB / Age</div>
                          <div className="text-xs font-medium text-[#2F2F2F]">{p.dob} · {p.age}y</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#6B7280]" />
                        <div>
                          <div className="text-xs text-[#6B7280]">Gender / Nationality</div>
                          <div className="text-xs font-medium text-[#2F2F2F]">{p.gender} · {p.nationality}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#6B7280]" />
                        <div>
                          <div className="text-xs text-[#6B7280]">Phone</div>
                          <div className="text-xs font-medium text-[#2F2F2F] font-mono">{p.phone}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-red-500" />
                        <div>
                          <div className="text-xs text-[#6B7280]">Blood Type</div>
                          <div className="text-xs font-semibold text-red-700">{p.bloodType}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B7280] mt-1 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Encounter selection */}
        {selectedPatient && (
          <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
              <h3 className="text-[#2F2F2F]">{lang === 'en' ? 'Select Encounter' : 'اختر الزيارة'}</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">{lang === 'en' ? 'Choose the relevant clinical encounter for consent issuance' : 'اختر الزيارة السريرية المتعلقة بإصدار الموافقة'}</p>
            </div>
            <div className="divide-y divide-[#EEF1F5]">
              {mockEncounters.map(enc => (
                <div key={enc.id}
                  onClick={() => setSelectedEncounter(enc)}
                  className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors ${selectedEncounter?.id === enc.id ? 'bg-blue-50' : 'hover:bg-[#F4F6F9]'} ${enc.status !== 'active' ? 'opacity-60' : ''}`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${enc.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2F2F2F]">{enc.type}</span>
                      <span className="text-xs font-mono text-[#6B7280]">{enc.id}</span>
                      {enc.status === 'active' && <ClinicalBadge variant="ready" label="Active" />}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-[#6B7280]">{enc.date}</span>
                      <span className="text-xs text-[#6B7280]">{enc.department}</span>
                      <span className="text-xs text-[#6B7280]">{enc.physician}</span>
                    </div>
                  </div>
                  {enc.status !== 'active' && (
                    <span className="text-xs text-[#6B7280]">Closed</span>
                  )}
                </div>
              ))}
            </div>

            {selectedEncounter && (
              <div className="px-5 py-4 bg-[#F4F6F9] border-t border-[#D8DCE3] flex justify-end">
                <button
                  onClick={() => onSelectPatient(selectedPatient, selectedEncounter)}
                  className="bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {lang === 'en' ? 'Continue to Procedure Selection' : 'متابعة لاختيار الإجراء'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
