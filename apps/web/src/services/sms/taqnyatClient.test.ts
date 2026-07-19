import assert from "node:assert/strict";
import test from "node:test";

import {
  isTaqnyatReady,
  normalizeSaudiMobileForSms,
  sendTaqnyatMessage,
} from "./taqnyatClient";

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

test("normalizeSaudiMobileForSms strips non-digits and adds country code", () => {
  assert.equal(normalizeSaudiMobileForSms("+966 50 123 4567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("0501234567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("00966501234567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("501234567"), "966501234567");
});

test("isTaqnyatReady is false when SMS proxy is not configured", () => {
  withEnv(
    {
      SMS_PROXY_URL: undefined,
      SMS_PROXY_SECRET: undefined,
    },
    () => {
      assert.equal(isTaqnyatReady(), false);
    },
  );
});

test("isTaqnyatReady is true when SMS proxy is configured", () => {
  withEnv(
    {
      SMS_PROXY_URL: "https://sms-proxy.example.com",
      SMS_PROXY_SECRET: "secret",
    },
    () => {
      assert.equal(isTaqnyatReady(), true);
    },
  );
});

test("sendTaqnyatMessage returns failure when proxy is not configured", async () => {
  withEnv(
    {
      SMS_PROXY_URL: undefined,
      SMS_PROXY_SECRET: undefined,
    },
    async () => {
      const result = await sendTaqnyatMessage({
        recipient: "+966501234567",
        message: "Test",
      });
      assert.equal(result.ok, false);
      assert.equal(result.provider, null);
      assert.ok(result.response && typeof result.response === "object");
    },
  );
});
