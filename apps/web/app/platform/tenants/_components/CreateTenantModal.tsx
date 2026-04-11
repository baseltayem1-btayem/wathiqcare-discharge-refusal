"use client";

import { useState } from "react";
import { AlertCircle, Building2, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";
import type { TenantListItem } from "./types";

const EMPTY_FORM = {
  name: "",
  code: "",
  billingEmail: "",
  ownerEmail: "",
  ownerFullName: "",
  ownerRole: "tenant_admin",
  domain: "",
  seatLimit: "10",
};

type Props = {
  onClose: () => void;
  /** Called with the newly-created tenant so the list can prepend it immediately. */
  onCreated: (tenant: TenantListItem) => void;
};

/**
 * Isolated modal for creating a new tenant.
 * Manages its own form / loading / error state — a failure here never
 * touches the tenant list section.
 */
export default function CreateTenantModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.name.trim() || !form.ownerEmail.trim()) {
      setError("Tenant name and admin email are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tenant = await apiFetchJson<TenantListItem>("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          domain: form.domain.trim() || null,
          billingEmail: form.billingEmail.trim() || null,
          initialOwner: {
            email: form.ownerEmail.trim(),
            fullName: form.ownerFullName.trim() || form.ownerEmail.trim(),
            role: form.ownerRole,
          },
          subscription: {
            planCode: "STARTER",
            billingInterval: "MONTHLY",
            status: "TRIALING",
            seatLimit: Math.max(1, Number(form.seatLimit) || 10),
          },
        }),
      });
      toast.success("Tenant created successfully");
      onCreated(tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tenant-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--primary)]" />
            <h3
              id="create-tenant-title"
              className="text-base font-semibold text-slate-900"
            >
              Create New Tenant
            </h3>
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
        <div className="p-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tenant Name *
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. King Faisal Hospital"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tenant Code
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Auto-generated if empty"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Domain
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. kfh.com"
                value={form.domain}
                onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Billing Email
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="billing@hospital.com"
                value={form.billingEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, billingEmail: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Admin Email *
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="admin@hospital.com"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerEmail: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Admin Full Name
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Dr. Mohammed Al-Rashid"
                value={form.ownerFullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerFullName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Admin Role
              </label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                title="Select admin role"
                value={form.ownerRole}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerRole: e.target.value }))
                }
              >
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_owner">tenant_owner</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Seat Limit
              </label>
              <input
                type="number"
                min="1"
                max="500"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. 10"
                value={form.seatLimit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seatLimit: e.target.value }))
                }
              />
            </div>
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
            {saving ? "Creating…" : "Create Tenant & Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
