"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";
import {
  getEnabledAuthMethods,
  normalizeAuthConfig,
  type TenantAuthConfig,
  type TenantListItem,
} from "./types";
import CreateTenantModal from "./CreateTenantModal";
import CreateAdminModal from "./CreateAdminModal";
import LoginSettingsModal from "./LoginSettingsModal";

// ─── Load state ──────────────────────────────────────────────────────────────

type LoadState = "loading" | "error" | "success";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TenantListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-100" aria-label="Loading tenants">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-slate-200" />
            <div className="h-2.5 w-24 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-14 rounded-full bg-slate-200" />
          <div className="h-3.5 w-20 rounded bg-slate-100" />
          <div className="ml-auto flex gap-1.5">
            <div className="h-6 w-24 rounded bg-slate-200" />
            <div className="h-6 w-24 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Fully isolated tenant list section.
 *
 * Guarantees:
 * - Shows a loading skeleton while the initial fetch is in progress.
 * - Shows a scoped error card (not a toast-only failure) with a retry button
 *   if the fetch fails.
 * - Shows a friendly empty state with a Create button when no tenants exist.
 * - Modals (Create Tenant, Create Admin, Login Settings) are rendered outside
 *   the table DOM and manage their own state — a modal failure never disrupts
 *   the list.
 * - Desktop: full action table. Mobile: simplified read-only card list.
 */
