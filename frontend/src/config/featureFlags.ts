/**
 * Feature flags for the WathiqCare frontend.
 *
 * All flags default to ENABLED (true) so that missing env vars never silently
 * hide features in production.  Set the corresponding NEXT_PUBLIC_* variable
 * to "false" to disable a feature.
 */

function isEnabled(envVar: string | undefined): boolean {
  return (envVar ?? "true").toLowerCase() !== "false";
}

export const featureFlags = {
  /**
   * Global Documents module — shows the /documents route in the sidebar.
   * Controlled by: NEXT_PUBLIC_ENABLE_DOCUMENTS (default: enabled)
   */
  documentsEnabled: isEnabled(process.env.NEXT_PUBLIC_ENABLE_DOCUMENTS),
} as const;
