import { ApiError } from "@/lib/server/http";

function envFlag(value: string | undefined): boolean {
  if (value == null) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function getRuntimeModes() {
  const maintenanceMode = envFlag(process.env.RUNTIME_MAINTENANCE_MODE);
  const readonlyMode = envFlag(process.env.RUNTIME_READONLY_MODE);
  const degradedMode = envFlag(process.env.RUNTIME_DEGRADED_MODE) || maintenanceMode;

  return {
    maintenanceMode,
    readonlyMode,
    degradedMode,
    effectiveMode: maintenanceMode ? "maintenance" : readonlyMode ? "readonly" : degradedMode ? "degraded" : "normal",
  } as const;
}

export function assertRuntimeWriteAllowed(): void {
  const modes = getRuntimeModes();
  if (modes.maintenanceMode) {
    throw new ApiError(503, "Service is temporarily in maintenance mode");
  }
  if (modes.readonlyMode) {
    throw new ApiError(503, "Service is temporarily in read-only mode");
  }
}
