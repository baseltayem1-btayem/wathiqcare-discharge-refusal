type DbOperationOptions = {
  traceId?: string;
  operationName?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

const DEFAULT_DB_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 5000);
const DEFAULT_DB_MAX_RETRIES = Number(process.env.DB_QUERY_MAX_RETRIES || 2);

export class DatabaseUnavailableError extends Error {
  traceId: string;
  operationName: string;

  constructor(args: { traceId: string; operationName: string; message: string }) {
    super(args.message);
    this.name = "DatabaseUnavailableError";
    this.traceId = args.traceId;
    this.operationName = args.operationName;
  }
}

function clampPositiveInteger(input: number, fallback: number): number {
  if (!Number.isFinite(input) || input <= 0) {
    return fallback;
  }
  return Math.floor(input);
}

function buildTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function isDbConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown; message?: unknown; code?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const code = typeof candidate.code === "string" ? candidate.code : "";

  if (name.includes("PrismaClientInitializationError") || name.includes("PrismaClientRustPanicError")) {
    return true;
  }

  if (code === "P1001" || code === "P1017") {
    return true;
  }

  return (
    message.includes("Can't reach database server") ||
    message.includes("Authentication failed against database server") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated unexpectedly") ||
    message.includes("timed out") ||
    message.includes("ECONNRESET")
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`DB operation timed out after ${timeoutMs}ms: ${operationName}`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function runDbOperation<T>(operation: () => Promise<T>, options: DbOperationOptions = {}): Promise<T> {
  const traceId = options.traceId?.trim() || buildTraceId();
  const operationName = options.operationName || "db_operation";
  const timeoutMs = clampPositiveInteger(options.timeoutMs ?? DEFAULT_DB_TIMEOUT_MS, DEFAULT_DB_TIMEOUT_MS);
  const maxRetries = clampPositiveInteger(options.maxRetries ?? DEFAULT_DB_MAX_RETRIES, DEFAULT_DB_MAX_RETRIES);

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await withTimeout(operation(), timeoutMs, operationName);
    } catch (error) {
      lastError = error;
      const transient = isDbConnectivityError(error);
      const canRetry = transient && attempt < maxRetries;

      if (canRetry) {
        continue;
      }

      if (transient) {
        throw new DatabaseUnavailableError({
          traceId,
          operationName,
          message: `Database unavailable during ${operationName}`,
        });
      }

      throw error;
    }
  }

  throw new DatabaseUnavailableError({
    traceId,
    operationName,
    message: `Database unavailable during ${operationName}`,
  });
}
