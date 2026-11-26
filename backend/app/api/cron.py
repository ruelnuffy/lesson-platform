from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.daily_email_job import run_daily_lesson_emails

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.get("/daily-emails")
@router.post("/daily-emails")
def cron_daily_emails(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    settings = get_settings()
    if settings.cron_secret:
        expected = f"Bearer {settings.cron_secret}"
        if authorization != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid cron secret",
            )
    return run_daily_lesson_emails(db)
