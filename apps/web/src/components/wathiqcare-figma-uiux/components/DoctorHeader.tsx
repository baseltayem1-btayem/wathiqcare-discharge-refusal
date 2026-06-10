"use client";

import { Bell, Globe, Search, ChevronDown } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  lang: "en" | "ar";
  onToggleLang: () => void;
}

export function DoctorHeader({ title, subtitle, lang, onToggleLang }: Props) {
  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b bg-white"
      style={{ borderColor: "#D8E8EF" }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "#102A43" }}>{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: "#64798B" }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ background: "#F7FBFC", border: "1px solid #D8E8EF", color: "#64798B" }}
        >
          <Search size={14} />
          <span>"Search patients..."</span>
        </div>

        {/* Lang toggle */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#EAF6FF", color: "#2F90C7", border: "1px solid #D8E8EF" }}
        >
          <Globe size={14} />
          "English"
        </button>

        {/* Alerts */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-gray-50"
          style={{ border: "1px solid #D8E8EF" }}
        >
          <Bell size={16} style={{ color: "#64798B" }} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "#2F90C7" }}
          />
        </button>

        {/* Profile */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-gray-50"
          style={{ border: "1px solid #D8E8EF" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #123B5C 0%, #2F90C7 100%)" }}
          >
            AK
          </div>
          <ChevronDown size={12} style={{ color: "#64798B" }} />
        </button>
      </div>
    </header>
  );
}




