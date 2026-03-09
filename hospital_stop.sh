#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"

stop_pid_file() {
  local file="$1"
  local name="$2"

  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      echo "Stopped $name (PID $pid)."
    fi
    rm -f "$file"
  fi
}

main() {
  stop_pid_file "$BACKEND_PID_FILE" "backend"
  stop_pid_file "$FRONTEND_PID_FILE" "frontend"

  cd "$ROOT_DIR"
  docker compose stop postgres >/dev/null 2>&1 || true
  echo "Stopped PostgreSQL service."
}

main "$@"
