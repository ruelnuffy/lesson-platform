# Daily Lessons

A full-stack daily learning web application with scheduled lesson unlocks (`Africa/Lagos` timezone), interactive quizzes, Paystack payments, automated morning reminder emails, and an admin dashboard.

## Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, Pydantic v2
- **Database:** PostgreSQL 16 (via Docker Compose)
- **Auth:** Email + password (bcrypt), JWT stored in an `httpOnly` cookie
- **Worker:** Separate container running APScheduler

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Start all services with Docker Compose:
   ```bash
   docker compose up --build
   ```

   - API: http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
   - Web: http://localhost:5173
   - PostgreSQL: `localhost:5432`

3. Run backend tests inside the API container:
   ```bash
   docker compose exec api pytest
   ```

4. Run database migrations manually (also runs automatically on `api` startup):
   ```bash
   docker compose exec api alembic upgrade head
   ```
