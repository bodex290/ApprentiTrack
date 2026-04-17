"""Database connection and session configuration (SQLite)."""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Default to a local SQLite file next to this module
_default_db = "sqlite:///" + str(Path(__file__).resolve().parent / "app.db")
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

# For SQLite we need check_same_thread=False when used with FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Enable foreign-key enforcement and WAL mode for SQLite
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")     # Better concurrent reads/writes
        cursor.execute("PRAGMA synchronous=NORMAL;")   # Faster writes (still safe with WAL)
        cursor.execute("PRAGMA cache_size=-8000;")     # 8 MB page cache
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that yields a SQLAlchemy session and closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
