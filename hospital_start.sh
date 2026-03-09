#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$ROOT_DIR/.runtime/logs"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

mkdir -p "$LOG_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

check_env_var() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing environment variable: $key" >&2
    exit 1
  fi
}

start_postgres() {
  echo "[1/6] Starting PostgreSQL service..."
  cd "$ROOT_DIR"
  docker compose up -d postgres

  echo "[2/6] Waiting for PostgreSQL readiness..."
  local attempts=0
  until docker exec wathiqcare-postgres pg_isready -U "${DB_USER:-postgres}" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ $attempts -ge 30 ]]; then
      echo "PostgreSQL did not become ready in time." >&2
      exit 1
    fi
    sleep 1
  done
}

init_backend_data() {
  echo "[3/6] Initializing and seeding backend database..."
  cd "$ROOT_DIR"
  python -m backend.init_db
  python -m backend.seed_data
}

start_backend() {
  echo "[4/6] Starting backend API on port $BACKEND_PORT..."
  if [[ -f "$BACKEND_PID_FILE" ]] && kill -0 "$(cat "$BACKEND_PID_FILE")" >/dev/null 2>&1; then
    echo "Backend already running with PID $(cat "$BACKEND_PID_FILE")."
  else
    nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port "$BACKEND_PORT" \
      >"$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  fi
}

start_frontend() {
  echo "[5/6] Starting frontend app on port $FRONTEND_PORT..."
  cd "$ROOT_DIR/frontend"
  npm run build >/dev/null

  if [[ -f "$FRONTEND_PID_FILE" ]] && kill -0 "$(cat "$FRONTEND_PID_FILE")" >/dev/null 2>&1; then
    echo "Frontend already running with PID $(cat "$FRONTEND_PID_FILE")."
  else
    nohup npm run start -- --port "$FRONTEND_PORT" >"$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  fi
}

health_check() {
  echo "[6/6] Running readiness checks..."
  sleep 2

  if ! curl -fsS "http://127.0.0.1:${BACKEND_PORT}/docs" >/dev/null; then
    echo "Backend health check failed. See $LOG_DIR/backend.log" >&2
    exit 1
  fi

  if ! curl -fsS "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null; then
    echo "Frontend health check failed. See $LOG_DIR/frontend.log" >&2
    exit 1
  fi
}

main() {
  require_cmd docker
  require_cmd python
  require_cmd npm
  require_cmd curl

  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
  fi

  check_env_var DATABASE_URL
  check_env_var JWT_SECRET_KEY

  start_postgres
  init_backend_data
  start_backend
  start_frontend
  health_check

  echo
  echo "Hospital runtime is ready."
  echo "Backend:  http://127.0.0.1:${BACKEND_PORT}"
  echo "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
  echo "Logs:     $LOG_DIR"
}

main "$@"
