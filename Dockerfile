# syntax=docker/dockerfile:1
#
# Niveshaay office-opening RSVP — single image that serves the React app and the API.
#
#   docker build -t niveshaay-rsvp .
#   docker run -d --name rsvp --env-file .env -p 3000:3000 niveshaay-rsvp
#
# All settings (database, admin password, session secret) come from the environment;
# nothing is baked into the image. See .env.example for the full list.

# ---------- Stage 1: build the React app ----------
FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Python runtime ----------
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=3000

WORKDIR /app

# Python dependencies first so they are cached between code changes
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend code and the built frontend (served by the backend at /)
COPY backend/ backend/
COPY --from=frontend /build/dist frontend/dist

# Run as an unprivileged user
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app
WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.environ.get('PORT', '3000'), timeout=4)"]

CMD ["python", "run.py"]
