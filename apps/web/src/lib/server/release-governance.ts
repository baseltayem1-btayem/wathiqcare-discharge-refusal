import fs from "node:fs";
import path from "node:path";

export type ReleaseGovernanceSnapshot = {
  version: string;
  environment: string;
  buildDate: string;
  commitSha: string;
  currentBranch: string;
  deploymentDate: string;
  databaseIdentifier: string;
  lastSuccessfulRelease: string;
  rollbackTarget: string;
  productionSource: "origin/main";
};

type BuildInfo = {
  version?: string;
  buildDate?: string;
  commitSha?: string;
};

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveBuildInfo(): BuildInfo {
  const root = process.cwd();
  const candidates = [
    path.join(root, ".release-build.json"),
    path.join(root, "apps", "web", ".release-build.json"),
  ];

  for (const candidate of candidates) {
    const info = readJsonFile<BuildInfo>(candidate);
    if (info) {
      return info;
    }
  }

  return {};
}

function resolveVersion(buildInfo: BuildInfo): string {
  if (buildInfo.version?.trim()) {
    return buildInfo.version.trim();
  }

  const root = process.cwd();
  const packageCandidates = [
    path.join(root, "package.json"),
    path.join(root, "apps", "web", "package.json"),
  ];

  for (const packagePath of packageCandidates) {
    const pkg = readJsonFile<{ version?: string }>(packagePath);
    if (pkg?.version?.trim()) {
      return pkg.version.trim();
    }
  }

  return "0.0.0-unknown";
}

function resolveEnvironment(): string {
  return (
    process.env.APP_ENV ||
    process.env.VERCEL_TARGET_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "unknown"
  ).trim().toLowerCase();
}

function resolveCommitSha(buildInfo: BuildInfo): string {
  return (
    buildInfo.commitSha ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "unknown"
  ).trim();
}

function resolveCurrentBranch(): string {
  const raw =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF ||
    "unknown";

  return raw.replace(/^refs\/heads\//, "").trim();
}

function resolveBuildDate(buildInfo: BuildInfo): string {
  return (
    buildInfo.buildDate ||
    process.env.RELEASE_BUILD_DATE ||
    process.env.VERCEL_DEPLOYMENT_CREATED_AT ||
    new Date(0).toISOString()
  ).trim();
}

function parseDatabaseIdentifier(connectionString: string | undefined): string {
  if (!connectionString) {
    return "not-configured";
  }

  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname || "unknown-host";
    const databaseName = (parsed.pathname || "").replace(/^\//, "") || "unknown-db";
    return `${host}/${databaseName}`;
  } catch {
    return "masked-unparseable";
  }
}

export function getReleaseGovernanceSnapshot(): ReleaseGovernanceSnapshot {
  const buildInfo = resolveBuildInfo();
  const version = resolveVersion(buildInfo);
  const commitSha = resolveCommitSha(buildInfo);
  const buildDate = resolveBuildDate(buildInfo);
  const databaseIdentifier = parseDatabaseIdentifier(process.env.DATABASE_URL);
  const deploymentDate = (
    process.env.VERCEL_DEPLOYMENT_CREATED_AT ||
    process.env.RELEASE_DEPLOYED_AT ||
    buildDate
  ).trim();

  return {
    version,
    environment: resolveEnvironment(),
    buildDate,
    commitSha,
    currentBranch: resolveCurrentBranch(),
    deploymentDate,
    databaseIdentifier,
    lastSuccessfulRelease: (process.env.RELEASE_LAST_SUCCESSFUL_SHA || process.env.VERCEL_GIT_PREVIOUS_SHA || "unknown").trim(),
    rollbackTarget: (process.env.RELEASE_ROLLBACK_TARGET_SHA || process.env.VERCEL_GIT_PREVIOUS_SHA || "unknown").trim(),
    productionSource: "origin/main",
  };
}
