# ============================================================================
# Dockerfile - EV Charging Service
# ============================================================================

# parking-management-system/services/charging-service/Dockerfile

# Stage 1: Build
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    python3-dev \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY requirements.txt requirements.prod.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.prod.txt

# Copy application code
COPY . .

# Run tests
RUN pip install -r requirements.dev.txt && \
    pytest tests/ -v && \
    pip uninstall -y -r requirements.dev.txt

# Build the application (if needed)
# RUN python setup.py build

# Stage 2: Production
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Set timezone
ENV TZ=UTC

# Create app user
RUN groupadd -r charging && useradd -r -g charging charging

# Set working directory
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=charging:charging . .

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/temp /app/uploads \
    && chown -R charging:charging /app

# Switch to charging user
USER charging

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SERVICE_NAME=charging-service

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# Expose port
EXPOSE 8003

# Start application
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]