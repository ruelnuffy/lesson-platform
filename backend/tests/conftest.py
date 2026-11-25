from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import login_rate_limiter
from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    settings = get_settings()
    if settings.database_url.startswith("postgresql"):
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        connection = engine.connect()
        transaction = connection.begin()
        TestingSessionLocal = sessionmaker(
            bind=connection,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
            if transaction.is_active:
                transaction.rollback()
            connection.close()
            engine.dispose()
    else:
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(
            bind=engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
            Base.metadata.drop_all(bind=engine)
            engine.dispose()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    login_rate_limiter.reset()

    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    login_rate_limiter.reset()
