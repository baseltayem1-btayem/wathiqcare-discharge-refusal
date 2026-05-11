/**
 * Enterprise Error Handling
 *
 * Centralized error taxonomy, structured error types, and
 * API response helpers for ALL platform modules.
 *
 * Principles:
 * - No silent failures
 * - Every error has a machine-readable code
 * - Every error is loggable with structured context
 * - API responses always return consistent JSON shapes
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",

  // Document lifecycle
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  DOCUMENT_FINALIZED: "DOCUMENT_FINALIZED",       // Cannot edit finalized
  DOCUMENT_LEGAL_HOLD: "DOCUMENT_LEGAL_HOLD",     // Legal hold prevents action
  DOCUMENT_UNSIGNED: "DOCUMENT_UNSIGNED",          // Cannot finalize unsigned
  DOCUMENT_NOT_APPROVED: "DOCUMENT_NOT_APPROVED", // Must approve before finalize

  // AI
  AI_DISABLED: "AI_DISABLED",
  AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
  AI_PENDING_REVIEW: "AI_PENDING_REVIEW",          // AI draft not yet physician-reviewed

  // PDF
  PDF_RENDER_FAILED: "PDF_RENDER_FAILED",
  PDF_NOT_GENERATED: "PDF_NOT_GENERATED",

  // Signatures
  SIGNATURE_DISABLED: "SIGNATURE_DISABLED",
  SIGNATURE_EXPIRED: "SIGNATURE_EXPIRED",
  SIGNATURE_INVALID_TOKEN: "SIGNATURE_INVALID_TOKEN",
  SIGNATURE_PROVIDER_FAILED: "SIGNATURE_PROVIDER_FAILED",
  SIGNATURE_MAX_RESENDS: "SIGNATURE_MAX_RESENDS",

  // Webhook
  WEBHOOK_HMAC_INVALID: "WEBHOOK_HMAC_INVALID",
  WEBHOOK_UNKNOWN_PROVIDER: "WEBHOOK_UNKNOWN_PROVIDER",

  // Database
  DB_CONSTRAINT_VIOLATION: "DB_CONSTRAINT_VIOLATION",
  DB_RECORD_NOT_FOUND: "DB_RECORD_NOT_FOUND",

  // Feature flags
  FEATURE_DISABLED: "FEATURE_DISABLED",

  // Generic
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ---------------------------------------------------------------------------
// Structured Platform Error
// ---------------------------------------------------------------------------

export class PlatformError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.context = context;
  }
}

// ---------------------------------------------------------------------------
// Named Error Factories (for common patterns)
// ---------------------------------------------------------------------------

export const Errors = {
  unauthorized: (msg = "Unauthorized") =>
    new PlatformError("UNAUTHORIZED", msg, 401),

  forbidden: (msg = "Access denied") =>
    new PlatformError("FORBIDDEN", msg, 403),

  notFound: (entity: string, id?: string) =>
    new PlatformError(
      "DOCUMENT_NOT_FOUND",
      id ? `${entity} not found: ${id}` : `${entity} not found`,
      404
    ),

  documentFinalized: () =>
    new PlatformError(
      "DOCUMENT_FINALIZED",
      "This document is finalized and cannot be modified.",
      409
    ),

  documentLegalHold: () =>
    new PlatformError(
      "DOCUMENT_LEGAL_HOLD",
      "This document is under legal hold. No modifications permitted.",
      409
    ),

  documentUnsigned: () =>
    new PlatformError(
      "DOCUMENT_UNSIGNED",
      "Document cannot be finalized without all required signatures.",
      422
    ),

  documentNotApproved: () =>
    new PlatformError(
      "DOCUMENT_NOT_APPROVED",
      "Document must be approved by a physician before finalization.",
      422
    ),

  aiPendingReview: () =>
    new PlatformError(
      "AI_PENDING_REVIEW",
      "AI-generated content must be reviewed and approved by a physician before this action.",
      422
    ),

  validationError: (msg: string, context?: Record<string, unknown>) =>
    new PlatformError("VALIDATION_ERROR", msg, 400, context),

  featureDisabled: (flagName: string) =>
    new PlatformError(
      "FEATURE_DISABLED",
      `Feature is currently disabled: ${flagName}`,
      503
    ),

  internal: (msg = "Internal server error", cause?: unknown) => {
    const err = new PlatformError("INTERNAL_ERROR", msg, 500);
    if (cause) (err as unknown as Record<string, unknown>).cause = cause;
    return err;
  },
} as const;

// ---------------------------------------------------------------------------
// API Response Builders
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 500,
  context?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { code, message, context } },
    { status }
  );
}

/**
 * Convert any thrown error to a typed API error response.
 * Handles PlatformError, known core errors, and generic errors.
 */
export function handleRouteError(
  err: unknown,
  defaultMessage = "An unexpected error occurred"
): NextResponse<ApiErrorResponse> {
  if (err instanceof PlatformError) {
    return apiError(err.code, err.message, err.httpStatus, err.context);
  }

  // Known core errors from signature/pdf/ai cores
  if (err instanceof Error) {
    const knownCodes: Record<string, number> = {
      AI_DISABLED: 503,
      AI_GENERATION_FAILED: 500,
      PDF_RENDER_FAILED: 500,
      SIGNATURE_DISABLED: 503,
      SIGNATURE_PROVIDER_FAILED: 502,
      SIGNATURE_EXPIRED: 410,
    };

    const code = (err as unknown as Record<string, unknown>).code as string | undefined;
    if (code && code in knownCodes) {
      return apiError(code, err.message, knownCodes[code]);
    }
  }

  console.error("[PlatformError] Unhandled:", err);
  return apiError("INTERNAL_ERROR", defaultMessage, 500);
}

// ---------------------------------------------------------------------------
// Runtime Error Logger (persists to platform_error_log)
// ---------------------------------------------------------------------------

export interface ErrorLogInput {
  tenantId?: string;
  module: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

/**
 * Persist a platform error to the error log.
 * Call after catching unexpected errors in route handlers or services.
 * Non-throwing — safe to call in catch blocks.
 */
export async function logPlatformError(input: ErrorLogInput): Promise<void> {
  try {
    const { getPrisma } = await import("@/lib/server/prisma");
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(
      `INSERT INTO platform_error_log
         (tenant_id, module, operation, error_code, error_message, stack_trace, context)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      input.tenantId ?? null,
      input.module,
      input.operation,
      input.errorCode,
      input.errorMessage,
      input.stackTrace ?? null,
      JSON.stringify(input.context ?? {})
    );
  } catch {
    // Never throw from error logger
  }
}