export default function TenantListSection() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Modal triggers ──────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [adminTenantId, setAdminTenantId] = useState<string | null>(null);
  const [loginTenantId, setLoginTenantId] = useState<string | null>(null);

  const adminTenant = tenants.find((t) => t.id === adminTenantId) ?? null;
  const loginTenant = tenants.find((t) => t.id === loginTenantId) ?? null;

  // ── Data fetching ───────────────────────────────────────────────────────────

  const loadTenants = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const result = await apiFetchJson<TenantListItem[]>(
        "/api/tenants?limit=100",
        { cache: "no-store" },
      );
      setTenants(Array.isArray(result) ? result : []);
      setLoadState("success");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load tenants",
      );
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTenants();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTenants]);

  // ── Mutation handlers ───────────────────────────────────────────────────────

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await apiFetchJson(`/api/platform/tenants/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(`Tenant ${currentActive ? "deactivated" : "activated"}`);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !currentActive } : t)),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update tenant status",
      );
    }
  }

  // ── Modal callbacks ─────────────────────────────────────────────────────────

  function handleTenantCreated(tenant: TenantListItem) {
    // Prepend so the new tenant is immediately visible at the top.
    setTenants((prev) => [tenant, ...prev]);
    setShowCreate(false);
  }

  function handleLoginSettingsSaved(tenantId: string, config: TenantAuthConfig) {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, authConfig: config } : t)),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getSeats(tenant: TenantListItem) {
    const used = tenant._count?.memberships ?? 0;
    const limit = tenant.subscriptions?.[0]?.seatLimit ?? 0;
    return { used, limit, available: limit > 0 ? limit - used : 0 };
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Section card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
        {/* Section header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Tenant Management
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Provision tenants, assign admins, and manage subscriptions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadTenants()}
              disabled={loadState === "loading"}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadState === "loading" ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            {/* Create button — desktop only; mobile users see inline notice */}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="hidden items-center gap-2 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] lg:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Create Tenant
            </button>
          </div>
        </div>

        {/* ── Loading state ─────────────────────────────────────────────────── */}
        {loadState === "loading" && <TenantListSkeleton />}

        {/* ── Error state ───────────────────────────────────────────────────── */}
        {loadState === "error" && (
          <div className="px-5 py-8">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-900">
                  Failed to load tenants
                </h3>
                {loadError && (
                  <p className="mt-0.5 text-xs text-rose-700">{loadError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void loadTenants()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {loadState === "success" && tenants.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Building2 className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                No tenants yet
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Get started by provisioning the first tenant
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
            >
              <Plus className="h-4 w-4" />
              Create First Tenant
            </button>
          </div>
        )}

        {/* ── Success state ─────────────────────────────────────────────────── */}
        {loadState === "success" && tenants.length > 0 && (
          <>
            {/* Count caption */}
            <div className="border-b border-slate-100 px-5 py-2">
              <span className="text-xs font-medium text-slate-500">
                {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* ── Desktop table ─────────────────────────────────────────────── */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Tenant</th>
                    <th className="px-4 py-3 text-left">Domain</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Subscription</th>
                    <th className="px-4 py-3 text-left">Login Methods</th>
                    <th className="px-4 py-3 text-left">Seats</th>
                    <th className="px-4 py-3 text-left">Cases</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((tenant) => {
                    const seats = getSeats(tenant);
                    const sub = tenant.subscriptions?.[0];
                    const authConfig = normalizeAuthConfig(tenant.authConfig);
                    const enabledMethods = getEnabledAuthMethods(authConfig);

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {tenant.name}
                          </p>
                          <p className="text-xs text-slate-400">{tenant.code}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {tenant.domain ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              tenant.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {tenant.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {sub ? (
                            <div>
                              <p className="text-slate-700">
                                {sub.plan?.name ?? sub.plan?.code ?? "—"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {sub.status}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {enabledMethods.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {enabledMethods.map((method) => (
                                <span
                                  key={method}
                                  className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                                >
                                  <Lock className="h-3 w-3" />
                                  {method}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700">
                            {seats.used}
                          </span>
                          <span className="text-slate-400">/{seats.limit}</span>
                          <p className="text-xs text-slate-400">
                            {seats.available} avail.
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {tenant._count?.cases ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setLoginTenantId(tenant.id)}
                              title="Configure login methods"
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[#e3eef9]"
                            >
                              <Lock className="h-3 w-3" />
                              Login Settings
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminTenantId(tenant.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Shield className="h-3 w-3" />
                              Create Admin
                            </button>
                            <a
                              href={`/platform/support?tenant=${tenant.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Users className="h-3 w-3" />
                              View Users
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                void handleToggleActive(
                                  tenant.id,
                                  tenant.isActive,
                                )
                              }
                              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                                tenant.isActive
                                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : "border-slate-300 bg-white text-[var(--primary)] hover:bg-slate-50"
                              }`}
                            >
                              {tenant.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card list — simplified read-only ────────────────────── */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {tenants.map((tenant) => {
                const sub = tenant.subscriptions?.[0];
                const authConfig = normalizeAuthConfig(tenant.authConfig);
                const enabledMethods = getEnabledAuthMethods(authConfig);

                return (
                  <div key={tenant.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-slate-400">{tenant.code}</p>
                      </div>
                      <span
                        className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          tenant.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {tenant.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      {tenant.domain && <span>{tenant.domain}</span>}
                      {sub && (
                        <span>
                          {sub.plan?.name ?? sub.plan?.code ?? "No plan"} ·{" "}
                          {sub.status}
                        </span>
                      )}
                      <span>
                        {tenant._count?.memberships ?? 0} members ·{" "}
                        {tenant._count?.cases ?? 0} cases
                      </span>
                    </div>

                    {enabledMethods.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {enabledMethods.map((method) => (
                          <span
                            key={method}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs text-[var(--primary)]"
                          >
                            <Lock className="h-3 w-3" />
                            {method}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile footer notice */}
              <div className="bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Full tenant management actions are available on a desktop
                  browser (1024 px+).
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals — outside the section card, isolated from list state ──────── */}

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={handleTenantCreated}
        />
      )}

      {adminTenantId !== null && adminTenant !== null && (
        <CreateAdminModal
          tenantId={adminTenantId}
          tenantName={adminTenant.name}
          onClose={() => setAdminTenantId(null)}
        />
      )}

      {loginTenantId !== null && loginTenant !== null && (
        <LoginSettingsModal
          tenant={loginTenant}
          onClose={() => setLoginTenantId(null)}
          onSaved={handleLoginSettingsSaved}
        />
      )}
    </>
  );
}
