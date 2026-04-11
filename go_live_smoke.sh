#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${WATHIQ_BASE_URL:-https://wathiqcare.online}"
RUN_PUBLIC_EMAIL_TEST="${WATHIQ_RUN_PUBLIC_EMAIL_TEST:-false}"
TENANT_EMAIL="${WATHIQ_TENANT_EMAIL:-}"
TENANT_PASSWORD="${WATHIQ_TENANT_PASSWORD:-}"
SMOKE_RECIPIENT_EMAIL="${WATHIQ_SMOKE_RECIPIENT_EMAIL:-}"
TYPED_NAME="${WATHIQ_SMOKE_TYPED_NAME:-Production Smoke User}"

WORK_DIR="$(mktemp -d)"
COOKIE_JAR="$WORK_DIR/tenant.cookies"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

log() {
  printf '[smoke][%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '[smoke][fail] %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

json_get() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json
import sys

path = sys.argv[1]
expr = sys.argv[2].split('.') if sys.argv[2] else []

with open(path, 'r', encoding='utf-8') as handle:
    data = json.load(handle)

current = data
for part in expr:
    if part == '':
        continue
    if isinstance(current, list):
        current = current[int(part)]
    else:
        current = current.get(part)

if current is None:
    print('')
elif isinstance(current, (dict, list)):
    print(json.dumps(current, ensure_ascii=False))
else:
    print(current)
PY
}

  log "curl request: $method $url"
  if [[ "$method" == "POST" || "$method" == "PUT" ]]; then
    for arg in "$@"; do
      if [[ "$arg" == -d* ]]; then
        log "curl data: ${arg#-d}"
      fi
    done
  fi
  curl --max-time 45 -sS -X "$method" "$url" -D "$headers_file" -o "$body_file" "$@"
  log "curl response headers: $(cat "$headers_file")"
  log "curl response body: $(cat "$body_file")"
}

http_status() {
  awk 'NR==1{print $2}' "$1"
}

check_public_health() {
  log "checking public frontend root"
  curl_json GET "$BASE_URL/" "$WORK_DIR/root.body" "$WORK_DIR/root.headers"
  local root_status
  root_status="$(http_status "$WORK_DIR/root.headers")"
  printf 'root_status=%s\n' "$root_status"
  [[ "$root_status" == "200" ]] || fail "frontend root did not return 200"

  log "checking public health endpoint"
  curl_json GET "$BASE_URL/health" "$WORK_DIR/health.body" "$WORK_DIR/health.headers"
  local health_status health_body
  health_status="$(http_status "$WORK_DIR/health.headers")"
  health_body="$(cat "$WORK_DIR/health.body")"
  printf 'health_status=%s\n' "$health_status"
  printf 'health_body=%s\n' "$health_body"
  [[ "$health_status" == "200" ]] || fail "/health did not return 200"
}

check_public_email() {
  if [[ "$RUN_PUBLIC_EMAIL_TEST" != "true" ]]; then
    log "skipping public email test; set WATHIQ_RUN_PUBLIC_EMAIL_TEST=true to enable"
    return 0
  fi

  log "triggering public email diagnostics endpoint"
  curl_json POST "$BASE_URL/api/test-email" "$WORK_DIR/test-email.body" "$WORK_DIR/test-email.headers"
  local status provider ok message_id
  status="$(http_status "$WORK_DIR/test-email.headers")"
  provider="$(json_get "$WORK_DIR/test-email.body" 'diagnostics.provider')"
  ok="$(json_get "$WORK_DIR/test-email.body" 'ok')"
  message_id="$(json_get "$WORK_DIR/test-email.body" 'diagnostics.messageId')"
  printf 'test_email_status=%s\n' "$status"
  printf 'test_email_ok=%s\n' "$ok"
  printf 'test_email_provider=%s\n' "$provider"
  printf 'test_email_message_id=%s\n' "$message_id"
  [[ "$status" == "200" ]] || fail "public email test did not return 200"
  [[ "$ok" == "True" || "$ok" == "true" ]] || fail "public email test returned ok=false"
}

tenant_login() {
  [[ -n "$TENANT_EMAIL" && -n "$TENANT_PASSWORD" ]] || return 1

  log "logging in with tenant credentials"
  curl_json POST "$BASE_URL/api/auth/login" "$WORK_DIR/tenant-login.body" "$WORK_DIR/tenant-login.headers" \
    -c "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}"

  local status authenticated redirect_to
  status="$(http_status "$WORK_DIR/tenant-login.headers")"
  authenticated="$(json_get "$WORK_DIR/tenant-login.body" 'authenticated')"
  redirect_to="$(json_get "$WORK_DIR/tenant-login.body" 'redirectTo')"
  printf 'tenant_login_status=%s\n' "$status"
  printf 'tenant_login_authenticated=%s\n' "$authenticated"
  printf 'tenant_login_redirect=%s\n' "$redirect_to"

  [[ "$status" == "200" ]] || fail "tenant login failed"
  [[ "$authenticated" == "True" || "$authenticated" == "true" ]] || fail "tenant login did not authenticate"

  curl_json GET "$BASE_URL/api/auth/me" "$WORK_DIR/auth-me.body" "$WORK_DIR/auth-me.headers" -b "$COOKIE_JAR"
  printf 'tenant_auth_me=%s\n' "$(cat "$WORK_DIR/auth-me.body")"
}

