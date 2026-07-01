/**
 * Next.js instrumentation hook.
 * Runs once at server startup in the Node.js runtime.
 * Used here to validate required environment configuration before the app serves traffic.
 */

export async function register() {
  // Fail fast if required configuration is missing or uses unsafe placeholders.
  // Dynamic import keeps the Node-only fs/path dependency out of Edge bundles.
  const { assertRuntimeEnv } = await import("@/lib/config/env-validation");
  assertRuntimeEnv({ context: "instrumentation", log: true });
}
