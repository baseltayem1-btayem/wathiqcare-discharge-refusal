/**
 * SMS Gateway Proxy — Express Application
 *
 * Minimal secure proxy for Taqnyat SMS with static IP whitelist.
 */

import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { loadConfig } from "./lib/config.js";
import { createTaqnyatProvider } from "./lib/taqnyat-provider.js";
import { maskMobileNumber, redactSensitiveHeaders } from "./lib/logging.js";

const config = loadConfig();
const taqnyat = createTaqnyatProvider(config);

const app = express();

app.use(helmet());
app.use(cors({ origin: false })); // Disable CORS — this is a server-to-server proxy
app.use(express.json({ limit: "1mb" }));

// ── Request logging (safe) ─────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      event: "request_received",
      method: req.method,
      path: req.path,
      correlationId: req.headers["x-correlation-id"] || req.body?.correlationId,
      headers: redactSensitiveHeaders(req.headers as Record<string, string | string[] | undefined>),
    }),
  );

  const originalEnd = _res.end.bind(_res);
  _res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        event: "request_completed",
        method: req.method,
        path: req.path,
        statusCode: _res.statusCode,
        durationMs,
      }),
    );
    return originalEnd(chunk, encoding, cb);
  };

  next();
});

// ── Health endpoint ────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "wathiqcare-sms-gateway-proxy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Shared secret middleware ─────────────────────────────────────────────────
function requireSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers["x-wathiqcare-sms-secret"];
  const expected = config.wathiqcareSmsProxySecret;

  if (!provided || provided !== expected) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        event: "auth_failure",
        path: req.path,
        reason: "invalid_or_missing_secret",
      }),
    );
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  next();
}

// ── SMS send endpoint ────────────────────────────────────────────────────────
app.post("/api/v1/sms/send", requireSecret, async (req: Request, res: Response) => {
  const { recipient, message, senderName, sender, correlationId } = req.body;

  // Validate required fields
  if (!recipient || typeof recipient !== "string") {
    res.status(400).json({ ok: false, error: "Missing or invalid field: recipient" });
    return;
  }
  if (!message || typeof message !== "string") {
    res.status(400).json({ ok: false, error: "Missing or invalid field: message" });
    return;
  }
  if ((!senderName || typeof senderName !== "string") && (!sender || typeof sender !== "string")) {
    res.status(400).json({ ok: false, error: "Missing or invalid field: senderName or sender" });
    return;
  }

  const senderValue = senderName || sender || config.taqnyatSender;

  try {
    const result = await taqnyat.send({
      recipient,
      message,
      sender: senderValue,
      correlationId,
    });

    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      correlationId: correlationId || null,
      recipientMasked: maskMobileNumber(recipient),
      providerStatus: result.providerStatus,
      providerMessageId: result.providerMessageId,
      statusCode: result.statusCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "taqnyat_send_exception",
        correlationId: correlationId || null,
        recipientMasked: maskMobileNumber(recipient),
        error: message,
      }),
    );
    res.status(502).json({ ok: false, error: "Taqnyat gateway unreachable", correlationId: correlationId || null });
  }
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "unhandled_exception",
      error: err.message,
      stack: config.nodeEnv === "development" ? err.stack : undefined,
    }),
  );
  res.status(500).json({ ok: false, error: "Internal server error" });
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      event: "server_started",
      port: config.port,
      taqnyatApiUrl: config.taqnyatApiUrl,
      taqnyatSender: config.taqnyatSender,
      nodeEnv: config.nodeEnv,
    }),
  );
});
