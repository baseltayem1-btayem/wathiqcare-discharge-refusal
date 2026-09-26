import assert from "node:assert/strict";
import test from "node:test";

import { app } from "./server";

async function startTestServer(): Promise<{ close: () => Promise<void>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        close: () => new Promise((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
    server.on("error", reject);
  });
}

test("health endpoint returns ok", async () => {
  const { port, close } = await startTestServer();
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
  } finally {
    await close();
  }
});

test("render endpoint rejects requests without secret when PDF_RENDERER_SECRET is set", async () => {
  process.env.PDF_RENDERER_SECRET = "test-secret";
  const { port, close } = await startTestServer();
  try {
    const response = await fetch(`http://localhost:${port}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html></html>" }),
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "Unauthorized PDF renderer request");
  } finally {
    await close();
    delete process.env.PDF_RENDERER_SECRET;
  }
});

test("render endpoint accepts requests with correct secret", async () => {
  process.env.PDF_RENDERER_SECRET = "test-secret";
  const { port, close } = await startTestServer();
  try {
    const response = await fetch(`http://localhost:${port}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wathiq-internal-secret": "test-secret",
      },
      body: JSON.stringify({ html: "<html></html>" }),
    });
    // Request is authorized; it may fail later during PDF rendering, but it
    // should not be rejected with 401.
    assert.notEqual(response.status, 401);
  } finally {
    await close();
    delete process.env.PDF_RENDERER_SECRET;
  }
});
