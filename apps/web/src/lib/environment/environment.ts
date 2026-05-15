/**
 * Environment Governance System
 *
 * Ensures strict separation and visibility of Production, Pilot, Development,
 * and Test environments to prevent user confusion and data contamination.
 */

export type AppEnvironment =
  | "production"
  | "pilot"
  | "uat"
  | "development"
  | "demo";

export type FeatureMode = "live" | "test" | "mock";

export interface EnvironmentConfig {
  env: AppEnvironment;
  isDevelopment: boolean;
  isProduction: boolean;
  isPilot: boolean;
  isUAT: boolean;
  isDemo: boolean;
  isTestEnvironment: boolean; // demo or development
  enableTestAccounts: boolean;
  enableDemoMode: boolean;
  enableLiveSms: boolean;
  enableLiveTrakCare: boolean;
  smsMode: FeatureMode;
  trakCareMode: FeatureMode;
  dataMode: FeatureMode;
  allowTestDataInReports: boolean;
  allowMixingTestAndRealData: boolean;
  bannerDisplay: "none" | "subtle" | "warning" | "danger";
  bannerText: string;
  bannerColor: string;
}

/**
 * Parse APP_ENV environment variable safely
 */
function parseAppEnv(raw?: string): AppEnvironment {
  const normalized = (raw || "production").toLowerCase().trim();
  const valid: AppEnvironment[] = ["production", "pilot", "uat", "development", "demo"];
  if (valid.includes(normalized as AppEnvironment)) {
    return normalized as AppEnvironment;
  }
  console.warn(
    `Invalid APP_ENV="${raw}", defaulting to production. Valid: ${valid.join(", ")}`
  );
  return "production";
}

/**
 * Parse boolean environment variable safely
 */
function parseBool(raw?: string, defaultValue: boolean = false): boolean {
  if (!raw) return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}

/**
 * Detect current environment from process.env
 * All environment variables should be explicitly set before importing this
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const appEnv = parseAppEnv(process.env.APP_ENV);
  const enableTestAccounts = parseBool(process.env.ENABLE_TEST_ACCOUNTS);
  const enableDemoMode = parseBool(process.env.ENABLE_DEMO_MODE);
  const enableLiveSms = parseBool(process.env.ENABLE_LIVE_SMS);
  const enableLiveTrakCare = parseBool(process.env.ENABLE_LIVE_TRAKCARE);

  // Derive flags from APP_ENV
  const isDevelopment = appEnv === "development";
  const isProduction = appEnv === "production";
  const isPilot = appEnv === "pilot";
  const isUAT = appEnv === "uat";
  const isDemo = appEnv === "demo";
  const isTestEnvironment = isDevelopment || isDemo;

  // Environment-specific overrides
  let smsMode: FeatureMode = "test";
  let trakCareMode: FeatureMode = "test";
  let dataMode: FeatureMode = "test";
  let allowTestDataInReports = true;
  let allowMixingTestAndRealData = false;
  let bannerDisplay: "none" | "subtle" | "warning" | "danger" = "none";
  let bannerText = "";
  let bannerColor = "";

  if (isProduction) {
    smsMode = enableLiveSms ? "live" : "test";
    trakCareMode = enableLiveTrakCare ? "live" : "mock";
    dataMode = "live";
    allowTestDataInReports = false;
    allowMixingTestAndRealData = false;
    bannerDisplay = "subtle";
    bannerText = "PRODUCTION";
    bannerColor = "#000000";
  } else if (isPilot || isUAT) {
    smsMode = enableLiveSms ? "live" : "test";
    trakCareMode = "mock"; // Pilot/UAT should not hit live TrakCare
    dataMode = "test";
    allowTestDataInReports = false;
    allowMixingTestAndRealData = false;
    bannerDisplay = "warning";
    bannerText = isPilot ? "PILOT ENVIRONMENT" : "UAT ENVIRONMENT";
    bannerColor = "#2563eb"; // Blue
  } else if (isDevelopment) {
    smsMode = "test";
    trakCareMode = "mock";
    dataMode = "test";
    allowTestDataInReports = true;
    allowMixingTestAndRealData = true;
    bannerDisplay = "warning";
    bannerText = "DEVELOPMENT";
    bannerColor = "#eab308"; // Yellow
  } else if (isDemo) {
    smsMode = "test";
    trakCareMode = "mock";
    dataMode = "test";
    allowTestDataInReports = true;
    allowMixingTestAndRealData = true;
    bannerDisplay = "danger";
    bannerText = "DEMO ONLY – NOT REAL PATIENT DATA";
    bannerColor = "#dc2626"; // Red
  }

  return {
    env: appEnv,
    isDevelopment,
    isProduction,
    isPilot,
    isUAT,
    isDemo,
    isTestEnvironment,
    enableTestAccounts: enableTestAccounts || isTestEnvironment,
    enableDemoMode: enableDemoMode || isDemo,
    enableLiveSms,
    enableLiveTrakCare,
    smsMode,
    trakCareMode,
    dataMode,
    allowTestDataInReports,
    allowMixingTestAndRealData,
    bannerDisplay,
    bannerText,
    bannerColor,
  };
}

/**
 * Singleton instance of environment config
 * Created at module load time, cached for performance
 */
let cachedConfig: EnvironmentConfig | null = null;

export function useEnvironmentConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = getEnvironmentConfig();
  }
  return cachedConfig;
}

/**
 * Reset config (mainly for testing)
 */
export function resetEnvironmentConfig(): void {
  cachedConfig = null;
}

/**
 * For server-side components, use this to verify environment at runtime
 */
// Removed invalid React Hook usage from non-component functions
// assertEnvironment and isProductionSafeEnvironment must not use useEnvironmentConfig (React Hook)
// You should refactor these to accept config as argument or move logic elsewhere
