from datetime import datetime

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Review, User
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


class ReviewCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    role_label: str = Field(default="", max_length=120)
    comment: str = Field(min_length=5, max_length=600)


class ReviewResponse(BaseModel):
    id: int
    user_name: str
    role_label: str
    rating: int
    comment: str
    created_at: datetime


@router.get("", response_model=list[ReviewResponse])
def list_reviews(db: Session = Depends(get_db)) -> list[ReviewResponse]:
    rows = list(
        db.scalars(
            select(Review)
            .options(selectinload(Review.user))
            .order_by(Review.created_at.desc(), Review.id.desc())
            .limit(30)
        ).all()
    )
    return [
        ReviewResponse(
            id=r.id,
            user_name=r.user.name,
            role_label=r.role_label,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    body: ReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReviewResponse:
    review = Review(
        user_id=current_user.id,
        rating=body.rating,
        role_label=body.role_label.strip(),
        comment=body.comment.strip(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewResponse(
        id=review.id,
        user_name=current_user.name,
        role_label=review.role_label,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )
