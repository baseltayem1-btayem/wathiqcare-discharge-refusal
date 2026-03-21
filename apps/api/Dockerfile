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

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]