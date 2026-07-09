import fs from "fs";
import path from "path";

export type ApprovedSourceVerification = {
  url: string;
  sourceAvailable: boolean;
  sourceVerified: boolean;
  statusCode?: number;
  contentType?: string;
  reason?: string;
};

const PUBLIC_PREFIXES = [
  "/imc-consent-library/",
  "/approved-consent-forms/",
  "/educational/",
];

export function verifyPublicAssetSource(sourceUrl?: string | null): ApprovedSourceVerification {
  const url = typeof sourceUrl === "string" ? sourceUrl.trim() : "";

  if (!url) {
    return {
      url: "",
      sourceAvailable: false,
      sourceVerified: false,
      reason: "MISSING_SOURCE_URL",
    };
  }

  if (/^https?:\/\//i.test(url)) {
    return {
      url,
      sourceAvailable: true,
      sourceVerified: true,
      reason: "EXTERNAL_URL_NOT_FILESYSTEM_VERIFIED",
    };
  }

  if (!url.startsWith("/")) {
    return {
      url,
      sourceAvailable: true,
      sourceVerified: false,
      reason: "INVALID_PUBLIC_URL",
    };
  }

  const pathname = url.split("?")[0] || "";
  const allowedPrefix = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!allowedPrefix) {
    return {
      url,
      sourceAvailable: true,
      sourceVerified: false,
      reason: "PUBLIC_URL_PREFIX_NOT_ALLOWED",
    };
  }

  const decodedPathname = decodeURIComponent(pathname);
  const relativePath = decodedPathname.replace(/^\/+/, "");

  if (relativePath.includes("..")) {
    return {
      url,
      sourceAvailable: true,
      sourceVerified: false,
      reason: "PATH_TRAVERSAL_BLOCKED",
    };
  }

  const candidates = [
    path.join(process.cwd(), "public", relativePath),
    path.join(process.cwd(), "apps", "web", "public", relativePath),
    path.join(process.cwd(), "..", "public", relativePath),
  ];

  const matchedPath = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

  if (!matchedPath) {
    return {
      url,
      sourceAvailable: true,
      sourceVerified: false,
      statusCode: 404,
      reason: "PUBLIC_ASSET_NOT_FOUND",
    };
  }

  const ext = path.extname(matchedPath).toLowerCase();
  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

  return {
    url,
    sourceAvailable: true,
    sourceVerified: true,
    statusCode: 200,
    contentType,
  };
}
