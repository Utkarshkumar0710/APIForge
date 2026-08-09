# APIForge Deployment Guide

## 1. Environment configuration
Create a production environment file at the project root named `.env` using the values from [.env.example](.env.example).

Required variables:
- `PORT` - The port your host exposes (for example Railway uses `PORT` automatically)
- `NODE_ENV=production`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `OPENWEATHER_API_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES`

## 2. Database
Import [database/schema.sql](database/schema.sql) into a MySQL instance before starting the backend.

## 3. Start command
For production hosts, start the backend with:

```bash
cd backend
npm start
```

The launcher script remains available for local development and will skip browser launching in production.

## 4. Railway deployment
1. Create a new Railway project and connect this repository.
2. Set the environment variables from `.env.example` in Railway.
3. Set the build/start command to:
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
4. Make sure the database service is reachable from the app service.

## 5. Health check
After deployment, verify:
- `GET /api/health`
- `GET /api/test-db`
