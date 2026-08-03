# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim AS runtime

# System dependencies
# curl+unzip are only needed to install Deno below; purged afterward.
# Deno is yt-dlp's JS runtime for solving YouTube's signature/n-parameter
# challenges — without it, signature-protected formats silently disappear
# and only unprotected ones (e.g. storyboard images) remain selectable,
# which surfaces as "Requested format is not available".
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    unzip \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && apt-get purge -y --auto-remove curl unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ ./

# Copy built frontend into backend/static
COPY --from=frontend-build /backend/static ./static

# Create runtime directories
RUN mkdir -p /app/data/db /app/cookies /tmp/musicfinder /music

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
