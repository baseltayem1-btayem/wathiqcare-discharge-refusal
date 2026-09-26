/**
 * SMS Gateway Proxy — Environment Configuration
 *
 * All secrets are loaded from environment variables only.
 * No hardcoded values. No defaults for secrets.
 */

export type ProxyConfig = {
  port: number;
  taqnyatApiUrl: string;
  taqnyatBearerToken: string;
  taqnyatSender: string;
  wathiqcareSmsProxySecret: string;
  nodeEnv: string;
};

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): ProxyConfig {
  return {
    port: parseInt(process.env.PORT || "3000", 10),
    taqnyatApiUrl: requireEnv("TAQNYAT_API_URL"),
    taqnyatBearerToken: requireEnv("TAQNYAT_BEARER_TOKEN"),
    taqnyatSender: requireEnv("TAQNYAT_SENDER"),
    wathiqcareSmsProxySecret: requireEnv("WATHIQCARE_SMS_PROXY_SECRET"),
    nodeEnv: process.env.NODE_ENV || "production",
  };
}
