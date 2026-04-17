"""
ApprentiTrack – Comprehensive Seed Script
==========================================
Wipes all data and creates a rich demo dataset:
  - 5 cohorts (Sept 2024 → Jan 2026)
  - 25 apprentices (5 per cohort)
  - 6 coaches + 1 admin
  - 6 modules, 8 assessments
  - 13 KSBs
  - 70 evidence submissions with explicit dates (Oct 2024 → Mar 2026)
  - 120+ submission-KSB mappings
  - 45+ coach feedback entries
  - 22 intervention flags with spread dates
  - 20 module-KSB mappings

Run from server/:
    .venv\\Scripts\\python.exe seeds\\seed_full.py
"""

import sys, os, random
from datetime import datetime, timedelta, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal, engine
from models.models import (
    Base, User, Cohort, Apprentice, Module, Assessment, KSB,
    EvidenceSubmission, SubmissionKSB, CoachFeedback, InterventionFlag,
    CoachCohort, ModuleKSB, AuditLog,
)
from auth import hash_password

random.seed(42)

# ── Helper ──────────────────────────────────────────────
def rand_dt(start: date, end: date) -> datetime:
    """Return a random datetime between two dates."""
    delta = (end - start).days
    offset = random.randint(0, max(delta, 0))
    return datetime(start.year, start.month, start.day) + timedelta(
        days=offset, hours=random.randint(8, 22), minutes=random.randint(0, 59)
    )


# ── Setup ───────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Wipe everything in dependency order
print("Wiping existing data...")
for model in [
    AuditLog, CoachFeedback, SubmissionKSB, InterventionFlag,
    EvidenceSubmission, ModuleKSB, Assessment, CoachCohort, User, Apprentice,
    KSB, Module, Cohort,
]:
    db.query(model).delete()
db.commit()

# ════════════════════════════════════════════════════════
# 1. COHORTS
# ════════════════════════════════════════════════════════
cohorts_data = [
    ("Sept 2024 Cohort",  "Digital & Technology Solutions", date(2024, 9, 1),  date(2027, 9, 1)),
    ("Jan 2025 Cohort",   "Digital & Technology Solutions", date(2025, 1, 15), date(2028, 1, 15)),
    ("May 2025 Cohort",   "Digital & Technology Solutions", date(2025, 5, 1),  date(2028, 5, 1)),
    ("Sept 2025 Cohort",  "Digital & Technology Solutions", date(2025, 9, 1),  date(2028, 9, 1)),
    ("Jan 2026 Cohort",   "Digital & Technology Solutions", date(2026, 1, 15), date(2029, 1, 15)),
]

cohorts = []
for name, prog, sd, ed in cohorts_data:
    c = Cohort(name=name, programme=prog, start_date=sd, end_date=ed)
    db.add(c)
    db.flush()
    cohorts.append(c)
print(f"  {len(cohorts)} cohorts created")

