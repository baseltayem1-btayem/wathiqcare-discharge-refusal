import React, { useState } from 'react';
import { Search, User, Calendar, MapPin, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { WorkflowButton } from './WorkflowButton';
import type { Patient, APILoadingState } from './WorkflowTypes';

// Mock patient data
const mockPatients: Patient[] = [
  {
    id: 'P001',
    mrn: 'MRN-2024-001234',
    name: 'Ahmed Al-Mansouri',
    nameAr: 'أحمد المنصوري',
    dateOfBirth: '1975-03-15',
    gender: 'M',
    caseId: 'CASE-2024-5678',
    contact: '+966 50 123 4567',
  },
  {
    id: 'P002',
    mrn: 'MRN-2024-001235',
    name: 'Fatima Al-Harbi',
    nameAr: 'فاطمة الحربي',
    dateOfBirth: '1982-07-22',
    gender: 'F',
    caseId: 'CASE-2024-5679',
    contact: '+966 55 987 6543',
  },
];

interface Props {
  lang: 'en' | 'ar';
  onPatientSelected: (patient: Patient) => void;
}

export function StepPatientSearch({ lang, onPatientSelected }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState<APILoadingState>('idle');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setSearchState('loading');
    setError(null);

    // Simulate API call
    setTimeout(() => {
      const results = mockPatients.filter(p =>
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.caseId && p.caseId.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      setSearchResults(results);
      setSearchState('success');
    }, 800);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    onPatientSelected(patient);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#002B5C]">
          {lang === 'en' ? 'Patient Search' : 'البحث عن مريض'}
        </h2>
        <p className="text-sm text-[#6B7280] mt-1">
          {lang === 'en'
            ? 'Search by MRN, patient name, or case reference'
            : 'ابحث برقم السجل الطبي أو اسم المريض أو مرجع الحالة'}
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" style={{ left: lang === 'ar' ? 'auto' : '1rem', right: lang === 'ar' ? '1rem' : 'auto' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={lang === 'en' ? 'Enter MRN, name, or case ID...' : 'أدخل رقم السجل أو الاسم أو رقم الحالة...'}
              className="w-full border border-[#D8DCE3] rounded-lg px-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#002B5C] focus:border-transparent"
              style={{ paddingLeft: lang === 'ar' ? '1rem' : '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
            />
          </div>
          <WorkflowButton
            state={searchState === 'loading' ? 'loading' : !searchQuery.trim() ? 'disabled' : 'default'}
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
          >
            {lang === 'en' ? 'Search' : 'بحث'}
          </WorkflowButton>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Loading State */}
      {searchState === 'loading' && (
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#002B5C] animate-spin mb-3" />
          <p className="text-sm text-[#6B7280]">{lang === 'en' ? 'Searching patients...' : 'جاري البحث عن المرضى...'}</p>
        </div>
      )}

      {/* Empty State */}
      {searchState === 'success' && searchResults.length === 0 && (
        <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <User className="w-12 h-12 text-[#D8DCE3] mb-3" />
          <h3 className="text-sm font-semibold text-[#2F2F2F] mb-1">
            {lang === 'en' ? 'No patients found' : 'لم يتم العثور على مرضى'}
          </h3>
          <p className="text-sm text-[#6B7280]">
            {lang === 'en'
              ? 'Try a different search term or check the MRN/case ID'
              : 'جرب مصطلح بحث مختلف أو تحقق من رقم السجل/الحالة'}
          </p>
        </div>
      )}

      {/* Results */}
      {searchState === 'success' && searchResults.length > 0 && (
        <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F8FAFC]">
            <h3 className="text-sm font-semibold text-[#2F2F2F]">
              {lang === 'en' ? `${searchResults.length} Patient(s) Found` : `تم العثور على ${searchResults.length} مريض`}
            </h3>
          </div>
          <div className="divide-y divide-[#EEF1F5]">
            {searchResults.map(patient => {
              const isSelected = selectedPatient?.id === patient.id;
              return (
                <div
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className={`px-5 py-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-l-[#002B5C]'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#002B5C]/10 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-[#002B5C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-semibold text-[#2F2F2F]">
                            {lang === 'en' ? patient.name : patient.nameAr || patient.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-[#6B7280] flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {patient.mrn}
                            </span>
                            {patient.caseId && (
                              <span className="text-xs text-[#6B7280]">
                                {lang === 'en' ? 'Case' : 'حالة'}: {patient.caseId}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="px-2.5 py-1 rounded bg-[#002B5C] text-white text-xs font-semibold">
                            {lang === 'en' ? 'Selected' : 'محدد'}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-[#6B7280]">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'en' ? 'DOB' : 'تاريخ الميلاد'}: {formatDate(patient.dateOfBirth)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#6B7280]">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {lang === 'en' ? 'Gender' : 'الجنس'}:{' '}
                            {patient.gender === 'M'
                              ? lang === 'en'
                                ? 'Male'
                                : 'ذكر'
                              : patient.gender === 'F'
                              ? lang === 'en'
                                ? 'Female'
                                : 'أنثى'
                              : lang === 'en'
                              ? 'Other'
                              : 'آخر'}
                          </span>
                        </div>
                        {patient.contact && (
                          <div className="flex items-center gap-1.5 text-[#6B7280]">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{patient.contact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
