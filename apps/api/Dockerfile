FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Railway service rootDirectory = apps/api/, so the build context IS apps/api/.
# requirements.txt here == apps/api/requirements.txt (satisfies both installs).
COPY requirements.txt /tmp/requirements.txt

RUN python -m pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt

# Copy the entire apps/api/ tree (backend/, tests/, etc.).
# No Node.js / Next.js artefacts exist in this context.
COPY . .

# Make the entrypoint script executable.
# Railway may build this Dockerfile with context set to repo root,
# in which case start.sh ends up at /app/apps/api/start.sh.
RUN if [ -f /app/start.sh ]; then chmod +x /app/start.sh; \
    elif [ -f /app/apps/api/start.sh ]; then chmod +x /app/apps/api/start.sh; \
    else echo "start.sh not found" && exit 1; fi

EXPOSE 8000

# Use a shell script so $PORT is always expanded by /bin/sh,
# regardless of how Railway invokes the container CMD.
CMD ["sh", "-c", "if [ -f /app/start.sh ]; then exec /app/start.sh; else exec /app/apps/api/start.sh; fi"]