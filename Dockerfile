FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python ML dependencies first (cached layer)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node dependencies (cached layer)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy source files
COPY backend/ ./backend/
COPY ml-module/ ./ml-module/
COPY dataset/processed/features_dataset.csv ./dataset/processed/features_dataset.csv

ENV PORT=5000
ENV PYTHON_BIN=python3
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
