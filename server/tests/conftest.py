"""Shared test fixtures — in-memory SQLite DB + FastAPI TestClient."""

import sys, os

# Ensure the server package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from db.database import Base, get_db
from auth import hash_password, create_access_token
from models.models import (
    User, Cohort, Apprentice, Module, Assessment, KSB,
    EvidenceSubmission, SubmissionKSB, CoachFeedback, InterventionFlag,
    CoachCohort, ModuleKSB,
)
from main import app

# ── In-memory test database ─────────────────────────────
TEST_ENGINE = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})


@event.listens_for(TEST_ENGINE, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


TestSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


# ── Fixtures ────────────────────────────────────────────

@pytest.fixture(autouse=True)
def db():
    """Create fresh tables for every test.

    Uses a single connection + nested transaction (SAVEPOINT) so that both the
    test fixtures and the FastAPI endpoint code share the same transactional
    context on the in-memory SQLite database.
    """
    Base.metadata.create_all(bind=TEST_ENGINE)
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def override_get_db(db):
    """Override FastAPI's get_db dependency to use the test session."""
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    """FastAPI TestClient (synchronous)."""
    return TestClient(app, raise_server_exceptions=False)


# ── Seed helpers ────────────────────────────────────────

@pytest.fixture()
def seed_cohort(db):
    """Create a single cohort and return it."""
    from datetime import date
    cohort = Cohort(name="Cohort A", programme="L6 Digital", start_date=date(2025, 9, 1))
    db.add(cohort)
    db.commit()
    db.refresh(cohort)
    return cohort


@pytest.fixture()
def seed_coach(db, seed_cohort):
    """Create a coach user linked to the test cohort."""
    coach = User(
        email="coach@test.com",
        password_hash=hash_password("Coach123!"),
        role="coach",
        first_name="Test",
        last_name="Coach",
        must_change_password=False,
    )
    db.add(coach)
    db.commit()
    db.refresh(coach)
    # Assign to test cohort
    db.add(CoachCohort(user_id=coach.id, cohort_id=seed_cohort.id))
    db.commit()
    return coach


@pytest.fixture()
def seed_apprentice(db, seed_cohort):
    """Create an apprentice record + matching user account."""
    apprentice = Apprentice(
        first_name="Test",
        last_name="Apprentice",
        email="apprentice@test.com",
        cohort_id=seed_cohort.id,
        employer="Acme Ltd",
    )
    db.add(apprentice)
    db.commit()
    db.refresh(apprentice)

    user = User(
        email="apprentice@test.com",
        password_hash=hash_password("Test1234!"),
        role="apprentice",
        first_name="Test",
        last_name="Apprentice",
        apprentice_id=apprentice.id,
        must_change_password=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"apprentice": apprentice, "user": user}


@pytest.fixture()
def seed_ksbs(db):
    """Create a small set of KSBs."""
    items = [
        KSB(code="K1", type="Knowledge", description="Data structures and algorithms"),
        KSB(code="S1", type="Skill", description="Write clean, testable code"),
        KSB(code="B1", type="Behaviour", description="Communicate effectively with stakeholders"),
    ]
    db.add_all(items)
    db.commit()
    for k in items:
        db.refresh(k)
    return items


@pytest.fixture()
def seed_module(db):
    """Create a single module with one assessment."""
    mod = Module(code="IOT552U", title="IoT Systems", credits=20)
    db.add(mod)
    db.commit()
    db.refresh(mod)
    assess = Assessment(module_id=mod.id, title="Portfolio CW1")
    db.add(assess)
    db.commit()
    db.refresh(assess)
    return {"module": mod, "assessment": assess}


# ── Auth helpers ────────────────────────────────────────

@pytest.fixture()
def coach_token(seed_coach):
    """JWT token for the test coach."""
    return create_access_token({"sub": str(seed_coach.id), "role": "coach"})


@pytest.fixture()
def apprentice_token(seed_apprentice):
    """JWT token for the test apprentice."""
    return create_access_token({"sub": str(seed_apprentice["user"].id), "role": "apprentice"})


def auth_header(token: str) -> dict:
    """Return headers dict with Authorization bearer token."""
    return {"Authorization": f"Bearer {token}"}