# ════════════════════════════════════════════════════════
# 2. APPRENTICES  (25 — 5 per cohort)
# ════════════════════════════════════════════════════════
apprentice_names = [
    # Cohort 1 – Sept 2024
    ("Alex",    "Morgan",    "alex.morgan@example.com",    "Acme Corp"),
    ("Jordan",  "Smith",     "jordan.smith@example.com",   "Globex Ltd"),
    ("Taylor",  "Brown",     "taylor.brown@example.com",   "Initech"),
    ("Casey",   "Williams",  "casey.williams@example.com", "Wayne Enterprises"),
    ("Riley",   "Jones",     "riley.jones@example.com",    "Hooli"),
    # Cohort 2 – Jan 2025
    ("Sam",     "Davis",     "sam.davis@example.com",      "Stark Industries"),
    ("Morgan",  "Taylor",    "morgan.taylor@example.com",  "Oscorp"),
    ("Jamie",   "Anderson",  "jamie.anderson@example.com", "Umbrella Corp"),
    ("Avery",   "Thomas",    "avery.thomas@example.com",   "Cyberdyne"),
    ("Quinn",   "Jackson",   "quinn.jackson@example.com",  "Soylent Inc"),
    # Cohort 3 – May 2025
    ("Drew",    "White",     "drew.white@example.com",     "Pied Piper"),
    ("Blake",   "Harris",    "blake.harris@example.com",   "Dunder Mifflin"),
    ("Sage",    "Martin",    "sage.martin@example.com",    "Wonka Industries"),
    ("Reese",   "Garcia",    "reese.garcia@example.com",   "LexCorp"),
    ("Finley",  "Clark",     "finley.clark@example.com",   "Massive Dynamic"),
    # Cohort 4 – Sept 2025
    ("Rowan",   "Lewis",     "rowan.lewis@example.com",    "Aperture Science"),
    ("Emery",   "Robinson",  "emery.robinson@example.com", "Abstergo"),
    ("Hayden",  "Walker",    "hayden.walker@example.com",  "Tyrell Corp"),
    ("Dakota",  "Young",     "dakota.young@example.com",   "InGen"),
    ("Phoenix", "Hall",      "phoenix.hall@example.com",   "Buy n Large"),
    # Cohort 5 – Jan 2026
    ("Skyler",  "Allen",     "skyler.allen@example.com",   "Vault-Tec"),
    ("Harper",  "King",      "harper.king@example.com",    "Gekko & Co"),
    ("River",   "Wright",    "river.wright@example.com",   "Weyland-Yutani"),
    ("Ellis",   "Scott",     "ellis.scott@example.com",    "Bluth Company"),
    ("Lennox",  "Green",     "lennox.green@example.com",   "Sterling Cooper"),
]

apprentices = []
for i, (fn, ln, email, emp) in enumerate(apprentice_names):
    cohort_idx = i // 5  # 0-4
    a = Apprentice(
        first_name=fn, last_name=ln, email=email,
        cohort_id=cohorts[cohort_idx].id, employer=emp,
    )
    db.add(a)
    db.flush()
    apprentices.append(a)
print(f"  {len(apprentices)} apprentices created")

# ════════════════════════════════════════════════════════
# 3. MODULES & ASSESSMENTS
# ════════════════════════════════════════════════════════
modules_data = [
    ("IOT552U", "Business Organisation & Decision Making", 20),
    ("IOT553U", "Software Engineering Principles", 20),
    ("IOT554U", "Data Fundamentals", 20),
    ("IOT555U", "Cyber Security Essentials", 20),
    ("IOT556U", "Network Infrastructure", 20),
    ("IOT557U", "Project Management & Agile", 15),
]
modules = []
for code, title, credits in modules_data:
    m = Module(code=code, title=title, credits=credits)
    db.add(m)
    db.flush()
    modules.append(m)
print(f"  {len(modules)} modules created")

assessments_data = [
    (1, "Data Modelling Report",           "Design a relational data model for a business scenario.",    date(2025, 3, 15)),
    (1, "SQL Analytics Portfolio",         "Write analytical SQL queries on a sample dataset.",          date(2025, 4, 30)),
    (2, "Software Design Document",        "Produce a design document for a web application.",           date(2025, 5, 15)),
    (3, "Database Implementation Project", "Build and populate a relational database.",                  date(2025, 6, 1)),
    (4, "Security Risk Assessment",        "Analyse security risks for a given case study.",             date(2025, 6, 15)),
    (5, "Network Topology Design",         "Design a network topology for a medium enterprise.",         date(2025, 9, 1)),
    (6, "Agile Sprint Report",             "Document a sprint cycle including retrospective analysis.",  date(2025, 10, 15)),
    (3, "Data Visualisation Dashboard",    "Build an interactive dashboard from a dataset.",             date(2025, 11, 30)),
]
assessments = []
for mod_idx, title, desc, due in assessments_data:
    a = Assessment(
        module_id=modules[mod_idx - 1].id,
        title=title, description=desc, due_date=due,
    )
    db.add(a)
    db.flush()
    assessments.append(a)
print(f"  {len(assessments)} assessments created")

