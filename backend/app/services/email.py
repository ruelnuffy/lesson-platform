from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
import smtplib

from app.config import get_settings


class EmailSendError(Exception):
    pass


class EmailSender(ABC):
    @abstractmethod
    def send_email(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
    ) -> None:
        raise NotImplementedError


class SMTPEmailSender(EmailSender):
    def __init__(
        self,
        host: str,
        port: int,
        username: str = "",
        password: str = "",
        use_tls: bool = True,
        from_addr: str = "Daily Lessons <no-reply@example.com>",
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.from_addr = from_addr

    def send_email(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
    ) -> None:
        if not self.host:
            raise EmailSendError("SMTP_HOST is not configured")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = to_email
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.sendmail(self.from_addr, [to_email], msg.as_string())
        except Exception as exc:
            raise EmailSendError(f"SMTP send failed: {exc}") from exc


def get_email_sender() -> EmailSender:
    settings = get_settings()
    return SMTPEmailSender(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        use_tls=settings.smtp_use_tls,
        from_addr=settings.email_from,
    )


def render_daily_lesson_email(
    *,
    user_name: str,
    lesson_title: str,
    day_number: int,
    lesson_url: str,
) -> tuple[str, str, str]:
    subject = f"Your lesson for today is ready — Day {day_number}: {lesson_title}"

    text_body = (
        f"Hi {user_name},\n\n"
        f"Your lesson for today is ready!\n\n"
        f"Day {day_number}: {lesson_title}\n"
        f"Open today's lesson: {lesson_url}\n\n"
        f"Keep your streak going!\n"
        f"— Daily Lessons\n"
    )

    safe_name = escape(user_name)
    safe_title = escape(lesson_title)
    safe_url = escape(lesson_url, quote=True)

    html_body = f"""<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; border:1px solid #e2e8f0; padding:32px;">
      <p style="margin:0 0 8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#4f46e5;">
        Day {day_number} Unlocked
      </p>
      <h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; color:#0f172a;">
        Your lesson for today is ready
      </h1>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#334155;">
        Hi {safe_name},
      </p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#334155;">
        Today's lesson <strong>{safe_title}</strong> is now unlocked and waiting for you.
      </p>
      <a href="{safe_url}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 24px; border-radius:8px;">
        Start Today's Lesson
      </a>
      <p style="margin:24px 0 0; font-size:13px; color:#64748b;">
        Or copy this link into your browser: <a href="{safe_url}" style="color:#4f46e5;">{safe_url}</a>
      </p>
    </div>
  </body>
</html>
"""
    return subject, html_body, text_body


def render_password_reset_email(
    *,
    user_name: str,
    reset_url: str,
) -> tuple[str, str, str]:
    subject = "Reset your Daily Lessons password"

    text_body = (
        f"Hi {user_name},\n\n"
        f"We received a request to reset your Daily Lessons password.\n"
        f"Use the link below within 30 minutes to choose a new password:\n\n"
        f"{reset_url}\n\n"
        f"If you did not request this, you can safely ignore this email.\n"
        f"— Daily Lessons\n"
    )

    safe_name = escape(user_name)
    safe_url = escape(reset_url, quote=True)

    html_body = f"""<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f7f7f5; padding:24px; color:#18181b;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; padding:32px; box-shadow: 0 8px 24px rgba(15,23,42,0.08);">
      <p style="margin:0 0 8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#2563eb;">
        Daily Lessons
      </p>
      <h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; color:#18181b;">
        Reset your password
      </h1>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#3f3f46;">
        Hi {safe_name},
      </p>
      <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#3f3f46;">
        Click the button below to set a new password. This link expires in 30 minutes.
      </p>
      <a href="{safe_url}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 24px; border-radius:10px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0; font-size:13px; color:#71717a;">
        If you didn&apos;t request a password reset, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
"""
    return subject, html_body, text_body
