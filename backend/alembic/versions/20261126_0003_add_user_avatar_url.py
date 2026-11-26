"""Add user avatar_url

Revision ID: 20261126_0003
Revises: 20261126_0002
Create Date: 2026-11-26 13:37:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261126_0003"
down_revision: str | None = "20261126_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
