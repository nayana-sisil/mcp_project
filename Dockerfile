# ---- Stage 1: build the Next.js frontend ----
FROM node:20-alpine AS frontend

WORKDIR /build

# Cache deps
COPY mcp_studio/frontend/package.json mcp_studio/frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund --loglevel=error

# Build
COPY mcp_studio/frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ---- Stage 2: Python runtime ----
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/data/.cache/huggingface \
    WORKSPACE_DIR=/data/workspace \
    PORT=7860

WORKDIR /app

# System dependencies (build-essential for any wheels that need compiling)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Python dependencies (layer-cached when only source changes)
COPY pyproject.toml uv.lock* ./
RUN pip install --upgrade pip \
 && pip install -e .

# Application source
COPY mcp_studio ./mcp_studio
COPY main.py ./main.py

# Pre-built frontend
COPY --from=frontend /build/out ./mcp_studio/frontend/out

# Seed the workspace into the persistent volume on first boot
COPY mcp_studio/backend/workspace /seed_workspace
RUN mkdir -p /data/workspace \
 && [ -z "$(ls -A /data/workspace 2>/dev/null || true)" ] && cp -r /seed_workspace/. /data/workspace/ || true

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:7860/api/health || exit 1

CMD ["python", "-m", "uvicorn", "mcp_studio.backend.app:create_app", \
     "--factory", "--host", "0.0.0.0", "--port", "7860", "--log-level", "info"]
