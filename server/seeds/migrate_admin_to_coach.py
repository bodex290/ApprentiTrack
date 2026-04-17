"""One-time migration: convert admin users to coach role and update CHECK constraint."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# 1. Update any admin users to coach
r = db.execute(text("UPDATE users SET role='coach' WHERE role='admin'"))
print(f"Updated {r.rowcount} admin user(s) to coach")
db.commit()

# 2. Recreate users table with updated CHECK constraint (SQLite workaround)
print("Rebuilding users table with new CHECK constraint...")
db.execute(text("PRAGMA foreign_keys=OFF"))
db.execute(text("""
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY,
    email VARCHAR NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    is_active BOOLEAN,
    must_change_password BOOLEAN,
    apprentice_id INTEGER REFERENCES apprentices(id),
    created_at DATETIME,
    CONSTRAINT ck_user_role CHECK (role IN ('coach', 'apprentice'))
)
"""))
db.execute(text("INSERT INTO users_new SELECT * FROM users"))
db.execute(text("DROP TABLE users"))
db.execute(text("ALTER TABLE users_new RENAME TO users"))
db.execute(text("CREATE UNIQUE INDEX ix_users_email ON users(email)"))
db.execute(text("CREATE INDEX ix_users_id ON users(id)"))
db.execute(text("PRAGMA foreign_keys=ON"))
db.commit()

rows = db.execute(text("SELECT id, email, role FROM users")).fetchall()
for row in rows:
    print(f"  {row[0]}: {row[1]} -> {row[2]}")

db.close()
print("Done.")
