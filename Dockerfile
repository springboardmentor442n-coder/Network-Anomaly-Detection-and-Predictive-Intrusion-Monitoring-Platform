# NetShield AI - backend image
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Build deps for scientific wheels, removed in the same layer.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install "psycopg2-binary>=2.9" "reportlab>=4.0"

COPY backend ./backend
COPY docs ./docs
COPY data ./data

# Models and dataset are mounted at runtime - they are large and not baked in.
RUN mkdir -p /app/models /app/CICIDS2017_improved

# Run as a non-root user.
RUN useradd --create-home --uid 10001 netshield \
    && chown -R netshield:netshield /app
USER netshield

ENV NETSHIELD_DATA_ROOT=/app \
    NETSHIELD_MODEL_ROOT=/app/models

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