# ════════════════════════════════════════════════════════
# 4. KSBs
# ════════════════════════════════════════════════════════
ksbs_data = [
    ("K1", "Knowledge", "How organisations adapt and exploit digital technology solutions."),
    ("K2", "Knowledge", "The value of technology investments and how to quantify benefits."),
    ("K3", "Knowledge", "Contemporary computing architectures and infrastructure."),
    ("K4", "Knowledge", "Principles of data analysis and how to apply them."),
    ("K5", "Knowledge", "Legislation, policies and ethics relating to digital technology."),
    ("S1", "Skill",     "Analyse a business problem and identify the role of digital systems."),
    ("S2", "Skill",     "Design, implement and test a software solution."),
    ("S3", "Skill",     "Apply structured techniques to problem-solving."),
    ("S4", "Skill",     "Manage data effectively and ethically."),
    ("S5", "Skill",     "Apply information security principles."),
    ("B1", "Behaviour", "Work independently and collaboratively in a professional manner."),
    ("B2", "Behaviour", "Demonstrate continuous professional development."),
    ("B3", "Behaviour", "Act with integrity and respect in a workplace environment."),
]
ksbs = []
for code, ktype, desc in ksbs_data:
    k = KSB(code=code, type=ktype, description=desc)
    db.add(k)
    db.flush()
    ksbs.append(k)
print(f"  {len(ksbs)} KSBs created")

# ════════════════════════════════════════════════════════
# 5. MODULE-KSB MAPPINGS
# ════════════════════════════════════════════════════════
module_ksb_mappings = [
    # IOT552U → K1, K2, S1, S3, B1, B3
    (0, 0), (0, 1), (0, 5), (0, 7), (0, 10), (0, 12),
    # IOT553U → K3, S2, S3, B1, B2
    (1, 2), (1, 6), (1, 7), (1, 10), (1, 11),
    # IOT554U → K4, S1, S4, B2
    (2, 3), (2, 5), (2, 8), (2, 11),
    # IOT555U → K5, S4, S5, B3
    (3, 4), (3, 8), (3, 9), (3, 12),
    # IOT556U → K3, K5, S5, B1
    (4, 2), (4, 4), (4, 9), (4, 10),
    # IOT557U → K2, S1, S3, B1, B2
    (5, 1), (5, 5), (5, 7), (5, 10), (5, 11),
]
for mi, ki in module_ksb_mappings:
    db.add(ModuleKSB(module_id=modules[mi].id, ksb_id=ksbs[ki].id))
db.flush()
print(f"  {len(module_ksb_mappings)} module-KSB mappings created")

# ════════════════════════════════════════════════════════
# 6. USERS (admin + 6 coaches + 25 apprentice users)
# ════════════════════════════════════════════════════════
admin_user = User(
    email="admin@system.com",
    password_hash=hash_password("Admin123!"),
    role="admin", first_name="System", last_name="Admin",
    must_change_password=False,
)
db.add(admin_user)
db.flush()

coaches_info = [
    ("lead.coach@uni.ac.uk",  "Lead",   "Coach",   [0, 1, 2, 3, 4]),  # all cohorts
    ("dr.patel@uni.ac.uk",    "Dr.",    "Patel",   [0, 1]),
    ("ms.chen@uni.ac.uk",     "Ms.",    "Chen",    [0, 2]),
    ("mr.okafor@uni.ac.uk",   "Mr.",    "Okafor",  [1, 3]),
    ("dr.brooks@uni.ac.uk",   "Dr.",    "Brooks",  [2, 3, 4]),
    ("ms.harper@uni.ac.uk",   "Ms.",    "Harper",  [3, 4]),
]

coach_users = []
for email, fn, ln, cohort_idxs in coaches_info:
    u = User(
        email=email, password_hash=hash_password("Coach123!"),
        role="coach", first_name=fn, last_name=ln,
        must_change_password=False,
    )
    db.add(u)
    db.flush()
    for ci in cohort_idxs:
        db.add(CoachCohort(user_id=u.id, cohort_id=cohorts[ci].id))
    coach_users.append(u)
db.flush()
print(f"  1 admin + {len(coach_users)} coaches created")

