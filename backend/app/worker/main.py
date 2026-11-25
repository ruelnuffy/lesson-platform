import logging
import signal
import sys
from zoneinfo import ZoneInfo

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("daily_lessons.worker")


def daily_lesson_email_placeholder() -> None:
    logger.info("Daily lesson email job triggered (implementation scheduled in later phase).")


def main() -> None:
    settings = get_settings()
    tz = ZoneInfo(settings.timezone)
    scheduler = BlockingScheduler(timezone=tz)

    scheduler.add_job(
        daily_lesson_email_placeholder,
        trigger=CronTrigger(
            hour=settings.daily_email_hour,
            minute=settings.daily_email_minute,
            timezone=tz,
        ),
        id="daily_lesson_emails",
        replace_existing=True,
    )

    def _shutdown(signum: int, _frame: object) -> None:
        logger.info("Received signal %s; shutting down scheduler...", signum)
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    logger.info(
        "Worker started. Daily email job scheduled at %02d:%02d (%s).",
        settings.daily_email_hour,
        settings.daily_email_minute,
        settings.timezone,
    )
    scheduler.start()


if __name__ == "__main__":
    main()
