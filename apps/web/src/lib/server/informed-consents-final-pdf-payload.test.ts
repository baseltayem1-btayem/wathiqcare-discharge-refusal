import assert from "node:assert/strict";
import test from "node:test";

import { renderPdfWithExternalRenderer } from "./informed-consents-final-pdf-payload";

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

test("renderPdfWithExternalRenderer returns null when PDF_RENDERER_URL is unset", async () => {
  withEnv({ PDF_RENDERER_URL: undefined, PDF_RENDERER_SECRET: undefined }, async () => {
    const result = await renderPdfWithExternalRenderer("<html></html>");
    assert.equal(result, null);
  });
});

test("renderPdfWithExternalRenderer sends x-wathiq-internal-secret header when secret is configured", async () => {
  withEnv(
    {
      PDF_RENDERER_URL: "http://renderer.test",
      PDF_RENDERER_SECRET: "renderer-secret-123",
    },
    async () => {
      let capturedHeaders: Record<string, string> = {};
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_url, init) => {
        capturedHeaders = (init?.headers as Record<string, string>) ?? {};
        return new Response(Buffer.from("pdf-bytes"), { status: 200 });
      };

      try {
        const result = await renderPdfWithExternalRenderer("<html></html>");
        assert.ok(result instanceof Buffer);
        assert.equal(capturedHeaders["x-wathiq-internal-secret"], "renderer-secret-123");
        assert.equal(capturedHeaders["Content-Type"], "application/json");
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("renderPdfWithExternalRenderer omits auth header when secret is not configured", async () => {
  withEnv(
    {
      PDF_RENDERER_URL: "http://renderer.test",
      PDF_RENDERER_SECRET: undefined,
    },
    async () => {
      let capturedHeaders: Record<string, string> = {};
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_url, init) => {
        capturedHeaders = (init?.headers as Record<string, string>) ?? {};
        return new Response(Buffer.from("pdf-bytes"), { status: 200 });
      };

      try {
        await renderPdfWithExternalRenderer("<html></html>");
        assert.equal(capturedHeaders["x-wathiq-internal-secret"], undefined);
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
