"use client";

import { Languages, Type, Contrast } from "lucide-react";
import type { PatientJourneyState } from "../../types/workspace";

interface AccessibilityControlsProps {
  accessibility: PatientJourneyState["accessibility"];
  onChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function AccessibilityControls({ accessibility, onChange }: AccessibilityControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-[var(--wc-blue)]" />
        <div className="flex rounded-md overflow-hidden border border-[var(--wc-border)]">
          <button
            type="button"
            onClick={() => onChange({ language: "en" })}
            className={`px-3 py-1.5 text-xs font-semibold ${
              accessibility.language === "en" ? "bg-[var(--wc-navy)] text-white" : "bg-white text-[var(--wc-text)]"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChange({ language: "ar" })}
            className={`px-3 py-1.5 text-xs font-semibold ${
              accessibility.language === "ar" ? "bg-[var(--wc-navy)] text-white" : "bg-white text-[var(--wc-text)]"
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-[var(--wc-blue)]" />
        <select
          value={accessibility.textSize}
          onChange={(e) => onChange({ textSize: e.target.value as PatientJourneyState["accessibility"]["textSize"] })}
          className="text-xs font-semibold border border-[var(--wc-border)] rounded-md px-2 py-1.5 bg-white"
        >
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra large</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => onChange({ highContrast: !accessibility.highContrast })}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
          accessibility.highContrast
            ? "bg-black text-white border-black"
            : "bg-white text-[var(--wc-text)] border-[var(--wc-border)]"
        }`}
      >
        <Contrast className="w-3.5 h-3.5" /> High contrast
      </button>
    </div>
  );
}
