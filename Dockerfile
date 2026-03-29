FROM node:20-alpine

# Install build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# SQLite DB lives on a mounted volume at /data
ENV DB_PATH=/data/synthmed.db

EXPOSE 3000

CMD ["node", "server.js"]
