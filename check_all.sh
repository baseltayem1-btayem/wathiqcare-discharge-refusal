#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="full"
RUN_LEGACY_PYTHON=false

usage() {
  echo "Usage: ./check_all.sh [--quick] [--with-legacy-python]"
}

for arg in "$@"; do
  case "$arg" in
    --quick)
      MODE="quick"
      ;;
    --with-legacy-python)
      RUN_LEGACY_PYTHON=true
      ;;
    *)
      echo "Unknown option: $arg"
      usage
      exit 1
      ;;
  esac
done

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

echo "==> Running backend-nest build"
cd "$ROOT_DIR/backend-nest"
npm run build

echo "==> Running backend-nest tests"
npm test -- --runInBand

echo "==> Running frontend lint"
cd "$ROOT_DIR/frontend"
npm run lint

if [[ "$MODE" == "full" ]]; then
  echo "==> Running frontend production build"
  npm run build
else
  echo "==> Quick mode enabled, skipping frontend build"
fi

if [[ "$RUN_LEGACY_PYTHON" == "true" ]]; then
  echo "==> Running legacy Python backend tests"
  if ! command -v pytest >/dev/null 2>&1; then
    echo "Error: pytest is not installed."
    echo "Run: pip install -r requirements.txt"
    exit 1
  fi
  cd "$ROOT_DIR"
  pytest -q
fi

echo "All checks passed."
