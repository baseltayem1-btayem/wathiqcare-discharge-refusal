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

echo "Starting backend-nest dependencies (PostgreSQL, Redis, MinIO)..."
docker compose -f "$BACKEND_COMPOSE_FILE" up -d postgres redis minio minio-init

echo "Starting backend-nest API..."
docker compose -f "$BACKEND_COMPOSE_FILE" up -d api

echo "Backend API: http://localhost:4000/api"
echo "Swagger docs: http://localhost:4000/api/docs"

if [[ "$MODE" == "api-only" ]]; then
	echo "API stack started."
	exit 0
fi

echo "Starting frontend dev server..."
cd "$ROOT_DIR/frontend"
npm run dev