for a in apprentices:
    u = User(
        email=a.email, password_hash=hash_password("Apprentice123!"),
        role="apprentice", first_name=a.first_name, last_name=a.last_name,
        apprentice_id=a.id, must_change_password=False,
    )
    db.add(u)
db.flush()
print(f"  {len(apprentices)} apprentice users created")

# ════════════════════════════════════════════════════════
# 7. EVIDENCE SUBMISSIONS (70 with explicit dates)
# ════════════════════════════════════════════════════════
#
# We create a realistic spread:
#  - Cohort 1 (Sept 2024): submissions Oct 2024 – Mar 2026 (mature)
#  - Cohort 2 (Jan 2025):  submissions Feb 2025 – Mar 2026
#  - Cohort 3 (May 2025):  submissions Jun 2025 – Mar 2026
#  - Cohort 4 (Sept 2025): submissions Oct 2025 – Mar 2026
#  - Cohort 5 (Jan 2026):  submissions Feb 2026 – Mar 2026 (newest)
#

statuses = ["draft", "submitted", "reviewed", "accepted"]
status_weights_mature = [0.05, 0.15, 0.30, 0.50]   # older cohorts have more accepted
status_weights_mid    = [0.10, 0.30, 0.35, 0.25]
status_weights_new    = [0.25, 0.45, 0.20, 0.10]

submission_titles = [
    "ER Diagram & Normalisation Report",
    "Sales Analytics SQL Queries",
    "React App Design Document",
    "Hospital Data Model Report",
    "Student Records Database Build",
    "Security Threat Analysis for SMEs",
    "Revenue Dashboard SQL Portfolio",
    "Network Design for Hybrid Office",
    "Agile Sprint Retrospective",
    "Data Visualisation Dashboard",
    "API Design & Testing Report",
    "Cloud Migration Strategy",
    "Penetration Testing Report",
    "ETL Pipeline Documentation",
    "User Journey Mapping Exercise",
    "Automated Test Suite Report",
    "Database Optimisation Analysis",
    "Risk Register & Mitigation Plan",
    "Requirements Elicitation Document",
    "CI/CD Pipeline Implementation",
]

work_projects = [
    "Customer Portal Redesign", "Inventory Management System",
    "HR Analytics Dashboard", "E-Commerce Platform",
    "IoT Sensor Network", "Data Warehouse Migration",
    "Mobile App MVP", "Security Audit Framework",
    None, None, None,  # some have no work project
]

coach_names = ["Dr. Patel", "Ms. Chen", "Mr. Okafor", "Dr. Brooks", "Ms. Harper", "Lead Coach"]

# Date ranges per cohort
cohort_date_ranges = [
    (date(2024, 10, 1), date(2026, 3, 15)),   # Cohort 1
    (date(2025, 2, 1),  date(2026, 3, 15)),   # Cohort 2
    (date(2025, 6, 1),  date(2026, 3, 15)),   # Cohort 3
    (date(2025, 10, 1), date(2026, 3, 15)),   # Cohort 4
    (date(2026, 2, 1),  date(2026, 3, 15)),   # Cohort 5
]

# How many submissions per apprentice by cohort (mature → newest)
subs_per_apprentice_ranges = [
    (4, 6),  # Cohort 1: 4-6 submissions each
    (3, 5),  # Cohort 2: 3-5
    (2, 4),  # Cohort 3: 2-4
    (2, 3),  # Cohort 4: 2-3
    (1, 2),  # Cohort 5: 1-2
]

weight_maps = [
    status_weights_mature, status_weights_mature,
    status_weights_mid, status_weights_mid,
    status_weights_new,
]

