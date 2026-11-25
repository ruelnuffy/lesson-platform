import json
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.models import Course, Enrollment, EnrollmentStatus, User
from app.schemas.payments import (
    EnrollmentResponse,
    PaymentInitRequest,
    PaymentInitResponse,
    PaymentVerifyResponse,
)
from app.security.deps import get_current_user
from app.services.access import has_active_paid_enrollment, now_utc
from app.services.payments import (
    PaymentGatewayError,
    PaymentProvider,
    get_payment_provider,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _verify_and_mark_paid(
    db: Session,
    enrollment: Enrollment,
    provider: PaymentProvider,
) -> Enrollment:
    """Idempotently verify a pending enrollment against the payment provider."""
    if enrollment.status == EnrollmentStatus.paid:
        return enrollment

    if not enrollment.paystack_reference:
        return enrollment

    result = provider.verify_transaction(enrollment.paystack_reference)
    if result.is_paid and result.amount_kobo >= enrollment.course.price_kobo:
        enrollment.status = EnrollmentStatus.paid
        enrollment.paid_at = now_utc()
        db.commit()
        db.refresh(enrollment)
    return enrollment


@router.post("/initialize", response_model=PaymentInitResponse)
def initialize_payment(
    body: PaymentInitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    provider: PaymentProvider = Depends(get_payment_provider),
) -> PaymentInitResponse:
    course = db.scalar(
        select(Course).where(Course.id == body.course_id, Course.is_active.is_(True))
    )
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if has_active_paid_enrollment(db, current_user.id, course.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active paid enrollment for this course",
        )

    settings = get_settings()
    reference = f"dl_{course.id}_{current_user.id}_{uuid.uuid4().hex[:12]}"
    callback_url = body.callback_url or f"{settings.frontend_origin}/checkout/callback"

    try:
        init_res = provider.initialize_transaction(
            email=current_user.email,
            amount_kobo=course.price_kobo,
            reference=reference,
            callback_url=callback_url,
            metadata={"user_id": current_user.id, "course_id": course.id},
        )
    except PaymentGatewayError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course.id,
        status=EnrollmentStatus.pending,
        paystack_reference=init_res.reference,
    )
    db.add(enrollment)
    db.commit()

    return PaymentInitResponse(
        authorization_url=init_res.authorization_url,
        access_code=init_res.access_code,
        reference=init_res.reference,
    )


@router.post("/webhook")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str | None = Header(default=None, alias="x-paystack-signature"),
    db: Session = Depends(get_db),
    provider: PaymentProvider = Depends(get_payment_provider),
) -> dict[str, str]:
    raw_body = await request.body()
    if not provider.verify_webhook_signature(raw_body, x_paystack_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        ) from exc

    event = payload.get("event")
    if event != "charge.success":
        return {"status": "ignored"}

    data = payload.get("data") or {}
    reference = data.get("reference")
    if not reference:
        return {"status": "ignored"}

    enrollment = db.scalar(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.paystack_reference == reference)
    )
    if not enrollment:
        return {"status": "ignored"}

    if enrollment.status == EnrollmentStatus.paid:
        return {"status": "already_processed"}

    try:
        _verify_and_mark_paid(db, enrollment, provider)
    except PaymentGatewayError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if enrollment.status == EnrollmentStatus.paid:
        return {"status": "processed"}
    return {"status": "not_verified"}


@router.get("/verify/{reference}", response_model=PaymentVerifyResponse)
def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    provider: PaymentProvider = Depends(get_payment_provider),
) -> PaymentVerifyResponse:
    enrollment = db.scalar(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(
            Enrollment.paystack_reference == reference,
            Enrollment.user_id == current_user.id,
        )
    )
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment reference not found")

    if enrollment.status == EnrollmentStatus.pending:
        try:
            _verify_and_mark_paid(db, enrollment, provider)
        except PaymentGatewayError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

    return PaymentVerifyResponse(
        reference=enrollment.paystack_reference or reference,
        status=enrollment.status,
        course_id=enrollment.course_id,
        paid_at=enrollment.paid_at,
    )


@router.get("/my-enrollments", response_model=list[EnrollmentResponse])
def my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Enrollment]:
    return list(
        db.scalars(
            select(Enrollment)
            .where(Enrollment.user_id == current_user.id)
            .order_by(Enrollment.created_at.desc(), Enrollment.id.desc())
        ).all()
    )
