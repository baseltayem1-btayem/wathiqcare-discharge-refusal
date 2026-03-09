export function isGovernanceModuleEnabled(): boolean {
  return process.env.WATHIQCARE_GOVERNANCE_MODULE_ENABLED === "true";
}

export function isGovernanceModuleEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_WATHIQCARE_GOVERNANCE_MODULE_ENABLED === "true";
}