submissions = []
for cohort_idx in range(5):
    cohort_apprentices = apprentices[cohort_idx * 5 : (cohort_idx + 1) * 5]
    start_d, end_d = cohort_date_ranges[cohort_idx]
    lo, hi = subs_per_apprentice_ranges[cohort_idx]
    weights = weight_maps[cohort_idx]

    for appr in cohort_apprentices:
        n_subs = random.randint(lo, hi)
        for _ in range(n_subs):
            sub_dt = rand_dt(start_d, end_d)
            status = random.choices(statuses, weights=weights, k=1)[0]
            assessment = random.choice(assessments)
            title = random.choice(submission_titles)
            wp = random.choice(work_projects)

            s = EvidenceSubmission(
                apprentice_id=appr.id,
                assessment_id=assessment.id,
                module_id=assessment.module.id,
                title=title,
                description=f"Evidence submission for {title.lower()} as part of {assessment.module.title}.",
                file_url=f"/uploads/{appr.last_name.lower()}_{title.replace(' ', '_').lower()[:30]}.pdf",
                work_project=wp,
                submitted_at=sub_dt,
                status=status,
                created_at=sub_dt,
            )
            db.add(s)
            db.flush()
            submissions.append(s)

print(f"  {len(submissions)} evidence submissions created")

# ════════════════════════════════════════════════════════
# 8. SUBMISSION-KSB MAPPINGS
# ════════════════════════════════════════════════════════
# Each submission maps to 1-3 KSBs (based on the module's official KSB mappings + random extras)
sub_ksb_count = 0
for s in submissions:
    # Get module's official KSBs
    mod_ksb_ids = [
        mk.ksb_id for mk in db.query(ModuleKSB).filter(ModuleKSB.module_id == s.module_id).all()
    ]
    # If module has mapped KSBs, pick 1-3 from them; else pick random
    if mod_ksb_ids:
        n = min(random.randint(1, 3), len(mod_ksb_ids))
        chosen = random.sample(mod_ksb_ids, n)
    else:
        chosen = [random.choice(ksbs).id for _ in range(random.randint(1, 2))]

    notes_templates = [
        "Demonstrates understanding of this competency through practical application.",
        "Evidence clearly addresses this KSB requirement.",
        "Good coverage of this area with relevant examples.",
        "Shows developing competence – further evidence recommended.",
        "Solid practical demonstration aligned with workplace activities.",
        None,  # some have no notes
    ]
    for kid in chosen:
        # Avoid duplicates
        existing = db.query(SubmissionKSB).filter(
            SubmissionKSB.submission_id == s.id, SubmissionKSB.ksb_id == kid
        ).first()
        if not existing:
            db.add(SubmissionKSB(
                submission_id=s.id, ksb_id=kid,
                notes=random.choice(notes_templates),
            ))
            sub_ksb_count += 1
db.flush()
print(f"  {sub_ksb_count} submission-KSB mappings created")

# ════════════════════════════════════════════════════════
# 9. COACH FEEDBACK
# ════════════════════════════════════════════════════════
# Give feedback to ~65% of non-draft submissions
feedback_comments = [
    "Excellent work – clear structure and strong analysis.",
    "Good range of evidence – consider adding more workplace examples.",
    "Solid start – needs more detail on relationships between concepts.",
    "Outstanding work – very thorough and well-referenced.",
    "Well-structured assessment with clear mitigations identified.",
    "Good analytical depth – expand the commentary for higher marks.",
    "Consider linking this more explicitly to the KSB descriptors.",
    "Very good practical demonstration – keep building on this.",
    "Needs stronger critical analysis – currently too descriptive.",
    "Impressive use of real workplace data to evidence competence.",
    "Good progress – ensure you address all assessment criteria.",
    "Strong technical content but needs better reflective writing.",
    "Clear evidence of independent research and problem-solving.",
    "Well-articulated but the evaluation section could be stronger.",
    "This is a model example – well done.",
]

feedback_count = 0
for s in submissions:
    if s.status == "draft":
        continue
    if random.random() > 0.65:
        continue

    # Pick a coach that's assigned to this apprentice's cohort
    appr = db.query(Apprentice).get(s.apprentice_id)
    cohort_idx = next(i for i, c in enumerate(cohorts) if c.id == appr.cohort_id)

    # Find coaches assigned to that cohort
    possible_coaches = []
    for ci, (email, fn, ln, idxs) in enumerate(coaches_info):
        if cohort_idx in idxs:
            possible_coaches.append(f"{fn} {ln}")
    if not possible_coaches:
        possible_coaches = ["Lead Coach"]

    fb_dt = s.submitted_at + timedelta(days=random.randint(1, 14))
    fb = CoachFeedback(
        submission_id=s.id,
        coach_name=random.choice(possible_coaches),
        rating=random.choices([3, 4, 5, 2, 1], weights=[0.30, 0.35, 0.25, 0.08, 0.02], k=1)[0],
        comments=random.choice(feedback_comments),
        created_at=fb_dt,
    )
    db.add(fb)
    feedback_count += 1
