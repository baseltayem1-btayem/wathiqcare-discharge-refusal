export function isProductionSaasUpgradeEnabled(): boolean {
  return process.env.PRODUCTION_SAAS_UPGRADE_ENABLED !== "false";
}
