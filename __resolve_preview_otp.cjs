/**
 * Resolve current OTP for a given preview signing token by reading webhook_events
 * from the actual preview DB (ep-withered-king) and brute-forcing the 6-digit HMAC.
 *
 * Usage: node __resolve_preview_otp.cjs <token>
 */
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');

const token = process.argv[2];
if (!token) {
  console.error('TOKEN_REQUIRED');
  process.exit(1);
}

const envText = fs.readFileSync('.env.preview.actual.local', 'utf8');
function getVar(name) {
  const match = envText.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^"|"$/g, '');
}

const connectionString = getVar('DATABASE_URL_UNPOOLED') || getVar('DATABASE_URL');
const pepper = getVar('PUBLIC_SIGNING_OTP_PEPPER') || 'wathiqcare-signing-otp-pepper';
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const otpHash = (code) => crypto.createHmac('sha256', pepper).update(code).digest('hex');

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const result = await client.query(
    `select raw_payload
     from webhook_events
     where provider_key = $1
       and event_type = $2
       and coalesce(processed, false) = false
       and raw_payload ->> 'tokenHash' = $3
     order by received_at desc
     limit 1`,
    ['public_signing_otp', 'OTP_REQUESTED', tokenHash],
  );

  const row = result.rows[0];
  if (!row) {
    console.error('NO_ACTIVE_CHALLENGE');
    await client.end();
    process.exit(2);
  }

  const payload = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload;
  const expected = String(payload.otpHash || '');
  if (!expected) {
    console.error('NO_OTP_HASH');
    await client.end();
    process.exit(3);
  }

  for (let number = 0; number < 1000000; number += 1) {
    const code = String(number).padStart(6, '0');
    if (otpHash(code) === expected) {
      console.log(JSON.stringify({ code, challengeId: payload.challengeId, expiresAt: payload.expiresAt }));
      await client.end();
      return;
    }
  }

  console.error('OTP_NOT_FOUND');
  await client.end();
  process.exit(4);
})().catch((error) => {
  console.error(error);
  process.exit(5);
});
