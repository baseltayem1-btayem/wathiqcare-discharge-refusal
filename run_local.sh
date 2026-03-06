#!/usr/bin/env bash
set -e

echo "Starting PostgreSQL..."
docker compose up -d

echo "Waiting for PostgreSQL..."
sleep 5

echo "Initializing database..."
python -m backend.init_db

echo "Seeding initial data..."
python -m backend.seed_data

echo "Starting API server..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
