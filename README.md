# Niveshaay — Office Opening RSVP

Invitation page with an RSVP form, PostgreSQL storage, and a password-protected admin page that lists every response.

- **Frontend:** React 19 + Vite (`frontend/`)
- **Backend:** Python 3.12+ / FastAPI + psycopg (`backend/`)
- **Database:** PostgreSQL, schema `rvsp`, table `rvsp.rsvps` (created automatically on first start)

## First-time setup

```bash
# 1. Python backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. React frontend
cd ../frontend
npm install
npm run build          # writes frontend/dist, which the backend serves
```

All settings live in `.env` at the project root (copy `.env.example`; never commit the real file).

## Run

```bash
cd backend
.venv/bin/python run.py
```

- Invitation: http://localhost:3000
- Admin guest list: http://localhost:3000/admin  (password = `ADMIN_PASSWORD` from `.env`)

The port comes from `PORT` in `.env` (default 3000).

### Frontend development with live reload

```bash
cd frontend
npm run dev            # http://localhost:5173, proxies /api to the backend on :3000
```

Run `npm run build` again before deploying so the backend serves the latest build.

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_DATABASE`, `DB_SCHEMA` | PostgreSQL connection |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `SESSION_SECRET` | Signs the admin session cookie (32+ random chars) |
| `SESSION_HOURS` | Admin sign-in lifetime (default 12) |
| `PORT` | HTTP port (default 3000) |
| `TRUST_PROXY=true` | Set when behind nginx / a load balancer so rate limits see real client IPs |
| `COOKIE_SECURE=true` | Set when served over HTTPS |
| `DB_SSL` | `require` (default) or `disable` for a local database without TLS |
| `DB_SSL_CA` | Optional CA bundle path for full TLS verification of the database |

## How RSVPs are stored

One row per phone number in `rvsp.rsvps` (`name`, `phone`, `party_size` 1–5, `travelling`, `created_at`, `updated_at`).
Submitting again with the same number updates the existing row. "Change my RSVP" on the guest's device
re-opens the form with their previous answers; if they change their number the row is moved, not duplicated.

## Admin page

Sign in at `/admin`. You can search, refresh, download a CSV, and remove an entry.
Sign-in attempts are rate-limited (10 per 15 minutes per IP); sessions last 12 hours.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/rsvp` | – | Submit or change an RSVP |
| POST | `/api/admin/login` | – | Sign in (sets an HttpOnly cookie) |
| POST | `/api/admin/logout` | – | Sign out |
| GET | `/api/admin/session` | – | `{ "authenticated": bool }` |
| GET | `/api/admin/rsvps` | admin | Guest list + stats |
| GET | `/api/admin/rsvps.csv` | admin | CSV download |
| DELETE | `/api/admin/rsvps/{id}` | admin | Remove an entry |
| GET | `/api/health` | – | Database check |

## Project layout

```
backend/
  run.py              start the server
  requirements.txt
  app/config.py       reads .env (no hard-coded credentials)
  app/db.py           connection pool, schema setup, queries
  app/auth.py         admin password check, signed session cookie, rate limiting
  app/main.py         API routes + serves the built React app
frontend/
  src/pages/InvitePage.jsx    invitation + RSVP
  src/pages/AdminPage.jsx     admin sign-in + guest list
  src/components/RsvpForm.jsx
  src/styles.css              AIF-deck look (olive / butter / gold)
  public/logo.png, logo-wordmark.png
```
