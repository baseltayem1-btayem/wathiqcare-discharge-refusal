#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_COMPOSE_FILE="$ROOT_DIR/backend-nest/docker-compose.yml"
MODE="full"

if [[ "${1:-}" == "--api-only" ]]; then
	MODE="api-only"
elif [[ -n "${1:-}" ]]; then
	echo "Unknown option: $1"
	echo "Usage: ./run_local.sh [--api-only]"
	exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
	echo "Error: docker is not installed."
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "Error: npm is not installed."
	exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
	echo "Error: curl is not installed."
	exit 1
fi

BACKEND_HEALTH_URL="http://127.0.0.1:4000/api/health/ready"

wait_for_backend() {
	local max_attempts=30
	local attempt=1

	echo "Waiting for backend-nest API readiness at $BACKEND_HEALTH_URL ..."
	until curl -fsS "$BACKEND_HEALTH_URL" >/dev/null 2>&1; do
		if (( attempt >= max_attempts )); then
			echo "Error: backend-nest API did not become ready in time."
			return 1
		fi

		echo "Backend not ready yet (attempt $attempt/$max_attempts). Retrying..."
		attempt=$((attempt + 1))
		sleep 2
	done

	echo "Backend-nest API is ready."
}

echo "Starting backend-nest dependencies (PostgreSQL, Redis, MinIO)..."
docker compose -f "$BACKEND_COMPOSE_FILE" up -d postgres redis minio minio-init

echo "Starting backend-nest API..."
docker compose -f "$BACKEND_COMPOSE_FILE" up -d api

wait_for_backend

echo "Backend API: http://localhost:4000/api"
echo "Swagger docs: http://localhost:4000/api/docs"

if [[ "$MODE" == "api-only" ]]; then
	echo "API stack started."
	exit 0
fi

echo "Starting frontend dev server..."
cd "$ROOT_DIR/frontend"
export BACKEND_NEST_API_BASE_URL="${BACKEND_NEST_API_BASE_URL:-http://127.0.0.1:4000}"
export NEXT_PUBLIC_API_PREFIX="${NEXT_PUBLIC_API_PREFIX:-/api/nest}"
export NEXT_PUBLIC_API_TIMEOUT_MS="${NEXT_PUBLIC_API_TIMEOUT_MS:-20000}"
npm run dev
