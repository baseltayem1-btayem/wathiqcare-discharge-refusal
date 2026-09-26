import assert from "node:assert/strict";
import test from "node:test";

import { resolveTrustedSigningBaseUrl } from "./signing-url-config";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("production resolves to canonical https://wathiqcare.online", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      SIGNING_BASE_URL: undefined,
      NEXTAUTH_URL: undefined,
      NEXT_PUBLIC_CANONICAL_PRODUCTION_URL: undefined,
      CANONICAL_PRODUCTION_URL: undefined,
    },
    () => {
      const url = resolveTrustedSigningBaseUrl();
      assert.equal(url, "https://wathiqcare.online");
    },
  );
});

test("production prioritizes configured canonical production URL", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      NEXT_PUBLIC_CANONICAL_PRODUCTION_URL: "https://wathiqcare.med.sa",
    },
    () => {
      const url = resolveTrustedSigningBaseUrl();
      assert.equal(url, "https://wathiqcare.med.sa");
    },
  );
});

test("production hardens a misconfigured canonical URL back to wathiqcare.online", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      NEXT_PUBLIC_CANONICAL_PRODUCTION_URL: "https://evil.example.com",
    },
    () => {
      const url = resolveTrustedSigningBaseUrl();
      assert.equal(url, "https://wathiqcare.online");
    },
  );
});

test("production rejects an explicit non-production host", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    },
    () => {
      assert.throws(
        () => resolveTrustedSigningBaseUrl("https://preview.vercel.app"),
        /production host/,
      );
    },
  );
});

test("preview cannot silently generate a production URL", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
      SIGNING_BASE_URL: "https://wathiqcare.online",
    },
    () => {
      assert.throws(
        () => resolveTrustedSigningBaseUrl(),
        /Preview environment cannot silently generate a production signing URL/,
      );
    },
  );
});

test("test environment allows http for local testing", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      NODE_ENV: "test",
      SIGNING_BASE_URL: "http://localhost:3000",
    },
    () => {
      const url = resolveTrustedSigningBaseUrl();
      assert.equal(url, "http://localhost:3000");
    },
  );
});

test("non-production falls back to SIGNING_BASE_URL", () => {
  withEnv(
    {
      VERCEL_ENV: "development",
      NODE_ENV: "development",
      SIGNING_BASE_URL: "https://app-preview.vercel.app",
      NEXT_PUBLIC_CANONICAL_PRODUCTION_URL: undefined,
    },
    () => {
      const url = resolveTrustedSigningBaseUrl();
      assert.equal(url, "https://app-preview.vercel.app");
    },
  );
});
