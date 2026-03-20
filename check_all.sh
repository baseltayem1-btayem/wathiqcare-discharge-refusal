#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="full"

if [[ "${1:-}" == "--quick" ]]; then
  MODE="quick"
elif [[ -n "${1:-}" ]]; then
  echo "Unknown option: $1"
  echo "Usage: ./check_all.sh [--quick]"
  exit 1
fi

if ! command -v pytest >/dev/null 2>&1; then
  echo "Error: pytest is not installed."
  echo "Run: pip install -r requirements.txt"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

echo "==> Running backend tests (pytest)"
cd "$ROOT_DIR/apps/api"
pytest -q

echo "==> Running frontend lint"
cd "$ROOT_DIR/apps/web"
npm run lint

if [[ "$MODE" == "full" ]]; then
  echo "==> Running frontend production build"
  npm run build
else
  echo "==> Quick mode enabled, skipping frontend build"
fi

echo "All checks passed."
