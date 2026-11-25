"""CLI command to trigger the daily lesson email job manually for testing.

Usage:
    python -m app.worker.send_daily_emails
    python -m app.worker.send_daily_emails --date 2026-11-25
"""

import argparse
from datetime import date
import json

from app.database import SessionLocal
from app.services.daily_email_job import run_daily_lesson_emails


def main() -> None:
    parser = argparse.ArgumentParser(description="Send daily lesson reminder emails.")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Target release date in YYYY-MM-DD format (defaults to today in TIMEZONE).",
    )
    args = parser.parse_args()
    target_date = date.fromisoformat(args.date) if args.date else None

    with SessionLocal() as db:
        summary = run_daily_lesson_emails(db, target_date=target_date)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
