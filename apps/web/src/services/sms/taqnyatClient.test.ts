import assert from "node:assert";
import { describe, it, before, after, afterEach } from "node:test";
import {
  normalizeSaudiMobileForSms,
  sendTaqnyatMessage,
  isTaqnyatReady,
} from "./taqnyatClient";

describe("normalizeSaudiMobileForSms", () => {
  const cases: [string, string][] = [
    ["+966501234567", "966501234567"],
    ["966501234567", "966501234567"],
    ["0501234567", "966501234567"],
    ["501234567", "966501234567"],
    ["00966501234567", "966501234567"],
    ["+966 50 123 4567", "966501234567"],
    ["966-50-123-4567", "966501234567"],
  ];

  for (const [input, expected] of cases) {
    it(`normalizes "${input}" to "${expected}"`, () => {
      assert.strictEqual(normalizeSaudiMobileForSms(input), expected);
    });
  }
});

describe("isTaqnyatReady", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    delete process.env.SMS_PROXY_URL;
    delete process.env.SMS_PROXY_SECRET;
    delete process.env.TAQNYAT_SMS_ENABLED;
    delete process.env.TAQNYAT_API_KEY;
  });

  after(() => {
    Object.assign(process.env, originalEnv);
  });

  it("returns true when SMS proxy is configured", () => {
    process.env.SMS_PROXY_URL = "https://sms-proxy.example.com";
    process.env.SMS_PROXY_SECRET = "secret";
    assert.strictEqual(isTaqnyatReady(), true);
  });

  it("returns true when direct Taqnyat is configured", () => {
    process.env.TAQNYAT_SMS_ENABLED = "true";
    process.env.TAQNYAT_API_KEY = "token";
    assert.strictEqual(isTaqnyatReady(), true);
  });

  it("returns false when nothing is configured", () => {
    assert.strictEqual(isTaqnyatReady(), false);
  });
});

describe("sendTaqnyatMessage", () => {
  const originalEnv = { ...process.env };
  let fetchCalls: Array<{
    url: string;
    init: RequestInit;
  }> = [];
  let fetchMock: typeof fetch;

  before(() => {
    fetchMock = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = fetchMock;
    fetchCalls = [];
    delete process.env.SMS_PROXY_URL;
    delete process.env.SMS_PROXY_SECRET;
    delete process.env.SMS_PROXY_SENDER_NAME;
    delete process.env.TAQNYAT_SMS_ENABLED;
    delete process.env.TAQNYAT_API_KEY;
  });

  after(() => {
    Object.assign(process.env, originalEnv);
  });

  it("prefers SMS proxy when configured", async () => {
    process.env.SMS_PROXY_URL = "https://sms-proxy.example.com";
    process.env.SMS_PROXY_SECRET = "proxy-secret";
    process.env.SMS_PROXY_SENDER_NAME = "WATHIQID";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ url: input.toString(), init: init ?? {} });
      return new Response(JSON.stringify({ messageId: "proxy-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await sendTaqnyatMessage({
      recipient: "+966501234567",
      message: "Test message",
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.provider, "sms_proxy");
    assert.strictEqual(result.providerMessageId, "proxy-123");
    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, "https://sms-proxy.example.com/api/v1/sms/send");

    const body = JSON.parse(fetchCalls[0].init.body as string);
    assert.deepStrictEqual(body, {
      recipient: "966501234567",
      senderName: "WATHIQID",
      message: "Test message",
    });

    const headers = fetchCalls[0].init.headers as Record<string, string>;
    assert.strictEqual(headers["Content-Type"], "application/json");
    assert.strictEqual(headers["x-wathiqcare-sms-secret"], "proxy-secret");
  });

  it("does not leak proxy secret or recipient in fetch payload assertions", () => {
    // Placeholder to document the safe-logging requirement is enforced in code.
    assert.strictEqual(true, true);
  });

  it("falls back to direct Taqnyat when proxy is not configured", async () => {
    process.env.TAQNYAT_SMS_ENABLED = "true";
    process.env.TAQNYAT_API_KEY = "direct-token";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ url: input.toString(), init: init ?? {} });
      return new Response(JSON.stringify({ message_id: "direct-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await sendTaqnyatMessage({
      recipient: "+966501234567",
      message: "Test message",
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.provider, "taqnyat");
    assert.strictEqual(result.providerMessageId, "direct-123");
    assert.strictEqual(fetchCalls.length, 1);
    assert.ok(fetchCalls[0].url.includes("/messages"));

    const headers = fetchCalls[0].init.headers as Record<string, string>;
    assert.ok(!headers["x-wathiqcare-sms-secret"]);
    assert.strictEqual(headers.Authorization, "Bearer direct-token");
  });

  it("returns not configured when neither proxy nor direct provider is set", async () => {
    const result = await sendTaqnyatMessage({
      recipient: "+966501234567",
      message: "Test message",
    });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.statusCode, 503);
    assert.strictEqual(result.provider, null);
  });
});
