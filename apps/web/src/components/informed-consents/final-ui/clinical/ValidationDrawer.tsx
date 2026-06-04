"use client";

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import type { ValidationItem, ConsentStep } from './ClinicalTypes';

interface Props {
  items: ValidationItem[];
  currentStep: ConsentStep;
  onNavigate: (step: ConsentStep) => void;
}

const criticalCount = (items: ValidationItem[]) => items.filter(i => !i.complete && i.severity === 'critical').length;
const warningCount = (items: ValidationItem[]) => items.filter(i => !i.complete && i.severity === 'warning').length;
const readyCount = (items: ValidationItem[]) => items.filter(i => i.complete).length;

export function ValidationDrawer({ items, currentStep, onNavigate }: Props) {
  const crit = criticalCount(items);
  const warn = warningCount(items);
  const ready = readyCount(items);
  const total = items.length;
  const pct = Math.round((ready / total) * 100);

  return (
    <aside className="w-72 bg-white border-l border-[#D8DCE3] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#2F2F2F] uppercase tracking-wide">Completeness Check</span>
          <span className="text-xs font-mono text-[#6B7280]">{pct}%</span>
        </div>
        <div className="w-full bg-[#EEF1F5] rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? '#1A7F4B' : pct > 60 ? '#D97706' : '#C0392B',
            }}
          />
        </div>
        <div className="flex gap-3 mt-2">
          {crit > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-700">
              <AlertCircle className="w-3 h-3" />{crit} Critical
            </span>
          )}
          {warn > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="w-3 h-3" />{warn} Warning
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />{ready} Ready
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {(['patient', 'procedure', 'anesthesia', 'disclosures', 'education', 'preview', 'validation', 'send'] as ConsentStep[]).map(step => {
          const stepItems = items.filter(i => i.section === step);
          if (!stepItems.length) return null;
          return (
            <div key={step}>
              <div className="px-4 py-2 bg-[#F4F6F9] border-b border-[#D8DCE3]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{step}</span>
              </div>
              {stepItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.section)}
                  className={`w-full flex items-start gap-2.5 px-4 py-2.5 border-b border-[#EEF1F5] text-left hover:bg-[#F4F6F9] transition-colors ${
                    currentStep === item.section ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.complete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : item.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-tight ${item.complete ? 'text-[#6B7280]' : 'text-[#2F2F2F]'}`}>{item.label}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5 leading-tight text-right" dir="rtl">{item.labelAr}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#6B7280] shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* PDF Readiness */}
      <div className="p-3 border-t border-[#D8DCE3] bg-[#F4F6F9]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-[#2F2F2F]">PDF Readiness</span>
          <span className={`text-xs font-mono ${pct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {pct === 100 ? 'READY' : 'PENDING'}
          </span>
        </div>
        <div className="flex gap-1.5">
          {['Patient View', 'PDF Doc', 'Evidence Pkg', 'Audit Trail'].map(label => (
            <div key={label} className={`flex-1 rounded text-center py-1 text-[10px] font-medium border ${
              pct >= 75 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-[#EEF1F5] border-[#D8DCE3] text-[#6B7280]'
            }`}>
              {label.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
