"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { PhysicianContext } from "../../../types";

interface SettingsPageProps {
  physician: PhysicianContext;
}

function Toggle({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-700">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked={checked} disabled />
        <div className="w-8 h-4 bg-slate-200 peer-checked:bg-blue-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}

export function SettingsPage({ physician }: SettingsPageProps) {
  const { isRtl } = useI18n();

  return (
    <div>
      <h2 className="font-bold text-sm mb-3 text-slate-800">Settings</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-[10px] p-[14px] space-y-3">
          <h3 className="font-semibold text-xs text-slate-800">Profile Settings</h3>
          <div className="space-y-2 text-[11px]">
            <div>
              <label className="text-slate-500 block mb-0.5">Full Name</label>
              <input
                type="text"
                value={physician.name || ""}
                disabled
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">Specialty</label>
              <input
                type="text"
                value={physician.specialty || "—"}
                disabled
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">License No.</label>
              <input
                type="text"
                value={physician.licenseNumber || "—"}
                disabled
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[10px] p-[14px] space-y-3">
          <h3 className="font-semibold text-xs text-slate-800">Consent Preferences</h3>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Default Language</span>
              <select className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white" disabled>
                <option>Arabic</option>
                <option>English</option>
                <option>Both</option>
              </select>
            </div>
            <Toggle label="Auto-send to patient" checked />
            <Toggle label="Include video materials" checked />
            <Toggle label="Require comprehension quiz" checked={false} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[10px] p-[14px] space-y-3">
          <h3 className="font-semibold text-xs text-slate-800">Notifications</h3>
          <div className="space-y-2 text-[11px]">
            <Toggle label="Email notifications" checked />
            <Toggle label="SMS alerts" checked />
            <Toggle label="Consent expiry reminders" checked />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[10px] p-[14px] space-y-3">
          <h3 className="font-semibold text-xs text-slate-800">Security</h3>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Two-factor authentication</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700">
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Session timeout</span>
              <span className="font-medium text-slate-600">30 minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Last login</span>
              <span className="text-slate-500">{isRtl ? "غير متوفر" : "Not available"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
