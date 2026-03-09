export default function GovernanceDisabledNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Governance module is disabled. Set `WATHIQCARE_GOVERNANCE_MODULE_ENABLED=true` and `NEXT_PUBLIC_WATHIQCARE_GOVERNANCE_MODULE_ENABLED=true` to enable these pages.
    </div>
  );
}
