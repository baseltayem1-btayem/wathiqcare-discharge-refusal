import { existsSync } from "node:fs";
import path from "node:path";

export type ApprovedConsentSourceInfo = {
  sourcePath: string | null;
  available: boolean;
  sourceKind: "remote" | "local-public" | "unresolved";
  resolvedFilePath: string | null;
};

const IMC_LIBRARY_PREFIX = "imc-consent-library/";
const APPROVED_FORMS_PREFIX = "approved-consent-forms/";

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function sanitizeLocalPublicPath(value: string): string | null {
  if (!value.startsWith("/")) return null;
  const normalized = value.replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  const relativePath = normalized.replace(/^\/+/, "");

  try {
    return decodeURIComponent(relativePath);
  } catch {
    return relativePath;
  }
}

function normalizeApprovedFormsPath(value: string): string | null {
  const normalized = value.replace(/\\/g, "/").trim();

  const isApprovedFormsPath =
    (normalized.startsWith(`/${APPROVED_FORMS_PREFIX}`) || normalized.startsWith(APPROVED_FORMS_PREFIX))
    && normalized.endsWith(".pdf")
    && !normalized.includes("..")
    && !normalized.includes("//");

  if (!isApprovedFormsPath) {
    return null;
  }

  const relativePath = normalized.replace(/^\/+/, "");

  try {
    return decodeURIComponent(relativePath);
  } catch {
    return relativePath;
  }
}

function resolveLocalPublicCandidate(relativePublicPath: string): string | null {
  if (!relativePublicPath.startsWith(IMC_LIBRARY_PREFIX) && !relativePublicPath.startsWith(APPROVED_FORMS_PREFIX)) {
    return null;
  }

  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    relativePublicPath,
  );
}

export function resolveApprovedConsentSource(sourcePath: string | null | undefined): ApprovedConsentSourceInfo {
  const normalized = typeof sourcePath === "string" && sourcePath.trim() ? sourcePath.trim() : null;

  if (!normalized) {
    return {
      sourcePath: null,
      available: false,
      sourceKind: "unresolved",
      resolvedFilePath: null,
    };
  }

  if (isRemoteUrl(normalized)) {
    return {
      sourcePath: normalized,
      available: true,
      sourceKind: "remote",
      resolvedFilePath: null,
    };
  }

  const approvedFormsRelativePath = normalizeApprovedFormsPath(normalized);
  if (approvedFormsRelativePath) {
    const candidate = resolveLocalPublicCandidate(approvedFormsRelativePath);
    if (candidate && existsSync(candidate)) {
      return {
        sourcePath: normalized,
        available: true,
        sourceKind: "local-public",
        resolvedFilePath: candidate,
      };
    }

    if (process.env.VERCEL === "1") {
      return {
        sourcePath: normalized,
        available: true,
        sourceKind: "local-public",
        resolvedFilePath: null,
      };
    }

    return {
      sourcePath: normalized,
      available: false,
      sourceKind: "local-public",
      resolvedFilePath: null,
    };
  }

  const relativePublicPath = sanitizeLocalPublicPath(normalized);
  if (!relativePublicPath) {
    return {
      sourcePath: normalized,
      available: false,
      sourceKind: "unresolved",
      resolvedFilePath: null,
    };
  }

  const candidate = resolveLocalPublicCandidate(relativePublicPath);
  if (candidate && existsSync(candidate)) {
    return {
      sourcePath: normalized,
      available: true,
      sourceKind: "local-public",
      resolvedFilePath: candidate,
    };
  }

  if (process.env.VERCEL === "1" && relativePublicPath.startsWith(IMC_LIBRARY_PREFIX)) {
    return {
      sourcePath: normalized,
      available: true,
      sourceKind: "local-public",
      resolvedFilePath: null,
    };
  }

  return {
    sourcePath: normalized,
    available: false,
    sourceKind: "local-public",
    resolvedFilePath: null,
  };
}