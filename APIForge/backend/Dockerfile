FROM node:22-alpine

WORKDIR /app

COPY APIForge/backend/package*.json ./

RUN npm ci --omit=dev

COPY APIForge/backend/ ./

COPY APIForge/frontend/ /frontend/

EXPOSE 8080

CMD ["node", "server.js"]