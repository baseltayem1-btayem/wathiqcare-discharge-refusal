"use client";

import React, { useState } from 'react';
import {
  LayoutDashboard, Search, FileText, Activity,
  ChevronDown, Bell, LogOut, Settings, Shield, User,
} from 'lucide-react';
import { PhysicianDashboard } from './PhysicianDashboard';
import { PatientSearch } from './PatientSearch';
import { ConsentBuilder } from './ConsentBuilder';
import { StatusTracking } from './StatusTracking';
import type { Patient, Encounter } from './clinical/ClinicalTypes';

type Screen = 'dashboard' | 'search' | 'consent-builder' | 'status';

const navItems = [
  { id: 'dashboard' as Screen, label: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'search' as Screen, label: 'Patient Search', labelAr: 'البحث عن مريض', icon: Search },
  { id: 'consent-builder' as Screen, label: 'Consent Builder', labelAr: 'بناء الموافقة', icon: FileText },
  { id: 'status' as Screen, label: 'Status Tracking', labelAr: 'متابعة الحالة', icon: Activity },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [alertCount] = useState(3);

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
            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: '#C9A13B' }}>
              <Shield className="w-4 h-4 text-white" />
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
              <div className="text-white text-xs font-semibold truncate">Dr. Khalid Al-Qahtani</div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>General Surgery · FACS</div>
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
            {[
              { label: lang === 'en' ? 'Settings' : 'الإعدادات', icon: Settings, action: 'settings' },
              { label: lang === 'en' ? 'Sign Out' : 'تسجيل الخروج', icon: LogOut, action: 'logout' },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.action === 'logout') {
                    void handleSignOut();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-left text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
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
            <button className="relative p-2 rounded hover:bg-[#F4F6F9] transition-colors">
              <Bell className="w-4 h-4" style={{ color: '#6B7280' }} />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#C0392B' }} />
              )}
            </button>

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
            <PhysicianDashboard onNewConsent={handleNewConsent} onViewConsent={handleViewConsent} />
          )}
          {screen === 'search' && (
            <PatientSearch onSelectPatient={handlePatientSelected} />
          )}
          {screen === 'consent-builder' && (
            <ConsentBuilder lang={lang} />
          )}
          {screen === 'status' && (
            <StatusTracking lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}
