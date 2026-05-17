FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ .

# Data volume mount point
RUN mkdir -p /data

EXPOSE 5000

# Use gunicorn for production-style serving; falls back cleanly with OrbStack
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "main:app"]
