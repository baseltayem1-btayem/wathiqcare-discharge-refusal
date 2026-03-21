FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies from both root and apps/api requirements files.
# Build context is the repo root when deployed via railway.toml dockerfilePath.
COPY requirements.txt /tmp/root-requirements.txt
COPY apps/api/requirements.txt /tmp/api-requirements.txt

RUN python -m pip install --upgrade pip && \
    pip install -r /tmp/root-requirements.txt && \
    pip install -r /tmp/api-requirements.txt

# Copy only the backend source (apps/api/) into the container root.
# No Node.js / Next.js artefacts are included.
COPY apps/api/ .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]