# WathiqCare SMS Gateway Proxy

Minimal secure SMS Gateway Proxy for Taqnyat static IP / whitelist.

## Architecture

```
WathiqCare → SMS Gateway Proxy (Static Public IP) → Taqnyat API
```

## Quick Start

```bash
cd sms-gateway-proxy
cp .env.example .env
# Edit .env with your secrets
npm install
npm run build
npm start
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/sms/send` | Send SMS via Taqnyat |

## POST /api/v1/sms/send

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-wathiqcare-sms-secret` | Yes | Shared secret between WathiqCare and proxy |
| `Content-Type` | Yes | `application/json` |
| `x-correlation-id` | No | Optional trace ID |

### Request Body

```json
{
  "recipient": "+966501234567",
  "message": "Your secure signing link is ready.",
  "senderName": "WathiqCare",
  "correlationId": "uuid-or-trace-id"
}
```

### Response

```json
{
  "ok": true,
  "correlationId": "uuid-or-trace-id",
  "recipientMasked": "*******4567",
  "providerStatus": "200",
  "providerMessageId": "taqnyat-msg-id",
  "statusCode": 200
}
```

## Docker

```bash
docker build -t wathiqcare-sms-proxy .
docker run -p 3000:3000 --env-file .env wathiqcare-sms-proxy
```

## Deployment Options for Static IP

### Option A: VPS (Recommended)

1. Provision a VPS with a static public IP (e.g., DigitalOcean Droplet, AWS EC2, Hetzner, Vultr).
2. Install Docker on the VPS.
3. Clone this repository and build the Docker image.
4. Run the container with your `.env` file.
5. Configure a firewall (UFW/iptables) to allow only WathiqCare's IP ranges on port 3000.
6. Optionally, place Nginx or Traefik in front for TLS termination.

### Option B: Railway / Render with Static IP Add-on

Some platforms offer static IP add-ons:
- **Railway**: Use the "Static IP" add-on.
- **Render**: Use a dedicated instance with a static outbound IP.

### Option C: AWS ECS Fargate with NAT Gateway

1. Deploy the proxy as an ECS Fargate service.
2. Place the tasks in a private subnet.
3. Route outbound traffic through a NAT Gateway (which has a static Elastic IP).
4. The NAT Gateway's Elastic IP is what Taqnyat whitelists.

## IP Whitelist Message for Taqnyat

Send the following to your Taqnyat account manager:

```
Subject: IP Whitelist Request for WathiqCare SMS Gateway

Dear Taqnyat Support,

We are requesting that our SMS Gateway server IP be whitelisted for our account.

Account Information:
- Account Name: [Your Taqnyat Account Name]
- Sender Name: [Your registered sender name, e.g., WathiqCare]

IP to Whitelist:
- IPv4: [YOUR_PROXY_STATIC_PUBLIC_IP]

Example:
- IPv4: 203.0.113.45

This IP belongs to our dedicated SMS Gateway Proxy that sends all SMS traffic on behalf of WathiqCare. Please confirm once the whitelist is applied.

Thank you.
```

## WathiqCare Integration

Add these environment variables to WathiqCare:

```env
# Disable direct Taqnyat sending
TAQNYAT_SMS_ENABLED=false

# Point to the proxy
TAQNYAT_PROXY_URL=https://your-proxy-static-ip-or-domain:3000/api/v1/sms/send
TAQNYAT_PROXY_SECRET=your_generated_secret_here
```

## Security Notes

- The bearer token lives **only** in the proxy environment.
- Mobile numbers are masked in all logs.
- The `x-wathiqcare-sms-secret` header is redacted from logs.
- CORS is disabled — this is a server-to-server proxy.
- Helmet.js provides security headers.
- The container runs as a non-root user.

## License

Internal WathiqCare use only.
