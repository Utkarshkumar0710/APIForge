# APIForge

Real-Time API Integration & Usage Platform

Founder & Developer: Utkarsh Kumar

This repository implements a complete individual college project: APIForge. It provides user registration, login (JWT cookie), developer API keys, a developer weather API that proxies OpenWeather, usage tracking, invoice generation (PDF), and email sending (Nodemailer). A responsive frontend is included.

Folder structure
 - `frontend/` — static website (landing, register, login, dashboard, invoices)
 - `backend/` — Express server and API
 - `database/schema.sql` — MySQL schema and seeds
 - `invoices/` — generated invoice PDFs

Key backend endpoints
 - `POST /api/auth/register` — register user
 - `POST /api/auth/login` — login (sets httpOnly cookie)
 - `POST /api/auth/logout` — logout (clears cookie)
 - `GET /api/auth/me` — returns current user (requires cookie)
 - `GET /api/v1/weather?city=City` — developer API; requires header `X-API-Key`
 - `POST /api/dashboard/weather` — dashboard fetch (requires cookie)
 - `GET /api/demo?city=City` — public demo using server OpenWeather key
 - `POST /api/invoices/generate` — generate invoice (requires cookie)
 - `GET /api/invoices` — list invoices for user
 - `GET /api/invoices/:id/download` — download invoice PDF

Security notes
 - Passwords are hashed with `bcrypt`.
 - JWT secret and OpenWeather & SMTP credentials must be set in `.env`.
 - JWT is stored in an HTTP-only cookie.
 - API keys are generated securely using `crypto` and stored server-side.

Next steps to run locally are in the MANUAL SETUP REQUIRED section below.
