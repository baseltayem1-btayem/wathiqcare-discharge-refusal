import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.WATHIQCARE_BIOMETRIC_AGENT_PORT || "8787");
const HOST = process.env.WATHIQCARE_BIOMETRIC_AGENT_HOST || "127.0.0.1";

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function buildMockPayload(method = "biometric-fingerprint", verified = true) {
  const timestamp = new Date().toISOString();
  const transactionId = `DP-UAT-${crypto.randomUUID()}`;
  const deviceReference = "DigitalPersona 4500-UAT-STUB";
  const verificationHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ deviceReference, method, timestamp, transactionId, verified }))
    .digest("hex");

  return {
    verified,
    deviceReference,
    transactionId,
    timestamp,
    verificationHash,
    method,
    sdkProvider: "HID DigitalPersona",
    deviceModel: "DigitalPersona 4500",
  };
}

const server = http.createServer((request, response) => {
  if (!request.url || !request.url.startsWith("/biometric/verify")) {
    writeJson(response, 404, { error: "Not found" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    response.end();
    return;
  }

  if (request.method !== "POST") {
    writeJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  request.on("end", () => {
    let payload = {};
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      writeJson(response, 400, { error: "Invalid JSON body" });
      return;
    }

    const action = typeof payload.action === "string" ? payload.action : "verify";
    const method = payload.method === "combined-biometric-and-otp"
      ? "combined-biometric-and-otp"
      : "biometric-fingerprint";

    if (action === "detect") {
      writeJson(response, 200, buildMockPayload(method, false));
      return;
    }

    writeJson(response, 200, buildMockPayload(method, true));
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `[wathiqcare-biometric-agent-stub] listening on http://${HOST}:${PORT}/biometric/verify\n`,
  );
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
