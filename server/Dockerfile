FROM node:18-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production

# Install minimal system deps (certs, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app sources
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
