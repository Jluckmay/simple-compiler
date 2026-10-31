# Use official Python slim image
FROM python:3.12-slim

# Install language interpreters and compilers for direct execution (no Docker-in-Docker needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    openjdk-21-jdk \
    nodejs \
    npm \
    lua5.4 \
    golang-go \
    r-base \
    sqlite3 \
    texlive-latex-base \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g ts-node

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY backend /app
WORKDIR /app

EXPOSE 5000
CMD ["python", "app.py"]