create_case() {
  [[ -n "$SMOKE_RECIPIENT_EMAIL" ]] || fail "WATHIQ_SMOKE_RECIPIENT_EMAIL is required for tenant smoke"

  local case_number payload
  case_number="SMOKE-$(date +%Y%m%d%H%M%S)"
  payload="{\"caseNumber\":\"$case_number\",\"caseType\":\"GENERAL\",\"status\":\"OPEN\",\"workflowType\":\"discharge_refusal\",\"title\":\"Production smoke discharge refusal\",\"patientName\":\"Smoke Patient\",\"patientIdNumber\":\"9000000001\",\"medicalRecordNo\":\"MRN-$case_number\",\"roomNumber\":\"SMOKE-01\",\"metadata\":{\"smoke_test\":true,\"created_by\":\"go_live_smoke.sh\"}}"

  log "creating smoke case"
  curl_json POST "$BASE_URL/api/cases" "$WORK_DIR/case-create.body" "$WORK_DIR/case-create.headers" \
    -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "$payload"

  local status
  status="$(http_status "$WORK_DIR/case-create.headers")"
  CASE_ID="$(json_get "$WORK_DIR/case-create.body" 'id')"
  printf 'case_create_status=%s\n' "$status"
  printf 'case_id=%s\n' "$CASE_ID"
  [[ "$status" == "201" ]] || fail "case creation failed"
  [[ -n "$CASE_ID" ]] || fail "case id missing after creation"
}

create_secure_link() {
  log "creating secure link"
  curl_json POST "$BASE_URL/api/discharge/cases/$CASE_ID/secure-link" "$WORK_DIR/secure-link.body" "$WORK_DIR/secure-link.headers" \
    -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"recipient_email\":\"$SMOKE_RECIPIENT_EMAIL\"}"

  local status
  status="$(http_status "$WORK_DIR/secure-link.headers")"
  SECURE_URL="$(json_get "$WORK_DIR/secure-link.body" 'url')"
  DELIVERY_STATUS="$(json_get "$WORK_DIR/secure-link.body" 'delivery_status')"
  printf 'secure_link_status=%s\n' "$status"
  printf 'secure_link_url=%s\n' "$SECURE_URL"
  printf 'secure_link_delivery_status=%s\n' "$DELIVERY_STATUS"
  [[ "$status" == "200" ]] || fail "secure link creation failed"
  [[ -n "$SECURE_URL" ]] || fail "secure link url missing"
}

fetch_secure_link_diagnostics() {
  log "fetching secure link diagnostics"
  curl_json GET "$BASE_URL/api/discharge/cases/$CASE_ID/secure-link/diagnostics" "$WORK_DIR/secure-diagnostics.body" "$WORK_DIR/secure-diagnostics.headers" \
    -b "$COOKIE_JAR"
  local status
  status="$(http_status "$WORK_DIR/secure-diagnostics.headers")"
  printf 'secure_link_diagnostics_status=%s\n' "$status"
  printf 'secure_link_diagnostics=%s\n' "$(cat "$WORK_DIR/secure-diagnostics.body")"
  [[ "$status" == "200" ]] || fail "secure link diagnostics failed"
}

submit_public_decision() {
  local token public_url
  public_url="$SECURE_URL"
  token="${public_url##*/}"
  [[ -n "$token" ]] || fail "could not derive secure-link token"

  log "opening public secure link"
  curl_json GET "$public_url" "$WORK_DIR/public-link.body" "$WORK_DIR/public-link.headers"
  printf 'public_link_status=%s\n' "$(http_status "$WORK_DIR/public-link.headers")"
  printf 'public_link_body=%s\n' "$(cat "$WORK_DIR/public-link.body")"

  log "submitting public refusal decision"
  curl_json POST "$BASE_URL/api/discharge/secure/$token/decision" "$WORK_DIR/public-decision.body" "$WORK_DIR/public-decision.headers" \
    -H 'Content-Type: application/json' \
    -d "{\"decision\":\"refuse\",\"typed_name\":\"$TYPED_NAME\",\"refusal_acknowledged\":true}"
  printf 'public_decision_status=%s\n' "$(http_status "$WORK_DIR/public-decision.headers")"
  printf 'public_decision_body=%s\n' "$(cat "$WORK_DIR/public-decision.body")"
}

fetch_case_artifacts() {
  log "fetching case documents"
  curl_json GET "$BASE_URL/api/cases/$CASE_ID/documents" "$WORK_DIR/case-documents.body" "$WORK_DIR/case-documents.headers" \
    -b "$COOKIE_JAR"
  printf 'case_documents_status=%s\n' "$(http_status "$WORK_DIR/case-documents.headers")"
  printf 'case_documents=%s\n' "$(cat "$WORK_DIR/case-documents.body")"

  log "fetching case audit log"
  curl_json GET "$BASE_URL/api/cases/$CASE_ID/audit-log" "$WORK_DIR/case-audit.body" "$WORK_DIR/case-audit.headers" \
    -b "$COOKIE_JAR"
  printf 'case_audit_status=%s\n' "$(http_status "$WORK_DIR/case-audit.headers")"
  printf 'case_audit=%s\n' "$(cat "$WORK_DIR/case-audit.body")"
}

main() {
  require_command curl
  require_command python3

  check_public_health
  check_public_email

  if tenant_login; then
    create_case
    create_secure_link
    fetch_secure_link_diagnostics
    submit_public_decision
    fetch_case_artifacts
  else
    log "tenant credentials not provided; skipped authenticated tenant smoke path"
    printf 'tenant_smoke_skipped=true\n'
  fi
}

main "$@"