db.flush()
print(f"  {feedback_count} coach feedback entries created")

# ════════════════════════════════════════════════════════
# 10. INTERVENTION FLAGS
# ════════════════════════════════════════════════════════
intervention_reasons = [
    ("Low KSB coverage",       "high",   "Fewer than 4 of 13 KSBs evidenced after significant time on programme."),
    ("Low KSB coverage",       "medium", "Fewer than 6 of 13 KSBs evidenced – monitor at next review."),
    ("Overdue submission",     "medium", "Assessment submission past due date and still in draft status."),
    ("Overdue submission",     "high",   "Multiple submissions overdue – urgent support needed."),
    ("Insufficient feedback",  "low",    "No coach feedback recorded on recent submissions."),
    ("KSB gap in Behaviours",  "low",    "No Behaviour KSBs evidenced yet – flag for review."),
    ("KSB gap in Skills",      "medium", "Fewer than 2 Skill KSBs evidenced – needs targeted activities."),
    ("Missed review meeting",  "medium", "Apprentice missed scheduled progress review meeting."),
    ("Employer concern",       "high",   "Employer flagged concerns about engagement and progress."),
    ("Low engagement",         "medium", "No submissions in last 3 months – check-in required."),
]

intervention_statuses = ["open", "in_progress", "resolved"]
intervention_status_weights = [0.45, 0.30, 0.25]

intervention_count = 0
# Spread interventions across apprentices (some have 0, some have 1-2)
for i, appr in enumerate(apprentices):
    # ~60% of apprentices get at least one intervention
    if random.random() > 0.60:
        continue

    n_flags = random.choices([1, 2, 3], weights=[0.55, 0.35, 0.10], k=1)[0]
    cohort_idx = i // 5
    start_d, end_d = cohort_date_ranges[cohort_idx]

    for _ in range(n_flags):
        reason, severity, detail = random.choice(intervention_reasons)
        flag_status = random.choices(intervention_statuses, weights=intervention_status_weights, k=1)[0]
        flag_dt = rand_dt(start_d, end_d)

        # Assigned coaches for this cohort
        possible_coaches = []
        for ci, (email, fn, ln, idxs) in enumerate(coaches_info):
            if cohort_idx in idxs:
                possible_coaches.append(f"{fn} {ln}")

        started = flag_dt + timedelta(days=random.randint(1, 7)) if flag_status in ("in_progress", "resolved") else None
        resolved = started + timedelta(days=random.randint(3, 30)) if flag_status == "resolved" and started else None

        flag = InterventionFlag(
            apprentice_id=appr.id,
            reason=reason,
            severity=severity,
            detail=detail,
            status=flag_status,
            raised_by=random.choice(possible_coaches) if possible_coaches else "Lead Coach",
            assigned_to=random.choice(possible_coaches) if possible_coaches else None,
            action_notes="Initial review and support plan discussed." if flag_status != "open" else None,
            resolution_notes="Issues addressed and progress improved." if flag_status == "resolved" else None,
            started_at=started,
            resolved_at=resolved,
            created_at=flag_dt,
        )
        db.add(flag)
        intervention_count += 1

db.flush()
print(f"  {intervention_count} intervention flags created")

# ════════════════════════════════════════════════════════
# COMMIT
# ════════════════════════════════════════════════════════
db.commit()
db.close()

print("\n✅ Full seed complete!")
print("   Login credentials:")
print("     Admin:      admin@system.com / Admin123!")
print("     Coaches:    *.coach@uni.ac.uk or dr.patel / ms.chen / mr.okafor / dr.brooks / ms.harper @uni.ac.uk / Coach123!")
print("     Apprentices: <first>.<last>@example.com / Apprentice123!")
print("   All accounts have must_change_password=False for easy demo access.")
