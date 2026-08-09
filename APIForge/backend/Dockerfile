FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm ci --omit=dev

WORKDIR /app

COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 8080

CMD ["node", "backend/server.js"]