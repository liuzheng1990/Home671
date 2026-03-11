import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app, seed_default_tags
from app.database import get_db, Base

SQLITE_URL = "sqlite:///:memory:"


def _make_engine():
    # StaticPool: all threads share the same connection so the in-memory DB
    # is accessible from FastAPI's worker threads.
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    return engine


@pytest.fixture()
def db_session():
    engine = _make_engine()
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _make_client(db_session, raise_server_exceptions=True):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app, raise_server_exceptions=raise_server_exceptions)


@pytest.fixture()
def client(db_session):
    """TestClient without context manager — skips startup_event (which uses the real DB)."""
    yield _make_client(db_session)
    app.dependency_overrides.clear()


@pytest.fixture()
def lenient_client(db_session):
    """Client that returns 500 responses instead of re-raising server exceptions."""
    yield _make_client(db_session, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_client(db_session):
    """Client with all 6 default tags pre-seeded into the test DB."""
    seed_default_tags(db_session)
    yield _make_client(db_session)
    app.dependency_overrides.clear()
