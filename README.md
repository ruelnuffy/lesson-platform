# Daily Lessons

A full-stack "daily lessons" learning web application with scheduled lesson unlocks (`Africa/Lagos` timezone), server-graded interactive quizzes, Paystack checkout & webhooks, automated morning reminder emails in a dedicated worker container, and a role-guarded admin dashboard.

## Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, Pydantic v2
- **Database:** PostgreSQL 16 (Docker Compose)
- **Auth:** Email + password (`bcrypt`), JWT access token in `httpOnly` cookie, rate-limited login & quiz submit
- **Payments:** Paystack behind a swappable `PaymentProvider` interface, HMAC-SHA512 webhook verification + server-side transaction verification + idempotency
- **Email & Worker:** SMTP (HTML + plain-text templates) + APScheduler running in a separate `worker` container at `06:30 Africa/Lagos` (configurable)

## Quick Start

1. **Create `.env` from the template:**
   ```bash
   cp .env.example .env
   ```
   Fill in `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, and SMTP credentials when testing live payments or emails.

2. **Start all services (`postgres`, `api`, `worker`, `web`):**
   ```bash
   docker compose up --build
   ```
   - Web app: http://localhost:5173
   - FastAPI API: http://localhost:8000 (OpenAPI docs: http://localhost:8000/docs)
   - PostgreSQL: `localhost:5432`

3. **Seed sample data (admin, demo student, 1 course, 7 daily lessons, 7 quizzes):**
   ```bash
   docker compose exec api python -m app.seed
   ```
   Default seeded accounts:
   - **Admin:** `admin@dailylessons.local` / `AdminPass123!`
   - **Paid Student:** `student@dailylessons.local` / `StudentPass123!`

## Running Tests

Run the full backend test suite (access gating, server-side quiz grading, Paystack webhook idempotency, daily email job idempotency & retries, auth, and admin API):

```bash
docker compose exec api pytest -v
```

Run the frontend TypeScript check and production build:

```bash
docker compose exec web npm run build
```

## Triggering the Morning Email Job Manually

The worker container runs the daily email job automatically at `06:30 Africa/Lagos` (`DAILY_EMAIL_HOUR` / `DAILY_EMAIL_MINUTE` / `TIMEZONE`). To trigger it manually for testing:

```bash
docker compose exec worker python -m app.worker.send_daily_emails
# Or for a specific date:
docker compose exec worker python -m app.worker.send_daily_emails --date 2026-11-25
```

## Database Migrations

Migrations run automatically when the `api` container starts. To run or create migrations manually:

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic revision --autogenerate -m "describe change"
```
