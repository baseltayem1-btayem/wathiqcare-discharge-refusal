# SMS Gateway Proxy — VPS Deployment Runbook (Option A)

> **Status:** Ready for execution. Do not proceed until a VPS with static public IP is provisioned.
> **Scope:** Deploy the SMS Gateway Proxy on a standalone Ubuntu VPS with Docker.
> **Target:** `sms.wathiqcare.online` (recommended subdomain)

---

## 1. VPS Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| OS | Ubuntu 22.04 LTS or 24.04 LTS | Ubuntu 24.04 LTS |
| vCPU | 1 core | 2 cores |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| Network | Static public IPv4 | Static public IPv4 + IPv6 |
| Bandwidth | 1 TB/month | 2 TB/month |

**Suggested providers:** Hetzner (CX11), DigitalOcean ($6 Droplet), Vultr, AWS Lightsail, Linode.

---

## 2. Firewall Rules (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTPS (production traffic)
sudo ufw allow 443/tcp

# Allow HTTP (Certbot certificate issuance only — redirect to HTTPS after)
sudo ufw allow 80/tcp

# Optional: restrict SSH to WathiqCare office IP
# sudo ufw allow from <OFFICE_IP> to any port 22

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

**Note:** Port 3000 (the proxy's native port) must **NOT** be exposed to the public internet. It should only be accessible via localhost or the Docker internal network. Nginx will reverse-proxy to it.

---

## 3. Docker Installation (Ubuntu 22.04/24.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version

# Add current user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

> **Important:** Log out and log back in after adding the user to the `docker` group.

---

## 4. Secure Deployment Directory Structure

```
/opt/wathiqcare-sms-proxy/
├── .env                    # Production secrets (chmod 600)
├── docker-compose.yml      # Service definition
├── Dockerfile              # From PR #74
├── package.json            # From PR #74
├── package-lock.json       # From PR #74
├── tsconfig.json           # From PR #74
├── scripts/
│   └── generate-secret.sh  # From PR #74
└── src/                    # From PR #74
    ├── index.ts
    └── lib/
        ├── config.ts
        ├── logging.ts
        └── taqnyat-provider.ts
```

```bash
# Create deployment directory
sudo mkdir -p /opt/wathiqcare-sms-proxy
sudo chown $USER:$USER /opt/wathiqcare-sms-proxy

# Clone or copy the sms-gateway-proxy source from PR #74
cd /opt/wathiqcare-sms-proxy
# Option A: git clone the repo and checkout the branch
git clone https://github.com/baseltayem1-btayem/wathiqcare-discharge-refusal.git /tmp/wathiqcare-repo
cp -r /tmp/wathiqcare-repo/sms-gateway-proxy/* /opt/wathiqcare-sms-proxy/
rm -rf /tmp/wathiqcare-repo

# Option B: SCP the files from your local machine
# scp -r sms-gateway-proxy/* user@<VPS_IP>:/opt/wathiqcare-sms-proxy/
```

---

## 5. Create .env on the VPS (Never Expose Secrets)

```bash
cd /opt/wathiqcare-sms-proxy
cp .env.example .env
chmod 600 .env
nano .env
```

### .env Template (Fill in real values)

```env
# ── Server ────────────────────────────────────────────────────────────────────
PORT=3000

# ── Taqnyat API ───────────────────────────────────────────────────────────────
TAQNYAT_API_URL=https://api.taqnyat.sa/v1

# Your real Taqnyat bearer token. This is held ONLY in the proxy.
TAQNYAT_BEARER_TOKEN=YOUR_REAL_BEARER_TOKEN_HERE

# Default sender name registered with Taqnyat.
TAQNYAT_SENDER=WathiqCare

# ── WathiqCare Shared Secret ──────────────────────────────────────────────────
# Generate with: ./scripts/generate-secret.sh
# This same secret must be set in WathiqCare as TAQNYAT_PROXY_SECRET
WATHIQCARE_SMS_PROXY_SECRET=YOUR_GENERATED_SECRET_HERE

# ── Runtime ─────────────────────────────────────────────────────────────────
NODE_ENV=production
```

```bash
# Secure the .env file
chmod 600 /opt/wathiqcare-sms-proxy/.env
```

---

## 6. Docker Build and Run Commands

### Option A: Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
services:
  sms-proxy:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: wathiqcare-sms-proxy
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:3000:3000"  # Bind to localhost only
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
cd /opt/wathiqcare-sms-proxy

# Build and start
sudo docker compose up -d --build

# View logs
sudo docker compose logs -f sms-proxy

# Check status
sudo docker compose ps
```

### Option B: Docker Run (Direct)

```bash
cd /opt/wathiqcare-sms-proxy

# Build
sudo docker build -t wathiqcare-sms-proxy .

# Run (bind to localhost only)
sudo docker run -d \
  --name wathiqcare-sms-proxy \
  --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:3000:3000 \
  wathiqcare-sms-proxy

# View logs
sudo docker logs -f wathiqcare-sms-proxy
```

---

## 7. Health-Check Commands

```bash
# Local health check (from VPS)
curl -s http://localhost:3000/health | jq .

# Expected response:
# {
#   "ok": true,
#   "service": "wathiqcare-sms-gateway-proxy",
#   "version": "1.0.0",
#   "timestamp": "2026-07-01T..."
# }

# Docker health status
sudo docker inspect --format='{{.State.Health.Status}}' wathiqcare-sms-proxy

# Check container is running
sudo docker ps --filter name=wathiqcare-sms-proxy
```

---

## 8. Reverse Proxy Setup (Nginx + HTTPS)

### Install Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Nginx Configuration

Create `/etc/nginx/sites-available/sms.wathiqcare.online`:

```nginx
server {
    listen 80;
    server_name sms.wathiqcare.online;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name sms.wathiqcare.online;

    # SSL certificates (Certbot will manage these)
    ssl_certificate /etc/letsencrypt/live/sms.wathiqcare.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sms.wathiqcare.online/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to the SMS Gateway Proxy (localhost only)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sms.wathiqcare.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Obtain SSL Certificate with Certbot

```bash
# Ensure DNS A record for sms.wathiqcare.online points to <STATIC_PUBLIC_IP>

# Run Certbot
sudo certbot --nginx -d sms.wathiqcare.online --non-interactive --agree-tos --email admin@wathiqcare.online

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Verify HTTPS Endpoint

```bash
# From the VPS
curl -s https://sms.wathiqcare.online/health | jq .

# From your local machine (after DNS propagates)
curl -s https://sms.wathiqcare.online/health | jq .
```

---

## 9. Taqnyat Whitelist Request Message

Send the following email to your Taqnyat account manager:

```
Subject: IP Whitelist Request for WathiqCare SMS Gateway

Dear Taqnyat Support Team,

We are requesting that our dedicated SMS Gateway server IP be whitelisted for our Taqnyat account to enable production SMS delivery.

Account Information:
- Account Name: [Your Registered Taqnyat Account Name]
- Sender Name: WathiqCare
- API URL: https://api.taqnyat.sa/v1

IP Address to Whitelist:
- IPv4: <STATIC_PUBLIC_IP>

Example:
- IPv4: 203.0.113.45

This IP belongs to our dedicated SMS Gateway Proxy (sms.wathiqcare.online) that sends all SMS traffic on behalf of the WathiqCare platform. All requests will originate exclusively from this static IP address.

Please confirm once the whitelist has been applied to our account, and let us know if any additional information is required.

Thank you for your support.

Best regards,
[Your Name]
WathiqCare Platform Team
```

---

## 10. Rollback Commands

### Rollback to Previous Container Version

```bash
cd /opt/wathiqcare-sms-proxy

# Stop and remove current container
sudo docker compose down

# Or if using docker run directly:
# sudo docker stop wathiqcare-sms-proxy
# sudo docker rm wathiqcare-sms-proxy

# Revert to previous image (if tagged)
sudo docker run -d --name wathiqcare-sms-proxy ...

# Or rebuild from previous commit
git log --oneline -5
# git checkout <PREVIOUS_COMMIT>
sudo docker compose up -d --build
```

### Full Service Stop

```bash
# Stop the proxy
sudo docker compose down

# Or
sudo docker stop wathiqcare-sms-proxy
sudo docker rm wathiqcare-sms-proxy

# Disable Nginx site
sudo rm /etc/nginx/sites-enabled/sms.wathiqcare.online
sudo systemctl reload nginx

# Revoke Certbot certificate (optional)
sudo certbot revoke --cert-name sms.wathiqcare.online
```

### Quick Health-Based Rollback

```bash
# If health check fails, container auto-restarts due to:
# restart: unless-stopped
# Docker healthcheck retries: 3

# Manual restart
sudo docker compose restart sms-proxy
```

---

## 11. Post-Deployment Verification Checklist

| # | Check | Command / Method |
|---|-------|----------------|
| 1 | Container is running | `sudo docker ps --filter name=wathiqcare-sms-proxy` |
| 2 | Health endpoint responds | `curl -s http://localhost:3000/health` |
| 3 | Nginx is serving HTTPS | `curl -s https://sms.wathiqcare.online/health` |
| 4 | SSL certificate is valid | `openssl s_client -connect sms.wathiqcare.online:443 -servername sms.wathiqcare.online` |
| 5 | Secret auth works | `curl -s -H "x-wathiqcare-sms-secret: <SECRET>" -X POST https://sms.wathiqcare.online/api/v1/sms/send -d '{"recipient":"+96650000000","message":"test","senderName":"WathiqCare"}'` |
| 6 | Invalid secret rejected | Same as above with wrong secret → expect 401 |
| 7 | Missing fields rejected | Omit recipient → expect 400 |
| 8 | Logs show masked mobiles | `sudo docker logs wathiqcare-sms-proxy` → verify `recipientMasked` |
| 9 | No bearer token in logs | `sudo docker logs wathiqcare-sms-proxy` → verify no `Bearer` token |
| 10 | Port 3000 not public | `sudo ss -tlnp | grep 3000` → should show `127.0.0.1:3000` only |
| 11 | Firewall active | `sudo ufw status verbose` |
| 12 | Auto-renewal configured | `sudo certbot renew --dry-run` |

---

## 12. WathiqCare Integration Plan (After Taqnyat Confirms Whitelist)

Once Taqnyat confirms the IP whitelist is active:

### Step 1: Update WathiqCare Environment Variables

Add these to WathiqCare's production environment (Vercel, or `.env.production`):

```env
# Disable direct Taqnyat sending (bypasses local client)
TAQNYAT_SMS_ENABLED=false

# Point to the proxy
TAQNYAT_PROXY_URL=https://sms.wathiqcare.online/api/v1/sms/send
TAQNYAT_PROXY_SECRET=YOUR_GENERATED_SECRET_HERE
```

### Step 2: Redeploy WathiqCare

```bash
# From the feature/clinical-knowledge-engine-mvp branch
vercel deploy --prod
```

### Step 3: Verify End-to-End (Dry-Run Only)

1. Log in to WathiqCare production (`https://wathiqcare.online`).
2. Navigate to **Modules → Informed Consents**.
3. Select a patient and encounter.
4. Resolve a procedure (e.g., "Appendicectomy - Open").
5. Click **Dry-run send** in the Send Confirmation Modal.
6. Verify the dry-run success banner appears.
7. Check proxy logs on the VPS:
   ```bash
   sudo docker logs -f wathiqcare-sms-proxy
   ```
8. Confirm the log shows:
   - `event: "request_received"` with masked headers
   - `event: "taqnyat_send_attempt"` with `recipientMasked`
   - No bearer token in any log line

### Step 4: Enable Real SMS (After Dry-Run Success)

Only after dry-run verification succeeds:

1. Click **Confirm send** for a real patient consent.
2. Monitor proxy logs for successful Taqnyat delivery.
3. Verify patient receives the SMS.

---

## Waiting for VPS Details

Before proceeding with deployment, the following must be provided:

| Detail | Needed For |
|--------|------------|
| VPS static public IPv4 | Taqnyat whitelist, DNS A record |
| VPS SSH credentials | Remote access for installation |
| Subdomain DNS A record | `sms.wathiqcare.online` → `<STATIC_PUBLIC_IP>` |
| Real Taqnyat bearer token | Proxy `.env` configuration |
| Generated `WATHIQCARE_SMS_PROXY_SECRET` | Shared between proxy and WathiqCare |

---

**SMS GATEWAY PROXY VPS DEPLOYMENT RUNBOOK READY — WAITING FOR VPS DETAILS**
