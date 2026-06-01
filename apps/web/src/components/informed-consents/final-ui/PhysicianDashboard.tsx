"use client";

import React, { useState } from 'react';
import {
  FileText, Clock, Send, CheckCircle2, AlertCircle, PlusCircle,
  ChevronRight, Activity, Users, Calendar, TrendingUp,
} from 'lucide-react';
import { ClinicalBadge } from './clinical/ClinicalBadge';

const statCards = [
  { label: 'Pending Consents', labelAr: 'موافقات معلقة', value: 7, icon: Clock, color: '#D97706', bg: '#FEF3C7', urgent: true },
  { label: 'Draft Consents', labelAr: 'مسودات', value: 3, icon: FileText, color: '#6B7280', bg: '#F3F4F6', urgent: false },
  { label: 'Sent / Awaiting', labelAr: 'مرسل / في انتظار', value: 12, icon: Send, color: '#4B9CD3', bg: '#EBF3FB', urgent: false },
  { label: 'Completed Today', labelAr: 'مكتملة اليوم', value: 5, icon: CheckCircle2, color: '#1A7F4B', bg: '#ECFDF5', urgent: false },
];

const pendingConsents = [
  { mrn: 'MRN-2024-0847', name: 'Mohammed Al-Rashidi', nameAr: 'محمد الراشدي', procedure: 'Laparoscopic Cholecystectomy', procedureAr: 'استئصال المرارة بالمنظار', department: 'General Surgery', dueIn: '2h', status: 'draft', severity: 'critical' as const, missing: ['Anesthesia', 'Risks'] },
  { mrn: 'MRN-2024-0831', name: 'Fatima Al-Zahrawi', nameAr: 'فاطمة الزهراوي', procedure: 'Knee Arthroscopy', procedureAr: 'تنظير الركبة', department: 'Orthopedics', dueIn: '4h', status: 'sent', severity: 'warning' as const, missing: ['Arabic Text'] },
  { mrn: 'MRN-2024-0819', name: 'Abdullah Bin Saud', nameAr: 'عبدالله بن سعود', procedure: 'Cardiac Catheterization', procedureAr: 'قسطرة قلبية', department: 'Cardiology', dueIn: '6h', status: 'sent', severity: 'ready' as const, missing: [] },
  { mrn: 'MRN-2024-0807', name: 'Nora Al-Hamdan', nameAr: 'نورة الحمدان', procedure: 'Hysterectomy', procedureAr: 'استئصال الرحم', department: 'Obs & Gynae', dueIn: 'Tomorrow', status: 'draft', severity: 'critical' as const, missing: ['Anesthesia', 'Disclosure', 'Risks'] },
  { mrn: 'MRN-2024-0793', name: 'Khalid Al-Mutairi', nameAr: 'خالد المطيري', procedure: 'Colonoscopy', procedureAr: 'تنظير القولون', department: 'Gastroenterology', dueIn: 'Tomorrow', status: 'draft', severity: 'warning' as const, missing: ['Patient Education'] },
];

const recentActivity = [
  { time: '09:42', event: 'Consent signed by patient', patient: 'Sara Al-Dosari', type: 'signed' as const },
  { time: '09:15', event: 'PDF generated & sealed', patient: 'Omar Al-Ghamdi', type: 'ready' as const },
  { time: '08:50', event: 'OTP verified successfully', patient: 'Layla Al-Otibi', type: 'info' as const },
  { time: '08:22', event: 'Consent link expired – resend required', patient: 'Turki Al-Shehri', type: 'warning' as const },
  { time: '07:55', event: 'Incomplete disclosure detected', patient: 'Hessa Al-Qahtani', type: 'critical' as const },
];

interface Props {
  onNewConsent: () => void;
  onViewConsent: (mrn: string) => void;
}

