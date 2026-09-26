'use strict';

const fs = require('node:fs');
const path = require('node:path');

const APP_PACKAGE_NAME = '@wathiqcare/web';
const ROOT_PACKAGE_NAME = 'wathiqcare';
const WORKSPACES_MARKER = 'workspaces';

function hasWorkspacesMarker(pkg) {
  return (
    Array.isArray(pkg[WORKSPACES_MARKER]) ||
    (pkg[WORKSPACES_MARKER] && typeof pkg[WORKSPACES_MARKER] === 'object')
  );
}

/**
 * Determine whether the build is running on Vercel's build container.
 *
 * Vercel sets VERCEL=1 and a VERCEL_ENV value for every build. We treat either
 * signal as authoritative so the tracing root is never calculated from a
 * relative path that could escape to filesystem root.
 */
function isRunningOnVercel(env = process.env) {
  return env.VERCEL === '1' || (env.VERCEL_ENV && env.VERCEL_ENV.length > 0);
}

function isFilesystemRoot(resolvedPath) {
  const normalized = path.resolve(resolvedPath);
  const parsed = path.parse(normalized);
  return normalized === parsed.root;
}

function readPackageJsonSafe(dir) {
  const packagePath = path.join(dir, 'package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Validate that the supplied directory is the expected Next.js app root.
 * Fails closed if the directory is missing package.json or has the wrong name.
 */
function resolveAppRoot(cwd) {
  const resolved = path.resolve(cwd || process.cwd());

  if (isFilesystemRoot(resolved)) {
    throw Object.assign(
      new Error(`APP_ROOT_IS_FILESYSTEM_ROOT: ${resolved}`),
      { code: 'APP_ROOT_IS_FILESYSTEM_ROOT' },
    );
  }

  const pkg = readPackageJsonSafe(resolved);
  if (!pkg) {
    throw Object.assign(
      new Error(`APP_PACKAGE_MISSING: ${path.join(resolved, 'package.json')}`),
      { code: 'APP_PACKAGE_MISSING' },
    );
  }

  if (pkg.name !== APP_PACKAGE_NAME) {
    throw Object.assign(
      new Error(`UNEXPECTED_APP_ROOT: ${resolved} (name=${pkg.name || 'undefined'})`),
      { code: 'UNEXPECTED_APP_ROOT' },
    );
  }

  return resolved;
}

/**
 * Walk upward from the app root looking for the repository root. The repo root
 * must contain a package.json that names this monorepo or declares workspaces.
 * The search stops before the filesystem root to avoid escaping the project.
 */
function findRepoRoot(appRoot) {
  let current = appRoot;

  while (true) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;

    if (isFilesystemRoot(current)) {
      break;
    }

    const pkg = readPackageJsonSafe(current);
    if (pkg && (pkg.name === ROOT_PACKAGE_NAME || hasWorkspacesMarker(pkg))) {
      return current;
    }
  }

  return null;
}

/**
 * Resolve a safe, deterministic output-file tracing root.
 *
 * On Vercel the tracing root is the validated app root (the Vercel project Root
 * Directory). Locally, when the helper is run from inside apps/web, it returns
 * the repository root only if a valid monorepo marker exists. In all other
 * cases it falls back to the validated app root and never resolves to the
 * filesystem root (/ or C:\).
 *
 * Returns:
 *   root            - absolute path to use as outputFileTracingRoot
 *   contractsInclude- glob pattern relative to root for the discharge contracts
 *   isVercel        - whether Vercel mode was detected
 */
function resolveTracingRoot(options = {}) {
  const env = options.env || process.env;
  const cwd = options.cwd || process.cwd();

  const appRoot = resolveAppRoot(cwd);

  if (isRunningOnVercel(env)) {
    return {
      root: appRoot,
      contractsInclude: './contracts/**',
      isVercel: true,
    };
  }

  const repoRoot = findRepoRoot(appRoot);
  if (repoRoot && !isFilesystemRoot(repoRoot)) {
    return {
      root: repoRoot,
      contractsInclude: './apps/web/contracts/**',
      isVercel: false,
    };
  }

  return {
    root: appRoot,
    contractsInclude: './contracts/**',
    isVercel: false,
  };
}

module.exports = {
  APP_PACKAGE_NAME,
  ROOT_PACKAGE_NAME,
  isRunningOnVercel,
  isFilesystemRoot,
  resolveAppRoot,
  findRepoRoot,
  resolveTracingRoot,
};
