"use client";

import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Search } from "lucide-react";
import { type UserRole } from "./types";

type HeaderProps = {
  mrnQuery: string;
  onMrnQueryChange: (value: string) => void;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  roleOptions: UserRole[];
};

export default function Header({ mrnQuery, onMrnQueryChange, selectedRole, onRoleChange, roleOptions }: HeaderProps) {
  return (
    <header className="wc-panel space-y-3 border-[var(--primary-soft-border)] bg-gradient-to-r from-[#f9fcff] via-white to-[#f5f9fd]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/images/imc-logo.png" alt="IMC" width={120} height={40} className="h-9 w-auto object-contain" priority />
          <div>
            <h1 className="text-base font-bold text-[var(--primary-pressed)]">إصدار الموافقات المستنيرة | Informed Consent Issuance</h1>
            <p className="text-xs text-slate-600">TrakCare-style clinical and legal issuance console</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <span className="wc-module-pill border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary-pressed)]">
            Role: {selectedRole}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
        <label className="wc-form-field">
          <span className="wc-form-label">بحث برقم الملف الطبي | Patient MRN Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className="wc-form-input ps-7"
              value={mrnQuery}
              onChange={(event) => onMrnQueryChange(event.target.value)}
              placeholder="MRN-2026-000741"
            />
          </div>
        </label>

        <label className="wc-form-field">
          <span className="wc-form-label">User Role</span>
          <select className="wc-form-select" value={selectedRole} onChange={(event) => onRoleChange(event.target.value as UserRole)}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
