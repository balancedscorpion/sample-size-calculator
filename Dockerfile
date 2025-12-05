# Multi-stage Dockerfile for A/B Test Power Calculator
# Builds both frontend and backend into a single container

# ============================================
# Stage 1: Build the frontend
# ============================================
FROM node:25-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build the frontend (set API URL to same origin for production)
ENV VITE_API_BASE_URL=""
RUN npm run build

# ============================================
# Stage 2: Python backend with frontend static files
# ============================================
FROM python:3.11-slim AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Copy backend dependency files
COPY backend/pyproject.toml backend/poetry.lock ./

# Install Python dependencies (without dev dependencies)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only main

# Copy backend source code
COPY backend/app ./app

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./static

# Copy production server script
COPY server.py ./

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/docs || exit 1

# Run the application
CMD ["python", "server.py"]
