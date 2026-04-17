"""Seed the users and coach_cohorts tables.

Creates:
  1 admin  – admin@system.com / Admin123!
  4 coaches – lead.coach + dr.patel + ms.chen + mr.okafor / Coach123!
  5 apprentice users linked to existing apprentice records / Apprentice123!

All accounts have must_change_password=True so first login forces a password change.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from models.models import User, CoachCohort, Apprentice, Base
from auth import hash_password
from db.database import engine

# Ensure new tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clean existing data
db.query(CoachCohort).delete()
db.query(User).delete()
db.commit()

print("Creating users...")

# ── System Admin ───────────────────────────────────────
admin = User(
    email="admin@system.com",
    password_hash=hash_password("Admin123!"),
    role="admin",
    first_name="System",
    last_name="Admin",
    must_change_password=True,
)
db.add(admin)
db.flush()
print(f"  Admin: admin@system.com / Admin123!")

# ── Lead Coach ─────────────────────────────────────────
lead_coach = User(
    email="lead.coach@uni.ac.uk",
    password_hash=hash_password("Coach123!"),
    role="coach",
    first_name="Lead",
    last_name="Coach",
    must_change_password=True,
)
db.add(lead_coach)
db.flush()
# Lead coach sees all cohorts
db.add(CoachCohort(user_id=lead_coach.id, cohort_id=1))
db.add(CoachCohort(user_id=lead_coach.id, cohort_id=2))
print(f"  Coach (lead): lead.coach@uni.ac.uk / Coach123!  → cohorts [1, 2]")

# ── Coaches ────────────────────────────────────────────
coaches_data = [
    {"email": "dr.patel@uni.ac.uk",  "first": "Dr.",  "last": "Patel",  "cohort_ids": [1, 2]},
    {"email": "ms.chen@uni.ac.uk",   "first": "Ms.",  "last": "Chen",   "cohort_ids": [1]},
    {"email": "mr.okafor@uni.ac.uk", "first": "Mr.",  "last": "Okafor", "cohort_ids": [2]},
]

for c in coaches_data:
    coach = User(
        email=c["email"],
        password_hash=hash_password("Coach123!"),
        role="coach",
        first_name=c["first"],
        last_name=c["last"],
        must_change_password=True,
    )
    db.add(coach)
    db.flush()
    for cid in c["cohort_ids"]:
        db.add(CoachCohort(user_id=coach.id, cohort_id=cid))
    print(f"  Coach: {c['email']} / Coach123!  → cohorts {c['cohort_ids']}")

# ── Apprentice Users ───────────────────────────────────
apprentices = db.query(Apprentice).all()
for a in apprentices:
    user = User(
        email=a.email,
        password_hash=hash_password("Apprentice123!"),
        role="apprentice",
        first_name=a.first_name,
        last_name=a.last_name,
        apprentice_id=a.id,
        must_change_password=True,
    )
    db.add(user)
    print(f"  Apprentice: {a.email} / Apprentice123!  → apprentice_id={a.id}")

db.commit()
db.close()

print("\n✓ All users seeded successfully!")
print("  Everyone must change password on first login.")
