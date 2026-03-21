#!/bin/sh
# start.sh — entrypoint for Railway deployment.
# Using a shell script guarantees $PORT is expanded by the shell,
# even when Railway does not wrap the CMD in /bin/sh -c.
set -e
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
