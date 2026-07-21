import crypto from "node:crypto";

const REPLAY_WINDOW_SECONDS = 5 * 60;
const SIGNATURE_HEADER = "x-callback-signature";
const TIMESTAMP_HEADER = "x-callback-timestamp";

export type CallbackHeaders = {
  [SIGNATURE_HEADER]?: string;
  [TIMESTAMP_HEADER]?: string;
};

export function getCallbackSecret(): string {
  const secret =
    process.env.SIGNING_CALLBACK_SECRET?.trim()
    || process.env.SIGNING_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Signing callback secret is not configured");
  }
  return secret;
}

export function buildCallbackSignature(args: {
  secret: string;
  body: string;
  timestamp: string;
}): string {
  return crypto
    .createHmac("sha256", args.secret)
    .update(`${args.timestamp}.${args.body}`)
    .digest("hex");
}

export function verifyCallbackSignature(args: {
  secret: string;
  body: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  now?: Date;
  replayWindowSeconds?: number;
}): { valid: true } | { valid: false; reason: string } {
  const now = args.now ?? new Date();
  const replayWindow = args.replayWindowSeconds ?? REPLAY_WINDOW_SECONDS;

  if (!args.signatureHeader || !args.timestampHeader) {
    return { valid: false, reason: "Missing callback signature or timestamp header" };
  }

  const timestamp = Number(args.timestampHeader);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { valid: false, reason: "Invalid callback timestamp" };
  }

  const ageSeconds = Math.abs(now.getTime() / 1000 - timestamp);
  if (ageSeconds > replayWindow) {
    return { valid: false, reason: "Callback timestamp outside replay window" };
  }

  const expected = buildCallbackSignature({
    secret: args.secret,
    body: args.body,
    timestamp: args.timestampHeader,
  });

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(args.signatureHeader, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "Invalid callback signature" };
  }

  return { valid: true };
}

export { SIGNATURE_HEADER, TIMESTAMP_HEADER };
