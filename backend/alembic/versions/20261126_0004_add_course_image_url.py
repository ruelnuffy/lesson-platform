"""Add course image_url

Revision ID: 20261126_0004
Revises: 20261126_0003
Create Date: 2026-11-26 14:33:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261126_0004"
down_revision: str | None = "20261126_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("image_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "image_url")
