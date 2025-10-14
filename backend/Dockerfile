# Use Python 3.13 slim image
FROM python:3.13-slim

# Install FFmpeg and other system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Pipfile and Pipfile.lock from backend directory
COPY backend/Pipfile backend/Pipfile.lock ./

# Install Python dependencies
RUN pip install --no-cache-dir pipenv && \
    pipenv install --system --deploy

# Copy the backend application
COPY backend/ ./

# Copy frontend public assets (needed for video overlays)
# The backend code references these for video overlays  
COPY frontend/public ./frontend/public

# Expose port (Railway will set this via $PORT)
EXPOSE 8080

# Start command
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

