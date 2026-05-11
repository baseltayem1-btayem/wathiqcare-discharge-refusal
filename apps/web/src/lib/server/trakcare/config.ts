function asBool(value: string | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function asInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export type TrakCareConfig = {
  sourceSystem: string;
  liveEnabled: boolean;
  baseUrl: string;
  authUrl: string;
  patientPath: string;
  encounterPath: string;
  allergyPath: string;
  conditionPath: string;
  medicationPath: string;
  observationPath: string;
  practitionerPath: string;
  timeoutMs: number;
  retryCount: number;
  rateLimitPerMinute: number;
  authMode: "oauth2_client_credentials" | "basic" | "static_bearer";
  clientId: string;
  clientSecret: string;
  scope: string;
  username: string;
  password: string;
  staticBearerToken: string;
};

export function getTrakCareConfig(): TrakCareConfig {
  const authModeRaw = (process.env.TRAKCARE_AUTH_MODE || "oauth2_client_credentials").trim().toLowerCase();
  const authMode =
    authModeRaw === "basic" || authModeRaw === "static_bearer"
      ? authModeRaw
      : "oauth2_client_credentials";

  const ffLive = asBool(process.env.FF_ENABLE_TRAKCARE_LIVE);
  const envLive = asBool(process.env.TRAKCARE_LIVE_ENABLED);

  return {
    sourceSystem: "InterSystems TrakCare",
    liveEnabled: ffLive && envLive,
    baseUrl: (process.env.TRAKCARE_API_BASE_URL || process.env.TRAKCARE_BASE_URL || "").trim(),
    authUrl: (process.env.TRAKCARE_AUTH_URL || "").trim(),
    patientPath: (process.env.TRAKCARE_PATIENT_PATH || "/patients").trim(),
    encounterPath: (process.env.TRAKCARE_ENCOUNTER_PATH || "/encounters").trim(),
    allergyPath: (process.env.TRAKCARE_ALLERGY_PATH || "/allergies").trim(),
    conditionPath: (process.env.TRAKCARE_CONDITION_PATH || "/conditions").trim(),
    medicationPath: (process.env.TRAKCARE_MEDICATION_PATH || "/medications").trim(),
    observationPath: (process.env.TRAKCARE_OBSERVATION_PATH || "/observations").trim(),
    practitionerPath: (process.env.TRAKCARE_PRACTITIONER_PATH || "/practitioners").trim(),
    timeoutMs: asInt(process.env.TRAKCARE_TIMEOUT_MS, 8000, 1000, 60000),
    retryCount: asInt(process.env.TRAKCARE_RETRY_COUNT, 2, 0, 5),
    rateLimitPerMinute: asInt(process.env.TRAKCARE_RATE_LIMIT_PER_MINUTE, 60, 1, 600),
    authMode,
    clientId: (process.env.TRAKCARE_CLIENT_ID || "").trim(),
    clientSecret: (process.env.TRAKCARE_CLIENT_SECRET || "").trim(),
    scope: (process.env.TRAKCARE_SCOPE || "").trim(),
    username: (process.env.TRAKCARE_USERNAME || "").trim(),
    password: (process.env.TRAKCARE_PASSWORD || "").trim(),
    staticBearerToken: (process.env.TRAKCARE_STATIC_BEARER_TOKEN || "").trim(),
  };
}

export function getTrakCareReadiness(config = getTrakCareConfig()): {
  ready: boolean;
  reason: string;
  baseUrlConfigured: boolean;
  authConfigured: boolean;
} {
  const baseUrlConfigured = config.baseUrl.length > 0;

  let authConfigured = false;
  if (config.authMode === "oauth2_client_credentials") {
    authConfigured = config.authUrl.length > 0 && config.clientId.length > 0 && config.clientSecret.length > 0;
  } else if (config.authMode === "basic") {
    authConfigured = config.username.length > 0 && config.password.length > 0;
  } else {
    authConfigured = config.staticBearerToken.length > 0;
  }

  if (!config.liveEnabled) {
    return {
      ready: false,
      reason: "Pending Live Credentials: live mode is disabled by feature flag or environment",
      baseUrlConfigured,
      authConfigured,
    };
  }

  if (!baseUrlConfigured || !authConfigured) {
    return {
      ready: false,
      reason: "Pending Live Credentials: TrakCare endpoint/auth configuration is incomplete",
      baseUrlConfigured,
      authConfigured,
    };
  }

  return {
    ready: true,
    reason: "TrakCare live integration ready",
    baseUrlConfigured,
    authConfigured,
  };
}
