function isUnitTestRuntime() {
  const argv = Array.isArray(process.argv) ? process.argv : [];
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    typeof process.env.JEST_WORKER_ID === "string" ||
    argv.includes("--test")
  );
}

function isNextServerRuntime() {
  return process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge";
}

export function enforceServerOnly() {
  if (isUnitTestRuntime() || !isNextServerRuntime()) {
    return;
  }

  void import("server-only");
}