export function PhysicianDashboard({ onNewConsent, onViewConsent }: Props) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
      {/* Page header */}
      <div className="bg-white border-b border-[#D8DCE3] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[#2F2F2F]">Physician Consent Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Thursday, 28 May 2026 · Surgical Day List Active</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-[#D8DCE3] rounded overflow-hidden text-sm">
            <button onClick={() => setLang('en')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'en' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>EN</button>
            <button onClick={() => setLang('ar')} className={`px-3 py-1.5 font-medium transition-colors ${lang === 'ar' ? 'bg-[#002B5C] text-white' : 'text-[#6B7280] hover:bg-[#F4F6F9]'}`}>ع</button>
          </div>
          <button
            onClick={onNewConsent}
            className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Consent
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Alert banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-red-800">3 consents have incomplete mandatory disclosures — surgery cannot proceed until resolved.</span>
          </div>
          <button className="text-sm text-red-700 font-medium underline hover:no-underline">View All</button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className={`bg-white border rounded-lg p-4 ${card.urgent ? 'border-amber-300' : 'border-[#D8DCE3]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded" style={{ background: card.bg }}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                {card.urgent && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="text-2xl font-semibold text-[#2F2F2F]" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{card.value}</div>
              <div className="text-sm text-[#6B7280] mt-0.5">{lang === 'en' ? card.label : card.labelAr}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Pending consents table */}
          <div className="col-span-2 bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#D8DCE3] flex items-center justify-between">
              <h3 className="text-[#2F2F2F]">Pending Actions</h3>
              <span className="text-xs text-[#6B7280]">{pendingConsents.length} records</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-[#D8DCE3]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Patient / MRN</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Procedure</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Dept</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingConsents.map((c, i) => (
                  <tr key={c.mrn} className={`border-b border-[#EEF1F5] hover:bg-[#F4F6F9] cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`} onClick={() => onViewConsent(c.mrn)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#2F2F2F]">{lang === 'en' ? c.name : c.nameAr}</div>
                      <div className="text-xs text-[#6B7280] font-mono">{c.mrn}</div>
                      {c.missing.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.missing.map(m => (
                            <span key={m} className="text-[10px] bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">{m}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#2F2F2F]">{lang === 'en' ? c.procedure : c.procedureAr}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{c.department}</td>
                    <td className="px-4 py-3">
                      <ClinicalBadge variant={c.status === 'draft' ? 'draft' : 'sent'} label={c.status === 'draft' ? 'Draft' : 'Sent'} dot />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono ${c.dueIn.includes('h') ? 'text-red-700 font-semibold' : 'text-[#6B7280]'}`}>{c.dueIn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Activity feed */}
          <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#D8DCE3]">
              <h3 className="text-[#2F2F2F]">Live Activity</h3>
            </div>
            <div className="divide-y divide-[#EEF1F5]">
              {recentActivity.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <span className="text-xs font-mono text-[#6B7280] mt-0.5 w-10 shrink-0">{a.time}</span>
                  <div>
                    <ClinicalBadge variant={a.type} label={a.type.charAt(0).toUpperCase() + a.type.slice(1)} size="sm" />
                    <p className="text-xs text-[#2F2F2F] mt-1 leading-snug">{a.event}</p>
                    <p className="text-xs text-[#6B7280]">{a.patient}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick metrics */}
            <div className="border-t border-[#D8DCE3] px-5 py-4 bg-[#F4F6F9]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-3">Today's Metrics</p>
              <div className="space-y-2">
                {[
                  { label: 'Consent Completion Rate', value: '87%', icon: TrendingUp },
                  { label: 'Avg. Signing Time', value: '4.2 min', icon: Clock },
                  { label: 'Patients Educated', value: '11', icon: Users },
                  { label: 'Evidence Packages', value: '5', icon: Activity },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <m.icon className="w-3.5 h-3.5" />
                      {m.label}
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#002B5C]">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Completed consents */}
        <div className="bg-white border border-[#D8DCE3] rounded-lg">
          <div className="px-5 py-3 border-b border-[#D8DCE3] flex items-center justify-between">
            <h3 className="text-[#2F2F2F]">Completed Today</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">28 May 2026</span>
            </div>
          </div>
          <div className="flex divide-x divide-[#D8DCE3]">
            {[
              { name: 'Sara Al-Dosari', nameAr: 'سارة الدوسري', mrn: 'MRN-2024-0771', procedure: 'Appendectomy', time: '07:30', pdf: true, evidence: true },
              { name: 'Omar Al-Ghamdi', nameAr: 'عمر الغامدي', mrn: 'MRN-2024-0769', procedure: 'Hernia Repair', time: '08:15', pdf: true, evidence: true },
              { name: 'Layla Al-Otibi', nameAr: 'ليلى العتيبي', mrn: 'MRN-2024-0763', procedure: 'Endoscopy', time: '09:00', pdf: true, evidence: false },
              { name: 'Ahmad Al-Zahrani', nameAr: 'أحمد الزهراني', mrn: 'MRN-2024-0758', procedure: 'Cataract Surgery', time: '09:45', pdf: true, evidence: true },
              { name: 'Reem Al-Harbi', nameAr: 'ريم الحربي', mrn: 'MRN-2024-0751', procedure: 'ERCP', time: '10:20', pdf: false, evidence: false },
            ].map(c => (
              <div key={c.mrn} className="flex-1 px-4 py-4">
                <div className="font-medium text-sm text-[#2F2F2F]">{lang === 'en' ? c.name : c.nameAr}</div>
                <div className="text-xs text-[#6B7280] font-mono mb-1.5">{c.mrn}</div>
                <div className="text-xs text-[#6B7280] mb-2">{c.procedure}</div>
                <div className="flex items-center gap-1 flex-wrap">
                  <ClinicalBadge variant="signed" label="Signed" dot />
                  {c.pdf && <ClinicalBadge variant="ready" label="PDF" />}
                  {c.evidence && <ClinicalBadge variant="info" label="Evidence" />}
                </div>
                <div className="text-xs text-[#6B7280] mt-2 font-mono">{c.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
