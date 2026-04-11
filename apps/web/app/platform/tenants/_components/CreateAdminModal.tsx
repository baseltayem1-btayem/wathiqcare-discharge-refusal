"use client";

import { useState } from "react";
import { AlertCircle, Shield, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  role: "tenant_admin",
  department: "",
  sendInvite: true,
  isActive: true,
};

type Props = {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
};

/**
 * Isolated modal for creating a tenant admin user.
 * A failure here never affects the tenant list or other modals.
 */
export default function CreateAdminModal({ tenantId, tenantName, onClose }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.email.trim() || !form.fullName.trim()) {
      setError("Full name and email are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetchJson(`/api/platform/tenants/${tenantId}/admins/create`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Tenant admin created and invite sent");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-admin-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--primary)]" />
              <h3
                id="create-admin-title"
                className="text-base font-semibold text-slate-900"
              >
                Create Tenant Admin
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">For: {tenantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Full Name *
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Dr. Sarah Al-Dosari"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Email *
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="admin@hospital.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Role
              </label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                title="Select tenant admin role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_owner">tenant_owner</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Department
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Optional"
                value={form.department}
                onChange={(e) =>
                  setForm((p) => ({ ...p, department: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={form.sendInvite}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sendInvite: e.target.checked }))
                }
              />
              Send invitation email
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
