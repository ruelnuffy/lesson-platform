from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enrollment import EnrollmentStatus


class PaymentInitRequest(BaseModel):
    course_id: int
    callback_url: str | None = None


class PaymentInitResponse(BaseModel):
    authorization_url: str
    access_code: str
    reference: str


class PaymentVerifyResponse(BaseModel):
    reference: str
    status: EnrollmentStatus
    course_id: int
    paid_at: datetime | None = None


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    status: EnrollmentStatus
    paid_at: datetime | None = None
    expires_at: datetime | None = None
    paystack_reference: str | None = None
    created_at: datetime
