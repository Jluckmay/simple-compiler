# Use official Python slim image
FROM python:3.12-slim

# Install Docker runtime dependencies (for container exec) – not needed inside container
# Install required packages
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY backend /app
WORKDIR /app

EXPOSE 5000
CMD ["python", "app.py"]
