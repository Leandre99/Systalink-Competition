# Base Node.js image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package.json tsconfig.json vite.config.ts ./
COPY shared ./shared
COPY server ./server
COPY src ./src
COPY public ./public

# Install dependencies and build
RUN npm install
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

EXPOSE 3001
EXPOSE 5173

ENV NODE_ENV=production
ENV DEMO_MODE=true

CMD ["npm", "run", "dev"]
