#!/bin/bash
# sms-gateway-proxy/scripts/generate-secret.sh
# Generates a secure random secret for the WathiqCare SMS Proxy

set -e

SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo ""
echo "=== Generated WATHIQCARE_SMS_PROXY_SECRET ==="
echo ""
echo "$SECRET"
echo ""
echo "=== Usage ==="
echo "1. Copy the secret above into your proxy .env as WATHIQCARE_SMS_PROXY_SECRET"
echo "2. Copy the same secret into WathiqCare's environment as TAQNYAT_PROXY_SECRET"
echo "3. Never commit this value to source control"
echo ""
